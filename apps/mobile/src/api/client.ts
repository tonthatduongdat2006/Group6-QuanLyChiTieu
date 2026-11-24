// Ghép các phần thuần (http.ts, session.ts) với môi trường thật (fetch, SecureStore). Singleton cho cả app.
import { randomUUID } from 'expo-crypto';
import type { Schemas } from '@ase/contracts';
import { API_BASE_URL } from './config';
import { createHttpClient, sendRaw } from './http';
import { IntentKey } from './idempotency';
import { secureStorage } from './secureStorage';
import { SessionManager, type Tokens } from './session';

type TokenData = Schemas['TokenEnvelope']['data'];

const fetchFn = (input: string, init: RequestInit) => fetch(input, init);

export const session = new SessionManager(secureStorage, {
  refresh: async (refresh_token) =>
    (await sendRaw<TokenData>(fetchFn, API_BASE_URL, 'POST', '/auth/refresh', { body: { refresh_token } })).data as Tokens,
  logout: async (refresh_token) => {
    await sendRaw(fetchFn, API_BASE_URL, 'POST', '/auth/logout', { body: { refresh_token } });
  },
});

export const http = createHttpClient({ baseUrl: API_BASE_URL, fetch: fetchFn, session });

/** Tạo IntentKey cho 1 form/ý định (frontend-plan §5). */
export const newIntentKey = () => new IntentKey(randomUUID);
