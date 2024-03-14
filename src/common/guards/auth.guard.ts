import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { includes, isNil } from 'lodash';
import { TelegrafException, TelegrafExecutionContext } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';

@Injectable()
export class AuthGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const ctx = TelegrafExecutionContext.create(context);
    const { from } = ctx.getContext<Scenes.SceneContext>();

    const ALLOWED_USER_IDS = (process.env.TELEGRAM_ALLOWED_USER_IDS || '')
      .split(',')
      .filter((id) => id.trim() !== '')
      .map((id) => parseInt(id, 10));

    if (isNil(from) || !includes(ALLOWED_USER_IDS, from.id)) {
      throw new TelegrafException(
        'Woops! Đây là tính năng dành riêng cho Thúy Hà!',
      );
    }

    return true;
  }
}
