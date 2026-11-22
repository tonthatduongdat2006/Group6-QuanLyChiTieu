// FakeAIProvider (P0-TD-02 AC; docs/backend-plan.md §6 "FakeProvider/fixtures
// cho test"; docs/test-strategy.md §1.2 "Không test nào phụ thuộc live
// Claude API"). It never opens a network connection: every response comes
// from a queued fixture in packages/contracts/fixtures/ai.
//
// The AIProvider interface below is PROVISIONAL (backend-plan §6 names
// `parseTransactions(input)` / `analyzeReceipt(image)`); the production
// interface is defined in P3-BE-01. Provider output is returned as raw text
// because the backend must parse and validate it as untrusted data.

import { createHash } from 'node:crypto';
import { loadAiFixture } from './ai-fixtures';
import type { AiFixture, ProviderErrorKind } from './ai-fixtures';

export interface ChatProviderInput {
  message: string;
  /** Calendar date in Asia/Ho_Chi_Minh used to resolve "hôm nay/hôm qua". */
  referenceDate: string;
  pendingDrafts?: ReadonlyArray<Record<string, unknown>>;
}

export interface ProviderResponse {
  rawText: string;
  fixtureId: string;
}

export interface AIProvider {
  parseTransactions(input: ChatProviderInput): Promise<ProviderResponse>;
  analyzeReceipt(image: Buffer): Promise<ProviderResponse>;
}

export class FakeAIProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly httpStatus: number | undefined;
  readonly fixtureId: string;

  constructor(kind: ProviderErrorKind, fixtureId: string, httpStatus?: number) {
    super(`Fake AI provider error: ${kind} (fixture ${fixtureId})`);
    this.name = 'FakeAIProviderError';
    this.kind = kind;
    this.httpStatus = httpStatus;
    this.fixtureId = fixtureId;
  }
}

export interface FakeAIProviderCall {
  method: 'parseTransactions' | 'analyzeReceipt';
  fixtureId: string;
  /** Chat only. */
  message?: string;
  /** Scan only: SHA-256 hex and size of the image; the bytes are not kept. */
  imageSha256?: string;
  imageBytes?: number;
}

export class FakeAIProvider implements AIProvider {
  readonly calls: FakeAIProviderCall[] = [];
  private readonly queue: AiFixture[] = [];
  private beforeRespond: (() => Promise<void>) | undefined;

  /** Queue fixtures by id; each provider call consumes the next one. */
  enqueue(...fixtureIds: string[]): this {
    for (const id of fixtureIds) {
      this.queue.push(loadAiFixture(id));
    }
    return this;
  }

  /** Hook awaited before every response (e.g. a Checkpoint for ordering). */
  onBeforeRespond(hook: (() => Promise<void>) | undefined): this {
    this.beforeRespond = hook;
    return this;
  }

  get callCount(): number {
    return this.calls.length;
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  /** Fail the test if queued fixtures were never used. */
  assertAllConsumed(): void {
    if (this.queue.length > 0) {
      const ids = this.queue.map((fixture) => fixture.id).join(', ');
      throw new Error(`Unused AI fixtures: ${ids}`);
    }
  }

  async parseTransactions(input: ChatProviderInput): Promise<ProviderResponse> {
    const fixture = this.next('chat', 'parseTransactions');
    this.calls.push({
      method: 'parseTransactions',
      fixtureId: fixture.id,
      message: input.message,
    });
    return this.respond(fixture);
  }

  async analyzeReceipt(image: Buffer): Promise<ProviderResponse> {
    const fixture = this.next('scan', 'analyzeReceipt');
    this.calls.push({
      method: 'analyzeReceipt',
      fixtureId: fixture.id,
      imageSha256: createHash('sha256').update(image).digest('hex'),
      imageBytes: image.length,
    });
    return this.respond(fixture);
  }

  private next(kind: AiFixture['kind'], method: string): AiFixture {
    const fixture = this.queue.shift();
    if (!fixture) {
      throw new Error(`FakeAIProvider.${method}: no fixture queued`);
    }
    if (fixture.kind !== kind) {
      throw new Error(
        `FakeAIProvider.${method}: fixture '${fixture.id}' is '${fixture.kind}', expected '${kind}'`,
      );
    }
    return fixture;
  }

  private async respond(fixture: AiFixture): Promise<ProviderResponse> {
    if (this.beforeRespond) {
      await this.beforeRespond();
    }
    const provider = fixture.provider;
    switch (provider.result) {
      case 'output':
        return {
          rawText: JSON.stringify(provider.output),
          fixtureId: fixture.id,
        };
      case 'raw':
        return { rawText: provider.raw, fixtureId: fixture.id };
      case 'error':
        throw new FakeAIProviderError(
          provider.error.kind,
          fixture.id,
          provider.error.http_status,
        );
    }
  }
}
