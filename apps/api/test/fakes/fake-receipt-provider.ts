// Bọc FakeAIProvider (fixtures) theo interface ReceiptAiProvider để test integration chọn fixture từng ca.
import { ProviderError, type ReceiptAiProvider } from '../../src/modules/ai-provider/ai-provider';
import { FakeAIProvider, ProviderHttpError, ProviderTimeoutError } from './fake-ai-provider';

export class FakeReceiptProviderForTest implements ReceiptAiProvider {
  readonly fake = new FakeAIProvider();
  /** Kích thước ảnh nhận được ở mỗi lần gọi — để kiểm provider không bị gọi lại khi replay. */
  readonly received: number[] = [];

  use(name: string): this {
    this.fake.use(name);
    return this;
  }

  async analyzeReceipt(image: Buffer, mimeType: string): Promise<string> {
    this.received.push(image.length);
    try {
      return await this.fake.complete('receipt', { mimeType, bytes: image.length });
    } catch (e) {
      if (e instanceof ProviderTimeoutError) throw new ProviderError('timeout');
      if (e instanceof ProviderHttpError) throw new ProviderError(e.status === 429 ? 'rate_limited' : 'unavailable');
      throw e;
    }
  }
}
