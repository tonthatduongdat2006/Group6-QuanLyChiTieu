// jest-expo setup: mock module native, cố định giờ (P0-TD-03).
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 0,
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
    __store: store,
  };
});
jest.mock('expo-crypto', () => {
  let n = 0;
  return { randomUUID: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}` };
});
jest.mock('expo-router', () => {
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  return { router, useRouter: () => router, useLocalSearchParams: jest.fn(() => ({})) };
});

// "Hôm nay" cố định: 2026-11-24 09:00 giờ VN
jest.useFakeTimers({ now: new Date('2026-11-24T02:00:00Z'), advanceTimers: true });
