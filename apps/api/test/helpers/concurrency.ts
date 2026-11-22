// Helpers for concurrency tests (P0-TD-02: "helper chạy N request song song";
// docs/test-strategy.md §3: "hook trong test để ép thứ tự thực thi khi kiểm
// đồng thời", used by IT-CONC-BAL, IT-IDEM, IT-IDEM-AI, IT-SCAN-IDEM).

export interface Gate {
  /** Resolves once `open()` has been called. */
  wait(): Promise<void>;
  open(): void;
  readonly isOpen: boolean;
}

export function createGate(): Gate {
  let release: () => void = () => undefined;
  let opened = false;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    wait: () => promise,
    open: () => {
      opened = true;
      release();
    },
    get isOpen() {
      return opened;
    },
  };
}

export interface ConcurrentResult<T> {
  settled: PromiseSettledResult<T>[];
  fulfilled: T[];
  rejected: unknown[];
}

/**
 * Start `count` tasks at the same moment (all are created before a shared
 * start gate opens) and wait for every one of them to settle.
 */
export async function runConcurrently<T>(
  count: number,
  task: (index: number) => Promise<T>,
): Promise<ConcurrentResult<T>> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`count must be a positive integer, got ${count}`);
  }
  const start = createGate();
  const running = Array.from({ length: count }, (_, index) =>
    start.wait().then(() => task(index)),
  );
  start.open();
  const settled = await Promise.allSettled(running);
  const fulfilled: T[] = [];
  const rejected: unknown[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      fulfilled.push(result.value);
    } else {
      rejected.push(result.reason);
    }
  }
  return { settled, fulfilled, rejected };
}

export interface Checkpoint {
  /** Called by the code under test: signals arrival, then waits for release. */
  arrive(): Promise<void>;
  /** Resolves when the code under test has reached the checkpoint. */
  reached(): Promise<void>;
  /** Lets the paused code continue. */
  release(): void;
}

/**
 * Pause one operation at a known point (for example while it holds the user
 * row lock) so the test can start a second operation and force an order.
 */
export function createCheckpoint(): Checkpoint {
  const arrived = createGate();
  const released = createGate();
  return {
    arrive: async () => {
      arrived.open();
      await released.wait();
    },
    reached: () => arrived.wait(),
    release: () => released.open(),
  };
}

/** Reject if `promise` does not settle within `milliseconds`. */
export async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  label = 'operation',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${milliseconds} ms`)),
      milliseconds,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
