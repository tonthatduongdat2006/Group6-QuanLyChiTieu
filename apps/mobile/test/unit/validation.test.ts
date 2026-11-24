// UT-FE-VALID (AC-02)
import { validateRegisterForm, validateLoginForm, hasErrors, validateEmail } from '../../src/rules/validation';

const ok = { full_name: 'Nguyễn A', email: 'a@b.vn', password: 'Example123', confirm_password: 'Example123', phone: '', terms_accepted: true };

describe('UT-FE-VALID', () => {
  it('form hợp lệ', () => expect(hasErrors(validateRegisterForm(ok))).toBe(false));
  it('báo lỗi từng trường', () => {
    const e = validateRegisterForm({ ...ok, email: 'x', password: '123', terms_accepted: false });
    expect(e.email).toBe('Email không hợp lệ');
    expect(e.password).toBe('Mật khẩu phải có ít nhất 8 ký tự');
    expect(e.terms_accepted).toBe('Bạn cần đồng ý với điều khoản sử dụng');
    expect(e.confirm_password).toBeUndefined();
  });
  it('mật khẩu nhập lại không khớp', () =>
    expect(validateRegisterForm({ ...ok, confirm_password: 'Example124' }).confirm_password).toBe('Mật khẩu nhập lại không khớp'));
  it('email có khoảng trắng 2 đầu vẫn hợp lệ (server chuẩn hóa)', () => expect(validateEmail(' a@b.vn ')).toBeNull());
  it('login thiếu mật khẩu', () => expect(validateLoginForm({ email: 'a@b.vn', password: '' }).password).toBe('Vui lòng nhập mật khẩu'));
});
