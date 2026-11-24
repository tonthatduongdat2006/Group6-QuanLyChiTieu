// Chỉ khai báo trường được phép (whitelist); kiểm giá trị + thông báo ở DraftService.
import { IsOptional } from 'class-validator';

export class UpdateDraftDto {
  @IsOptional() transaction_type?: unknown;
  @IsOptional() amount?: unknown;
  @IsOptional() category_id?: unknown;
  @IsOptional() transaction_date?: unknown;
  @IsOptional() note?: unknown;
  @IsOptional() merchant_name?: unknown;
}

export class DraftItemDto {
  @IsOptional() item_name?: unknown;
  @IsOptional() amount?: unknown;
}
