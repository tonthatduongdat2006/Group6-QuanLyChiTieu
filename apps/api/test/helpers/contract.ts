// P1-SH-02 — kiểm phản hồi THẬT của backend khớp OpenAPI (IT-CONTRACT). CI fail khi lệch.
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

type Json = Record<string, any>;
const SPEC_PATH = resolve(__dirname, '../../../../packages/contracts/openapi.yaml');
const spec: Json = parse(readFileSync(SPEC_PATH, 'utf8'));
const PREFIX = '/api/v1';

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addFormat('binary', true);
// Đăng ký components để $ref '#/components/...' resolve được
const rewrite = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(rewrite);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, k === '$ref' && typeof v === 'string' ? `spec${v}` : rewrite(v)]),
    );
  }
  return node;
};
ajv.addSchema({ $id: 'spec', components: rewrite(spec.components) });

function findOperation(method: string, actualPath: string): Json {
  const p = actualPath.replace(PREFIX, '').split('?')[0]!;
  for (const [template, item] of Object.entries<Json>(spec.paths)) {
    const re = new RegExp(`^${template.replace(/\{[^}]+\}/g, '[^/]+')}$`);
    if (re.test(p) && item[method.toLowerCase()]) return item[method.toLowerCase()];
  }
  throw new Error(`Không có trong OpenAPI: ${method} ${p}`);
}

export function expectMatchesSpec(method: string, path: string, res: { status: number; body: unknown }): void {
  const op = findOperation(method, path);
  let response: Json | undefined = op.responses[String(res.status)];
  if (!response) throw new Error(`OpenAPI không khai báo status ${res.status} cho ${method} ${path}`);
  if (response.$ref) response = spec.components.responses[response.$ref.split('/').pop()!];
  const schema = response?.content?.['application/json']?.schema;
  if (!schema) {
    if (res.status === 204) return;
    throw new Error(`OpenAPI thiếu schema cho ${method} ${path} ${res.status}`);
  }
  const validate = ajv.compile(rewrite(schema) as object);
  if (!validate(res.body)) {
    throw new Error(`${method} ${path} ${res.status} lệch OpenAPI:\n${ajv.errorsText(validate.errors, { separator: '\n' })}`);
  }
}
