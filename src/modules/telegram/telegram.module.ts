import { Module } from '@nestjs/common';

import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';

@Module({
  providers: [TelegramUpdate, TelegramService],
})
export class TelegramModule {}
