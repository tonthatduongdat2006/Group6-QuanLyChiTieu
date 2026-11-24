// P1-FE-04 + D-13a — quản lý phiên & "Ghi nhớ đăng nhập".
// - Access token: CHỈ trong bộ nhớ, không bao giờ lưu bền.
// - Ghi nhớ BẬT: refresh token lưu kho bảo mật OS (Keychain/Keystore) → mở lại app tự khôi phục phiên.
// - Ghi nhớ TẮT: refresh token chỉ trong bộ nhớ → đóng app là phải đăng nhập lại.
// - Đăng xuất / refresh bị từ chối: xóa cả hai.
import { ApiError } from './errors';

export const REFRESH_TOKEN_KEY = 'ase.refresh_token';

export interface SecureStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthTransport {
  refresh(refreshToken: string): Promise<Tokens>;
  logout(refreshToken: string): Promise<void>;
}

export type SessionStatus = 'unknown' | 'signedOut' | 'signedIn';
export type RefreshOutcome = 'ok' | 'invalid' | 'network';

export class SessionManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private rememberMe = false;
  private inflight: Promise<RefreshOutcome> | null = null;
  private listeners = new Set<(s: SessionStatus) => void>();
  private _status: SessionStatus = 'unknown';

  private readonly storage: SecureStorage;
  private readonly transport: AuthTransport;

  constructor(storage: SecureStorage, transport: AuthTransport) {
    this.storage = storage;
    this.transport = transport;
  }

  get status(): SessionStatus {
    return this._status;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  subscribe(fn: (s: SessionStatus) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private setStatus(s: SessionStatus) {
    if (this._status === s) return;
    this._status = s;
    this.listeners.forEach((l) => l(s));
  }

  async signIn(tokens: Tokens, rememberMe: boolean): Promise<void> {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.rememberMe = rememberMe;
    if (rememberMe) await this.storage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    else await this.storage.deleteItem(REFRESH_TOKEN_KEY);
    this.setStatus('signedIn');
  }

  /** Gọi khi mở app. true nếu khôi phục được phiên đã ghi nhớ. */
  async restore(): Promise<boolean> {
    const stored = await this.storage.getItem(REFRESH_TOKEN_KEY);
    if (!stored) {
      this.setStatus('signedOut');
      return false;
    }
    this.refreshToken = stored;
    this.rememberMe = true;
    const r = await this.refresh();
    if (r === 'ok') return true;
    if (r === 'network') {
      // offline: giữ refresh token trong kho để lần sau thử lại, nhưng chưa vào app
      this.refreshToken = null;
      this.setStatus('signedOut');
      return false;
    }
    return false; // 'invalid' đã tự dọn
  }

  /** Single-flight: nhiều request cùng 401 chỉ gọi /auth/refresh một lần. */
  refresh(): Promise<RefreshOutcome> {
    this.inflight ??= this.doRefresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async doRefresh(): Promise<RefreshOutcome> {
    const rt = this.refreshToken;
    if (!rt) {
      await this.clear();
      return 'invalid';
    }
    try {
      const t = await this.transport.refresh(rt);
      this.accessToken = t.access_token;
      this.refreshToken = t.refresh_token;
      if (this.rememberMe) await this.storage.setItem(REFRESH_TOKEN_KEY, t.refresh_token);
      this.setStatus('signedIn');
      return 'ok';
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'NETWORK_ERROR' || e.status >= 500)) return 'network';
      await this.clear();
      return 'invalid';
    }
  }

  async signOut(opts: { callServer?: boolean } = {}): Promise<void> {
    const rt = this.refreshToken;
    await this.clear();
    if (opts.callServer !== false && rt) {
      try {
        await this.transport.logout(rt);
      } catch {
        // best-effort: phía client đã xóa phiên; server tự hết hạn
      }
    }
  }

  private async clear(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.rememberMe = false;
    await this.storage.deleteItem(REFRESH_TOKEN_KEY);
    this.setStatus('signedOut');
  }
}
