// Fixed clock for tests (P0-TD-02; docs/test-strategy.md §1.5: "đồng hồ cố
// định theo Asia/Ho_Chi_Minh"). Services should receive a Clock instead of
// calling `new Date()` directly so tests can control "today".

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface Clock {
  now(): Date;
}

const VN_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: VN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date (YYYY-MM-DD) of `instant` in Asia/Ho_Chi_Minh. */
export function toVnDate(instant: Date): string {
  return VN_DATE_FORMAT.format(instant);
}

/** Parse a Vietnam local time 'YYYY-MM-DDTHH:mm:ss' (UTC+07:00, no DST). */
export function vnLocalTime(local: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(local)) {
    throw new Error(`Expected 'YYYY-MM-DDTHH:mm:ss', got '${local}'`);
  }
  return new Date(`${local}+07:00`);
}

export class FixedClock implements Clock {
  private current: number;

  constructor(start: Date | string) {
    const time = new Date(start).getTime();
    if (Number.isNaN(time)) {
      throw new Error(`Invalid clock start: ${String(start)}`);
    }
    this.current = time;
  }

  now(): Date {
    return new Date(this.current);
  }

  /** Today's calendar date in Asia/Ho_Chi_Minh. */
  todayVn(): string {
    return toVnDate(this.now());
  }

  advance(milliseconds: number): void {
    this.current += milliseconds;
  }

  set(instant: Date | string): void {
    const time = new Date(instant).getTime();
    if (Number.isNaN(time)) {
      throw new Error(`Invalid clock time: ${String(instant)}`);
    }
    this.current = time;
  }
}

/** Minimal part of the Jest object used by `installFakeSystemTime`. */
export interface FakeTimersHost {
  useFakeTimers(config?: {
    now?: number | Date;
    doNotFake?: ('nextTick' | 'setImmediate' | 'queueMicrotask')[];
  }): unknown;
}

/**
 * Freeze `Date.now()` / `new Date()` at `now` using Jest modern fake timers.
 * Microtask/IO primitives stay real so Supertest and database drivers work.
 */
export function installFakeSystemTime(
  host: FakeTimersHost,
  now: Date | string,
): void {
  host.useFakeTimers({
    now: new Date(now),
    doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
  });
}
