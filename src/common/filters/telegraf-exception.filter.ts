import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { TelegrafArgumentsHost } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';

@Catch()
export class TelegrafExceptionFilter implements ExceptionFilter {
  private readonly logger: Logger = new Logger(TelegrafExceptionFilter.name);

  public async catch(ex: Error, host: ArgumentsHost): Promise<void> {
    this.logger.error(ex.message, ex.stack);

    const telegrafHost = TelegrafArgumentsHost.create(host);
    const ctx = telegrafHost.getContext<Scenes.SceneContext>();

    await ctx.reply(ex.message || 'Có lỗi xảy ra, vui lòng thử lại sau!');
  }
}
