import { Module } from '@nestjs/common';
import { DraftController } from '../ai-draft/draft.controller';
import { DraftService } from '../ai-draft/draft.service';
import { ReceiptUploadInterceptor, ScanController } from './scan.controller';
import { ScanService } from './scan.service';

@Module({ controllers: [ScanController, DraftController], providers: [ScanService, DraftService, ReceiptUploadInterceptor] })
export class AiScanModule {}
