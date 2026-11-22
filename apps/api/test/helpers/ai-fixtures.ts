// Loader for the AI fixture library in packages/contracts/fixtures/ai
// (P0-TD-04). Fixtures are validated by validate_fixtures.py; this loader only
// reads them for FakeAIProvider and tests.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export type AiFixtureKind = 'chat' | 'scan';
export type AiFixtureGroup = 'chat' | 'scan' | 'error' | 'adversarial';
export type ProviderErrorKind = 'timeout' | 'rate_limited' | 'server_error';

export interface SyntheticImageSpec {
  synthetic: true;
  seed: string;
  width: number;
  height: number;
  blur?: boolean;
  lines: string[];
}

export type AiFixtureProvider =
  | { result: 'output'; output: Record<string, unknown>; malformed?: boolean }
  | { result: 'raw'; raw: string }
  | {
      result: 'error';
      error: { kind: ProviderErrorKind; http_status?: number };
    };

export interface AiFixture {
  id: string;
  kind: AiFixtureKind;
  group: AiFixtureGroup;
  description: string;
  refs: string[];
  clock: { now: string; timezone: 'Asia/Ho_Chi_Minh' };
  input: {
    message?: string;
    pending_drafts?: Array<Record<string, unknown>>;
    image?: SyntheticImageSpec;
  };
  provider: AiFixtureProvider;
  expected: {
    outcome_any_of: string[];
    error_code?: 'AI_PROVIDER_ERROR' | 'RATE_LIMITED';
    persists_transaction: false;
    creates_draft?: boolean;
    revises_draft_ref?: string;
    drafts?: Array<Record<string, unknown>>;
    forbidden_draft_statuses?: string[];
    confirmable?: boolean;
    notes?: string;
  };
}

const GROUPS: AiFixtureGroup[] = ['chat', 'scan', 'error', 'adversarial'];

/** Walk up from `start` to the directory that holds pnpm-workspace.yaml. */
export function findRepoRoot(start: string = process.cwd()): string {
  let current = resolve(start);
  for (;;) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(`pnpm-workspace.yaml not found above ${start}`);
    }
    current = parent;
  }
}

export function aiFixtureDir(root: string = findRepoRoot()): string {
  return join(root, 'packages', 'contracts', 'fixtures', 'ai');
}

let cache: Map<string, AiFixture> | undefined;

export function loadAllAiFixtures(): Map<string, AiFixture> {
  if (cache) {
    return cache;
  }
  const dir = aiFixtureDir();
  const fixtures = new Map<string, AiFixture>();
  for (const group of GROUPS) {
    const groupDir = join(dir, group);
    if (!existsSync(groupDir)) {
      continue;
    }
    for (const file of readdirSync(groupDir).sort()) {
      if (!file.endsWith('.json')) {
        continue;
      }
      const fixture = JSON.parse(
        readFileSync(join(groupDir, file), 'utf8'),
      ) as AiFixture;
      if (fixtures.has(fixture.id)) {
        throw new Error(`Duplicate AI fixture id '${fixture.id}'`);
      }
      fixtures.set(fixture.id, fixture);
    }
  }
  cache = fixtures;
  return fixtures;
}

export function loadAiFixture(id: string): AiFixture {
  const fixture = loadAllAiFixtures().get(id);
  if (!fixture) {
    throw new Error(`Unknown AI fixture '${id}'`);
  }
  return fixture;
}
