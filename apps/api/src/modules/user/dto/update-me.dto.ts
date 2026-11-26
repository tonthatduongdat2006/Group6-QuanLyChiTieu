import { IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString({ message: 'Họ tên không hợp lệ' })
  @MinLength(1, { message: 'Vui lòng nhập họ tên' })
  @MaxLength(120, { message: 'Họ tên tối đa 120 ký tự' })
  full_name?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @Matches(/^\+?[0-9 ]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string | null;
}
