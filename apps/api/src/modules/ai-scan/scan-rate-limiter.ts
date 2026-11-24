// QD (D-28): tối đa N lần quét/giờ/người dùng. Đếm trong bộ nhớ tiến trình (một instance);
// trên serverless nhiều instance, giới hạn là xấp xỉ — kèm hạn mức chi tiêu ở Claude Console (R-M4).
export class ScanRateLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(
    private readonly limit: number,
    private readonly windowMs = 3_600_000,
  ) {}

  /** Ghi nhận 1 lần quét; false nếu đã vượt giới hạn trong cửa sổ. */
  tryAcquire(userId: string, now: number): boolean {
    const recent = (this.hits.get(userId) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(userId, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(userId, recent);
    return true;
  }

  release(userId: string): void {
    this.hits.get(userId)?.pop();
  }
}
