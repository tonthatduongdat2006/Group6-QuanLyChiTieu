#!/usr/bin/env node
// P0-TD-04: kiểm tra cấu trúc AI fixtures (không phụ thuộc thư viện).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/ai');
const MONEY = /^[1-9][0-9]{0,17}$/;
const errs = [];
const required = ['chat-multi-transactions', 'chat-ambiguous', 'chat-revise-pending', 'chat-invalid-json',
  'chat-timeout', 'chat-provider-overloaded', 'chat-prompt-injection', 'receipt-readable',
  'receipt-total-mismatch', 'receipt-unreadable-fields', 'receipt-injection-text'];
const names = new Set();
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const fx = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const where = `${f}:`;
  names.add(fx.name);
  if (`${fx.name}.json` !== f) errs.push(`${where} name khác tên file`);
  if (!['chat', 'receipt'].includes(fx.kind)) errs.push(`${where} kind sai`);
  if (!['ok', 'raw', 'timeout', 'error'].includes(fx.provider?.type)) errs.push(`${where} provider.type sai`);
  if (!fx.expect) errs.push(`${where} thiếu expect`);
  const out = fx.provider?.output;
  const shouldBeValid = fx.provider?.type === 'ok' && !fx.expect?.error;
  if (shouldBeValid && fx.kind === 'chat') {
    if (!['CREATE', 'REVISE', 'CLARIFY'].includes(out.intent)) errs.push(`${where} intent sai`);
    for (const t of out.transactions) if (!MONEY.test(t.amount)) errs.push(`${where} amount sai`);
  }
  if (shouldBeValid && fx.kind === 'receipt') {
    for (const it of out.items) if (it.amount !== null && !MONEY.test(it.amount)) errs.push(`${where} item amount sai`);
  }
  if (fx.kind === 'receipt' && !String(fx.input.image).startsWith('generated:'))
    errs.push(`${where} ảnh phải sinh bằng code, không dùng hóa đơn thật`);
}
for (const r of required) if (!names.has(r)) errs.push(`Thiếu fixture bắt buộc: ${r}`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`✓ ${names.size} AI fixtures hợp lệ`);
