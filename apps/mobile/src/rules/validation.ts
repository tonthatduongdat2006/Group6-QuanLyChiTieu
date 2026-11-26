// P1-FE-05 — validate form Auth. Thông báo khớp với backend (auth-rules.ts) để người dùng thấy giống nhau.
export const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function validateEmail(v: string): string | null {
  const e = v.trim();
  if (!e) return 'Vui lòng nhập email';
  return EMAIL_RE.test(e) && e.length <= 254 ? null : 'Email không hợp lệ';
}

export function validatePassword(v: string): string | null {
  if (!v) return 'Vui lòng nhập mật khẩu';
  if (v.length < PASSWORD_MIN) return 'Mật khẩu phải có ít nhất 8 ký tự';
  if (v.length > 128) return 'Mật khẩu tối đa 128 ký tự';
  return null;
}

export function validateTerms(v: boolean): string | null {
  return v ? null : 'Bạn cần đồng ý với điều khoản sử dụng';
}

export function validateFullName(v: string): string | null {
  const n = v.trim();
  if (!n) return 'Vui lòng nhập họ tên';
  return n.length > 120 ? 'Họ tên tối đa 120 ký tự' : null;
}

export function validatePhone(v: string): string | null {
  if (!v.trim()) return null; // không bắt buộc
  return /^\+?[0-9 ]{8,20}$/.test(v.trim()) ? null : 'Số điện thoại không hợp lệ';
}

export interface RegisterForm {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  terms_accepted: boolean;
}

export function validateRegisterForm(f: RegisterForm): FieldErrors<keyof RegisterForm> {
  const errors: FieldErrors<keyof RegisterForm> = {};
  const put = (k: keyof RegisterForm, m: string | null) => {
    if (m) errors[k] = m;
  };
  put('full_name', validateFullName(f.full_name));
  put('email', validateEmail(f.email));
  put('password', validatePassword(f.password));
  if (!errors.password && f.confirm_password !== f.password) errors.confirm_password = 'Mật khẩu nhập lại không khớp';
  put('phone', validatePhone(f.phone));
  put('terms_accepted', validateTerms(f.terms_accepted));
  return errors;
}

export interface LoginForm {
  email: string;
  password: string;
}

export function validateLoginForm(f: LoginForm): FieldErrors<keyof LoginForm> {
  const errors: FieldErrors<keyof LoginForm> = {};
  const e = validateEmail(f.email);
  if (e) errors.email = e;
  if (!f.password) errors.password = 'Vui lòng nhập mật khẩu';
  return errors;
}

export function hasErrors(e: object): boolean {
  return Object.values(e).some(Boolean);
}
