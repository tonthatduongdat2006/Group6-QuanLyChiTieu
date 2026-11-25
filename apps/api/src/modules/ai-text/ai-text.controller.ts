import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ParseMessageRequest } from '../../../../packages/contracts/src/ai-text';
import { parseExpenseMessage } from './message-parser.util';

@Controller('ai/text')
export class AiTextController {
  @Post('parse')
  @HttpCode(HttpStatus.OK)
  parseMessage(@Body() body: ParseMessageRequest) {
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return {
        error: {
          code: 'INVALID_MESSAGE',
          message: 'Vui lòng nhập nội dung tin nhắn chi tiêu.',
        },
      };
    }

    const draft = parseExpenseMessage(message, body?.referenceDate);
    return {
      data: draft,
    };
  }
}
