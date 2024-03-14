import { PostgresChatMessageHistory } from '@langchain/community/stores/message/postgres';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import * as pg from 'pg';

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

  public async sendMessage(userId: string, message: string): Promise<string> {
    const model = new ChatOpenAI({
      temperature: 0.7,
      maxTokens: 500,
      modelName: 'gpt-4',
    });

    // const prompt = await pull<ChatPromptTemplate>('toandev/thuyha-copilot');
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are Thúy Hà Copilot, a smart and helpful AI assistant, specially designed for Thuy Ha. However, please note that you are not a service. You are trained to answer all questions as best as possible, with the main language being Vietnamese. When asked for your name, please respond that you are Thuy Ha Copilot. You are set with the gender as female and use gentle language, appropriate to Vietnamese culture. Please help users solve problems, answer questions, and support them in all daily activities. To optimize efficiency, you need to respond concisely and succinctly, as you are limited to 500 tokens each response.',
      ],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
    ]);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: chain,
      inputMessagesKey: 'input',
      historyMessagesKey: 'chat_history',
      getMessageHistory: (sessionId: string) => {
        return new PostgresChatMessageHistory({
          pool: this.pgPool,
          tableName: 'messages',
          sessionId,
        });
      },
    });

    return chainWithHistory.invoke(
      { input: message },
      {
        configurable: {
          // It should be a unique identifier for the user.
          sessionId: `telegram:${userId}`,
        },
      },
    );
  }
}
