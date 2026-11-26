// MVP (planning-mvp §4.1 #14–#19): GET/PATCH nháp, thêm/sửa/xóa món, xác nhận. Hủy nháp, confirm-all thuộc phần hoãn.
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { IdempotencyKey } from '../../common/decorators/idempotency-key.decorator';
import { DraftItemDto, UpdateDraftDto } from './draft.dto';
import { DraftService } from './draft.service';

@Controller('ai')
export class DraftController {
  constructor(private readonly drafts: DraftService) {}

  @Get('drafts/:draftId')
  get(@CurrentUser() u: AuthUser, @Param('draftId') id: string) {
    return this.drafts.get(u.id, id);
  }

  @Patch('drafts/:draftId')
  update(@CurrentUser() u: AuthUser, @Param('draftId') id: string, @Body() dto: UpdateDraftDto) {
    return this.drafts.update(u.id, id, dto);
  }

  @Post('drafts/:draftId/items')
  @HttpCode(201)
  addItem(@CurrentUser() u: AuthUser, @Param('draftId') id: string, @Body() dto: DraftItemDto) {
    return this.drafts.addItem(u.id, id, dto);
  }

  @Patch('draft-items/:itemId')
  updateItem(@CurrentUser() u: AuthUser, @Param('itemId') id: string, @Body() dto: DraftItemDto) {
    return this.drafts.updateItem(u.id, id, dto);
  }

  @Delete('draft-items/:itemId')
  deleteItem(@CurrentUser() u: AuthUser, @Param('itemId') id: string) {
    return this.drafts.deleteItem(u.id, id);
  }

  @Post('drafts/:draftId/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() u: AuthUser, @Param('draftId') id: string, @IdempotencyKey(true) key: string) {
    return this.drafts.confirm(u.id, id, key);
  }
}
