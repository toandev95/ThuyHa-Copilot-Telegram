import { UseFilters, UseGuards } from '@nestjs/common';
import { Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

import { TelegrafExceptionFilter } from '../../common/filters/telegraf-exception.filter';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramService } from './telegram.service';

@Update()
@UseFilters(TelegrafExceptionFilter)
@UseGuards(AuthGuard)
export class TelegramUpdate {
  constructor(private readonly telegramService: TelegramService) {}

  @Start()
  public async start(@Ctx() ctx: Scenes.SceneContext): Promise<void> {
    await ctx.sendChatAction('typing');

    const response = await this.telegramService.sendMessage(
      ctx.from!.id.toString(),
      'Người dùng đã bắt đầu cuộc trò chuyện, hãy chào hỏi người dùng.',
    );
    await ctx.reply(response);
  }

  @On('text')
  public async onText(@Ctx() ctx: Scenes.SceneContext): Promise<void> {
    const intervalId = setInterval(() => {
      ctx.sendChatAction('typing');
    }, 6000);

    try {
      await ctx.sendChatAction('typing');

      const { from, text: message } = ctx.message as Message.TextMessage;
      const response = await this.telegramService.sendMessage(
        from!.id.toString(),
        message,
      );
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      throw error;
    } finally {
      clearInterval(intervalId);
    }
  }
}
