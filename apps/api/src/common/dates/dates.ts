// P1-BE-03 — Ngày nghiệp vụ theo Asia/Ho_Chi_Minh; DB lưu DATE (không giờ) và TIMESTAMPTZ (UTC).
// D-09: KHÔNG chặn ngày tương lai (OQ-10 chưa chốt) — chỉ kiểm định dạng + ngày có thật.

export const BUSINESS_TZ = 'Asia/Ho_Chi_Minh';
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Đồng hồ tiêm vào được để test cố định thời gian. */
export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 'YYYY-MM-DD' hợp lệ → Date UTC 00:00 (đúng cách Prisma map cột DATE). Sai → null. */
export function parseDateOnly(input: unknown): Date | null {
  if (typeof input !== 'string') return null;
  const m = DATE_RE.exec(input);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > 9999 || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

/** Date (UTC 00:00 của cột DATE) → 'YYYY-MM-DD'. */
export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM' → khoảng [monthStart, nextMonthStart). Sai → null. */
export function parseMonth(input: unknown): { monthStart: Date; nextMonthStart: Date; label: string } | null {
  if (typeof input !== 'string') return null;
  const m = MONTH_RE.exec(input);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return {
    monthStart: new Date(Date.UTC(y, mo - 1, 1)),
    nextMonthStart: new Date(Date.UTC(y, mo, 1)),
    label: input,
  };
}

/** Ngày hôm nay theo giờ Việt Nam, dạng 'YYYY-MM-DD'. */
export function todayInBusinessTz(clock: Clock = systemClock): string {
  // en-CA cho định dạng YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(clock.now());
}

/** Tháng hiện tại theo giờ Việt Nam, dạng 'YYYY-MM'. */
export function currentMonthInBusinessTz(clock: Clock = systemClock): string {
  return todayInBusinessTz(clock).slice(0, 7);
}

/** Là ngày đầu tháng? (budgets.month_start) */
export function isFirstDayOfMonth(d: Date): boolean {
  return d.getUTCDate() === 1;
}

/** Cộng n ngày vào Date UTC 00:00. */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}
