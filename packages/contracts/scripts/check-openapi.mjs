#!/usr/bin/env node
// M0-02 (Revision 4.0-MVP): kiểm openapi.yaml theo API Documentation v1.1 §§2–10 + delta CR-02, và danh sách MVP (CR-01 E-06).
// Không cần thư viện: đọc theo dòng (spec giữ quy ước thụt lề 2 khoảng).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const specPath = process.argv[2] ?? resolve(here, '../openapi.yaml');
const apiDocPath = process.argv[3] ?? resolve(here, '../../../docs/sources/05_API_Documentation_v1.1.md');

const norm = (p) => p.replace(/\{[^}]+\}/g, '{}');

// Delta đã duyệt so với API v1.1 (CR-02 §3.2). Không thêm vào đây nếu chưa có change request.
const CR_ADDED = ['PUT /users/me/opening-balance'];

// 19 endpoint MVP — planning-mvp.md §4.1. Bearer: tất cả trừ 4 endpoint auth đầu.
const MVP_CORE = [
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/refresh',
  'POST /auth/logout',
  'GET /users/me',
  'PATCH /users/me',
  'PUT /users/me/opening-balance',
  'GET /dashboard',
  'GET /categories',
  'POST /transactions',
  'GET /transactions',
  'GET /transactions/{}',
  'POST /ai/receipts/scan',
  'GET /ai/drafts/{}',
  'PATCH /ai/drafts/{}',
  'POST /ai/drafts/{}/items',
  'PATCH /ai/draft-items/{}',
  'DELETE /ai/draft-items/{}',
  'POST /ai/drafts/{}/confirm',
];
const PUBLIC = new Set(['POST /auth/register', 'POST /auth/login', 'POST /auth/refresh', 'POST /auth/logout']);

function fromSpec(text) {
  const ops = [];
  let inPaths = false;
  let path = null;
  let cur = null;
  for (const line of text.split('\n')) {
    if (/^paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (inPaths && /^\S/.test(line)) inPaths = false;
    if (!inPaths) continue;
    const p = line.match(/^  (\/\S+):\s*$/);
    if (p) { path = p[1]; cur = null; continue; }
    const m = line.match(/^    (get|post|patch|put|delete):\s*$/);
    if (m && path) { cur = { op: `${m[1].toUpperCase()} ${path}`, mvp: null, publicOp: false }; ops.push(cur); continue; }
    if (!cur) continue;
    const x = line.match(/^      x-mvp: (\S+)\s*$/);
    if (x) cur.mvp = x[1];
    if (/^      security: \[\]\s*$/.test(line)) cur.publicOp = true;
  }
  return ops;
}

function fromApiDoc(text) {
  const ops = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^### (GET|POST|PATCH|PUT|DELETE) `([^`?]+)/);
    if (m) ops.push(`${m[1]} ${m[2]}`);
  }
  return ops;
}

const spec = fromSpec(readFileSync(specPath, 'utf8'));
const specOps = spec.map((o) => o.op);
const docOps = fromApiDoc(readFileSync(apiDocPath, 'utf8'));
const errors = [];

const dup = specOps.filter((o, i) => specOps.indexOf(o) !== i);
if (dup.length) errors.push(`Trùng operation: ${dup.join(', ')}`);
if (docOps.length !== 44) errors.push(`API doc có ${docOps.length} endpoint (mong đợi 44)`);
const expectedTotal = docOps.length + CR_ADDED.length;
if (specOps.length !== expectedTotal) errors.push(`OpenAPI có ${specOps.length} endpoint, cần ${expectedTotal} (API v1.1 + CR-02)`);

const specSet = new Set(specOps.map(norm));
const allowed = new Set([...docOps, ...CR_ADDED].map(norm));
for (const o of allowed) if (!specSet.has(o)) errors.push(`Thiếu trong OpenAPI: ${o}`);
for (const o of specSet) if (!allowed.has(o)) errors.push(`Thừa (ngoài API v1.1 + CR): ${o}`);

const jars = specOps.filter((o) => o.includes('/saving-jars'));
if (jars.length !== 6) errors.push(`SavingJar có ${jars.length} endpoint, cần 6`);
const forbidden = [/^(PATCH|DELETE) \/saving-jars\/\{jarId\}$/, /^(PATCH|DELETE) \/categories/, /oauth|google|facebook/i, /daily-income/];
for (const o of specOps) for (const f of forbidden) if (f.test(o)) errors.push(`Endpoint ngoài phạm vi v1: ${o}`);

// x-mvp
const coreSet = new Set(MVP_CORE);
for (const o of spec) {
  const n = norm(o.op);
  if (o.mvp !== 'core' && o.mvp !== 'deferred') errors.push(`${o.op}: thiếu/không hợp lệ x-mvp (${o.mvp})`);
  else if (coreSet.has(n) && o.mvp !== 'core') errors.push(`${o.op}: phải là x-mvp: core`);
  else if (!coreSet.has(n) && o.mvp !== 'deferred') errors.push(`${o.op}: phải là x-mvp: deferred`);
  if (o.publicOp !== PUBLIC.has(n)) errors.push(`${o.op}: security không khớp (public=${o.publicOp})`);
}
const core = spec.filter((o) => o.mvp === 'core');
const deferred = spec.filter((o) => o.mvp === 'deferred');
const bearerCore = core.filter((o) => !o.publicOp);
if (core.length !== MVP_CORE.length) errors.push(`x-mvp core = ${core.length}, cần ${MVP_CORE.length}`);
if (deferred.length !== expectedTotal - MVP_CORE.length) errors.push(`x-mvp deferred = ${deferred.length}, cần ${expectedTotal - MVP_CORE.length}`);
if (bearerCore.length !== 15) errors.push(`Endpoint MVP cần Bearer = ${bearerCore.length}, cần 15`);

if (errors.length) {
  console.error('✗ Contract check FAILED');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `✓ OpenAPI: ${specOps.length} endpoint (API v1.1 ${docOps.length} + CR-02 ${CR_ADDED.length}); ` +
    `MVP core ${core.length} (Bearer ${bearerCore.length}), deferred ${deferred.length}; SavingJar = ${jars.length}`,
);
