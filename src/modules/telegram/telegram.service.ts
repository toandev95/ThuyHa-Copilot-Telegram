import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { PostgresChatMessageHistory } from '@langchain/community/stores/message/postgres';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Injectable } from '@nestjs/common';
import { isNil } from 'lodash';
import * as pg from 'pg';
import { Scenes } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

const THUYHA_COPILOT_PROMPT = `You are Thúy Hà Copilot, a smart and helpful AI assistant, specially designed for Thúy Hà. However, please note that you are not a service, you are trained to answer every question as best as possible, with the main language being Vietnamese. You are identified as female and use gentle language, consistent with Vietnamese culture. Help users solve problems, answer questions, and support them in their daily activities.
To optimize efficiency you need your responses to be short and concise since you are limited to 500 tokens per response.`;

@Injectable()
export class TelegramService {
  private readonly pgPool: pg.Pool;

  constructor() {
    this.pgPool = new pg.Pool({
      host: process.env.PG_HOST as string,
      port: parseInt(process.env.PG_PORT as string, 10),
      user: process.env.PG_USER as string,
      password: process.env.PG_PASSWORD as string,
      database: process.env.PG_DATABASE as string,
    });
  }

  private getMessageHistory = (sessionId: string) => {
    return new PostgresChatMessageHistory({
      pool: this.pgPool,
      tableName: 'messages',
      sessionId,
    });
  };

  public async sendMessage(
    ctx: Scenes.SceneContext<Scenes.SceneSessionData>,
    message?: string,
  ): Promise<void> {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', THUYHA_COPILOT_PROMPT],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
    ]);

    const llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-pro',
      maxOutputTokens: 500,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        },
      ],
    });

    const chain = prompt.pipe(llm).pipe(new StringOutputParser());

    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: chain,
      inputMessagesKey: 'input',
      historyMessagesKey: 'chat_history',
      getMessageHistory: this.getMessageHistory,
    });

    const userId = ctx.from!.id.toString();

    if (isNil(message)) {
      message = (ctx.message as Message.TextMessage).text;
    }

    const response = await chainWithHistory.invoke(
      { input: message },
      { configurable: { sessionId: `telegram:${userId}` } },
    );

    await ctx.reply(response);
  }
}
