// UT-VALID — quy tắc đăng ký thuần (FR-01). DTO validate kiểu; file này validate nghiệp vụ và chuẩn hóa.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
// Đủ chặt cho thực tế, không cố bao phủ RFC 5322
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string {
  return raw.normalize('NFC').trim().toLowerCase();
}

export interface RegisterInput {
  full_name: unknown;
  email: unknown;
  password: unknown;
  phone?: unknown;
  terms_accepted: unknown;
}

export interface FieldIssue {
  field: string;
  message: string;
}

export function validateRegister(input: RegisterInput): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const name = typeof input.full_name === 'string' ? input.full_name.trim() : '';
  if (!name) issues.push({ field: 'full_name', message: 'Vui lòng nhập họ tên' });
  else if (name.length > 120) issues.push({ field: 'full_name', message: 'Họ tên tối đa 120 ký tự' });

  const email = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email))
    issues.push({ field: 'email', message: 'Email không hợp lệ' });

  const pw = typeof input.password === 'string' ? input.password : '';
  if (pw.length < PASSWORD_MIN) issues.push({ field: 'password', message: 'Mật khẩu phải có ít nhất 8 ký tự' });
  else if (pw.length > PASSWORD_MAX) issues.push({ field: 'password', message: 'Mật khẩu tối đa 128 ký tự' });

  if (input.phone !== undefined && input.phone !== null) {
    if (typeof input.phone !== 'string' || !/^\+?[0-9 ]{8,20}$/.test(input.phone.trim()))
      issues.push({ field: 'phone', message: 'Số điện thoại không hợp lệ' });
  }
  if (input.terms_accepted !== true)
    issues.push({ field: 'terms_accepted', message: 'Bạn cần đồng ý với điều khoản sử dụng' });
  return issues;
}
