import { UseFilters, UseGuards } from '@nestjs/common';
import { Ctx, Hears, On, Start, Update } from 'nestjs-telegraf';
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
    const intervalId = setInterval(() => {
      ctx.sendChatAction('typing');
    }, 6000);

    try {
      await ctx.sendChatAction('typing');

      const response = await this.telegramService.sendMessage(
        ctx.from!.id.toString(),
        // On behalf of the user, say hello to the bot.
        'Người dùng đã bắt đầu cuộc trò chuyện, hãy chào hỏi người dùng.',
      );
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      throw error;
    } finally {
      clearInterval(intervalId);
    }
  }

  @Hears(/^\/qa\s(.+)/)
  public async onQA(@Ctx() ctx: Scenes.SceneContext): Promise<void> {
    const intervalId = setInterval(() => {
      ctx.sendChatAction('typing');
    }, 6000);

    try {
      await ctx.sendChatAction('typing');

      const { from, text } = ctx.message as Message.TextMessage;
      const message = text.match(/^\/qa\s(.+)/)![1];
      const response = await this.telegramService.sendQuestion(
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

  @On('document')
  public async onDocument(@Ctx() ctx: Scenes.SceneContext): Promise<void> {
    const intervalId = setInterval(() => {
      ctx.sendChatAction('typing');
    }, 6000);

    try {
      await ctx.sendChatAction('typing');

      const { from, document } = ctx.message as Message.DocumentMessage;
      const { href: url } = await ctx.telegram.getFileLink(document.file_id);
      await this.telegramService.ingest(ctx.from!.id.toString(), document, url);

      const response = await this.telegramService.sendMessage(
        from!.id.toString(),
        `Người dùng đã gửi tài liệu tên là "${document.file_name}" cho bạn, hãy hỏi người dùng cần thông tin gì trong các tài liệu này.`,
      );
      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      throw error;
    } finally {
      clearInterval(intervalId);
    }
  }
}
