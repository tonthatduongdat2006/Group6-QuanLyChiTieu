// DTO chỉ kiểm KIỂU dữ liệu; quy tắc nghiệp vụ + thông báo tiếng Việt nằm ở auth-rules.ts.
import { IsBoolean, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Vui lòng nhập họ tên' })
  full_name!: string;

  @IsString({ message: 'Email không hợp lệ' })
  email!: string;

  @IsString({ message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(128, { message: 'Mật khẩu tối đa 128 ký tự' })
  password!: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString({ message: 'Số điện thoại không hợp lệ' })
  phone?: string | null;

  @IsBoolean({ message: 'Bạn cần đồng ý với điều khoản sử dụng' })
  terms_accepted!: boolean;
}

export class LoginDto {
  @IsString({ message: 'Vui lòng nhập email' })
  @MaxLength(254)
  email!: string;

  @IsString({ message: 'Vui lòng nhập mật khẩu' })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsBoolean()
  remember_me?: boolean;
}

export class RefreshDto {
  @IsString({ message: 'Thiếu refresh_token' })
  @MaxLength(256)
  refresh_token!: string;
}
