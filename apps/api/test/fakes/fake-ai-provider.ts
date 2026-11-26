// FakeAIProvider (P0-TD-02/04) — đọc packages/contracts/fixtures/ai/*.json, không gọi mạng.
// Interface thật (AIProvider) được định nghĩa ở P3-BE-01; đây là bản nền để test Phase 3 dùng ngay.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface AiFixture {
  name: string;
  kind: 'chat' | 'receipt';
  provider: { type: 'ok'; output: unknown } | { type: 'raw'; text: string } | { type: 'timeout' } | { type: 'error'; status: number };
  expect: Record<string, unknown>;
}

const FIXTURE_DIR = resolve(__dirname, '../../../../packages/contracts/fixtures/ai');

export function loadFixture(name: string): AiFixture {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), 'utf8')) as AiFixture;
}

export function listFixtures(): string[] {
  return readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
}

export class ProviderTimeoutError extends Error {}
export class ProviderHttpError extends Error {
  constructor(readonly status: number) {
    super(`provider status ${status}`);
  }
}

export class FakeAIProvider {
  private next: AiFixture | null = null;
  readonly calls: { kind: string; input: unknown }[] = [];

  use(name: string): this {
    this.next = loadFixture(name);
    return this;
  }

  /** Trả "text thô" như model trả về; tầng adapter (P3-BE-01) chịu trách nhiệm parse + validate schema. */
  async complete(kind: 'chat' | 'receipt', input: unknown): Promise<string> {
    this.calls.push({ kind, input });
    const fx = this.next;
    if (!fx) throw new Error('FakeAIProvider: chưa chọn fixture (gọi .use(name))');
    switch (fx.provider.type) {
      case 'ok':
        return JSON.stringify(fx.provider.output);
      case 'raw':
        return fx.provider.text;
      case 'timeout':
        throw new ProviderTimeoutError('timeout');
      case 'error':
        throw new ProviderHttpError(fx.provider.status);
    }
  }
}
