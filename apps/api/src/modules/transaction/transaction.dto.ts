// DTO chỉ kiểm kiểu; quy tắc nghiệp vụ và thông báo tiếng Việt ở TransactionService.
import { IsDefined, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class CreateTransactionDto {
  @IsDefined({ message: 'Thiếu loại giao dịch' })
  type!: unknown;

  @IsDefined({ message: 'Vui lòng nhập số tiền' })
  amount!: unknown;

  @IsDefined({ message: 'Vui lòng chọn danh mục' })
  category_id!: unknown;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString({ message: 'Ghi chú không hợp lệ' })
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  note?: string | null;

  @IsDefined({ message: 'Vui lòng chọn ngày' })
  transaction_date!: unknown;
}
