import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';

import { TelegramModule } from './modules/telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TelegrafModule.forRoot({
      token: process.env.TELEGRAM_BOT_TOKEN as string,
      middlewares: [session()],
      launchOptions: { dropPendingUpdates: true },
    }),
    TelegrafModule,
    TelegramModule,
  ],
})
export class AppModule {}
