import type { Clock } from '../../src/common/dates/dates';

/** Đồng hồ cố định, chỉnh được trong test. Mặc định 2026-11-24 09:00 giờ VN. */
export class FixedClock implements Clock {
  private t: number;
  constructor(iso = '2026-11-24T02:00:00Z') {
    this.t = new Date(iso).getTime();
  }
  now(): Date {
    return new Date(this.t);
  }
  set(iso: string): void {
    this.t = new Date(iso).getTime();
  }
  advance(seconds: number): void {
    this.t += seconds * 1000;
  }
}
