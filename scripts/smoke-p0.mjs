#!/usr/bin/env node
// P0-TD-01 smoke script (device-free checks only).
//
// Planning: docs/task-breakdown.md P0-TD-01 (Tests column: "Smoke script";
// AC: "lint/typecheck xanh", version lock per docs/stack-lock.md, compile-level
// NestJS check). See docs/definition-of-done.md §1 (DoD-T 3) and §2 (Test/DevOps).
//
// Steps:
//   S1  Node version equals docs/stack-lock.md §1 exactly
//   S2  pnpm version equals docs/stack-lock.md §1, package.json packageManager
//       and `pnpm --version`
//   S3  node_modules present (precondition; this script never installs anything)
//   S4  pnpm typecheck
//   S5  pnpm lint            (API only: pnpm --filter api lint:check)
//   S6  pnpm --filter api build
//
// Out of scope on purpose: dependency installation, database / Prisma CLI
// (it auto-loads .env), unit tests, mobile export, Android device, CI guard.
// This script does not read .env files and does not print environment variables.
//
// Exit codes: 0 = PASS (every step passed), 1 = FAIL (at least one step failed),
//             2 = INCOMPLETE (no failure, but at least one required step skipped).

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IS_WINDOWS = process.platform === 'win32';
const WORKSPACE_PACKAGES = ['apps/api', 'apps/mobile', 'packages/contracts'];

const results = [];
const record = (id, title, status, detail) => {
  results.push({ id, title, status, detail });
  console.log(`[${status}] ${id} ${title}${detail ? ` — ${detail}` : ''}`);
};

const readText = (relativePath) =>
  readFileSync(join(ROOT, relativePath), 'utf8').replace(/^﻿/, '');

// Reads the "Version" cell of a row in docs/stack-lock.md "## 1. Environment".
const stackLockVersion = (component) => {
  const text = readText('docs/stack-lock.md');
  const start = text.indexOf('## 1. Environment');
  if (start === -1) return null;
  const next = text.indexOf('\n## ', start + 1);
  const section = text.slice(start, next === -1 ? undefined : next);
  const escaped = component.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = section.match(
    new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*([^|]+?)\\s*\\|`, 'm'),
  );
  return match ? match[1] : null;
};

const run = (args, { capture = false } = {}) =>
  spawnSync('pnpm', args, {
    cwd: ROOT,
    shell: IS_WINDOWS, // pnpm is pnpm.cmd on Windows; arguments are fixed strings
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });

const runStep = (id, title, args, skipReason) => {
  if (skipReason) {
    record(id, title, 'SKIP', skipReason);
    return;
  }
  console.log(`\n--- ${id}: pnpm ${args.join(' ')}`);
  const result = run(args);
  if (result.error) {
    record(id, title, 'FAIL', `could not start pnpm: ${result.error.message}`);
  } else if (result.status === 0) {
    record(id, title, 'PASS', 'exit code 0');
  } else {
    record(id, title, 'FAIL', `exit code ${result.status ?? `signal ${result.signal}`}`);
  }
};

console.log('P0-TD-01 smoke (device-free)');
console.log(`Repository: ${ROOT}\n`);

// S1 — Node version
{
  const expected = stackLockVersion('Node.js');
  const actual = process.versions.node;
  if (!expected) {
    record('S1', 'Node version', 'FAIL', 'Node.js row not found in docs/stack-lock.md §1');
  } else {
    record(
      'S1',
      'Node version',
      actual === expected ? 'PASS' : 'FAIL',
      `expected ${expected} (stack-lock), actual ${actual}`,
    );
  }
}

// S2 — pnpm version
{
  const expected = stackLockVersion('pnpm');
  let declared = null;
  try {
    const pm = JSON.parse(readText('package.json')).packageManager ?? '';
    declared = pm.startsWith('pnpm@') ? pm.slice('pnpm@'.length) : null;
  } catch {
    declared = null;
  }
  const result = run(['--version'], { capture: true });
  const actual = result.status === 0 ? result.stdout.trim() : null;
  const detail = `stack-lock ${expected ?? 'not found'}, packageManager ${
    declared ?? 'not found'
  }, pnpm --version ${actual ?? 'unavailable'}`;
  const ok = expected && declared && actual && expected === declared && declared === actual;
  record('S2', 'pnpm version', ok ? 'PASS' : 'FAIL', detail);
}

// S3 — dependencies present (never installs)
let depsReady = false;
{
  const missing = ['.', ...WORKSPACE_PACKAGES].filter(
    (dir) => !existsSync(join(ROOT, dir, 'node_modules')),
  );
  depsReady = missing.length === 0;
  record(
    'S3',
    'node_modules present',
    depsReady ? 'PASS' : 'FAIL',
    depsReady ? 'root and 3 workspace packages' : `missing in: ${missing.join(', ')}`,
  );
}

const noDeps = depsReady ? null : 'dependencies not installed (S3 failed)';

// S4 — typecheck
runStep('S4', 'pnpm typecheck', ['typecheck'], noDeps);

// S5 — lint (API)
{
  let hasLint = false;
  try {
    hasLint = Boolean(JSON.parse(readText('package.json')).scripts?.lint);
  } catch {
    hasLint = false;
  }
  runStep(
    'S5',
    'pnpm lint (API)',
    ['lint'],
    noDeps ?? (hasLint ? null : 'root "lint" script not defined in package.json'),
  );
}

// S6 — NestJS build (compile-level compatibility)
runStep('S6', 'pnpm --filter api build', ['--filter', 'api', 'build'], noDeps);

// Summary
const failed = results.filter((r) => r.status === 'FAIL');
const skipped = results.filter((r) => r.status === 'SKIP');
const overall = failed.length ? 'FAIL' : skipped.length ? 'INCOMPLETE' : 'PASS';

console.log('\n======================================================================');
console.log('SUMMARY');
for (const r of results) console.log(`  ${r.status.padEnd(4)}  ${r.id}  ${r.title}`);
console.log(
  `  Result: ${overall} (${results.length - failed.length - skipped.length} passed, ` +
    `${failed.length} failed, ${skipped.length} skipped)`,
);
console.log('  Not covered: dependency install, database/Prisma, Android device,');
console.log('  Expo/React Native runtime, E2E, CI version guard.');
console.log('======================================================================');

process.exit(overall === 'PASS' ? 0 : overall === 'FAIL' ? 1 : 2);
