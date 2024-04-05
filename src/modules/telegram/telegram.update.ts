import { UseFilters, UseGuards } from '@nestjs/common';
import { Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';

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
    const intervalId = setInterval(() => {
      ctx.sendChatAction('typing');
    }, 6000);

    try {
      await ctx.sendChatAction('typing');
      await this.telegramService.sendMessage(
        ctx,
        'The user has started the conversation, greet the user.',
      );
    } catch (error) {
      throw error;
    } finally {
      clearInterval(intervalId);
    }
  }

  @On('text')
  public async onText(@Ctx() ctx: Scenes.SceneContext): Promise<void> {
    const intervalId = setInterval(() => {
      ctx.sendChatAction('typing');
    }, 6000);

    try {
      await ctx.sendChatAction('typing');
      await this.telegramService.sendMessage(ctx);
    } catch (error) {
      throw error;
    } finally {
      clearInterval(intervalId);
    }
  }
}
