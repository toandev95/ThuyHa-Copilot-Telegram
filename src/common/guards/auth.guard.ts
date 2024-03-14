import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { includes, isNil } from 'lodash';
import { TelegrafException, TelegrafExecutionContext } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly ALLOWED_USER_IDS: number[] = [2012610435];

  public canActivate(context: ExecutionContext): boolean {
    const ctx = TelegrafExecutionContext.create(context);
    const { from } = ctx.getContext<Scenes.SceneContext>();

    if (isNil(from) || !includes(this.ALLOWED_USER_IDS, from.id)) {
      throw new TelegrafException(
        'Woops! Đây là tính năng dành riêng cho Thúy Hà!',
      );
    }

    return true;
  }
}
