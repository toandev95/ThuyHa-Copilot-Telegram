import { PostgresChatMessageHistory } from '@langchain/community/stores/message/postgres';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { BadRequestException, Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { BaseDocumentLoader } from 'langchain/document_loaders/base';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { DocxLoader } from 'langchain/document_loaders/fs/docx';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { PPTXLoader } from 'langchain/document_loaders/fs/pptx';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { BufferMemory } from 'langchain/memory';
import * as pg from 'pg';
import { Document as TelegramDocument } from 'telegraf/types';

@Injectable()
export class TelegramService {
  private readonly model: ChatOpenAI;
  private readonly pgPool: pg.Pool;
  private readonly supabaseClient: SupabaseClient;

  constructor() {
    this.model = new ChatOpenAI({
      temperature: 0.7,
      maxTokens: 500,
      modelName: 'gpt-4',
    });

    this.pgPool = new pg.Pool({
      host: process.env.PG_HOST as string,
      port: parseInt(process.env.PG_PORT as string, 10),
      user: process.env.PG_USER as string,
      password: process.env.PG_PASSWORD as string,
      database: process.env.PG_DATABASE as string,
    });

    this.supabaseClient = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_PRIVATE_KEY as string,
    );
  }

  public async sendMessage(userId: string, message: string): Promise<string> {
    // const prompt = await pull<ChatPromptTemplate>('toandev/thuyha-copilot');
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are Thúy Hà Copilot, a smart and helpful AI assistant, specially designed for Thuy Ha. However, please note that you are not a service. You are trained to answer all questions as best as possible, with the main language being Vietnamese. When asked for your name, please respond that you are Thuy Ha Copilot. You are set with the gender as female and use gentle language, appropriate to Vietnamese culture. Please help users solve problems, answer questions, and support them in all daily activities. To optimize efficiency, you need to respond concisely and succinctly, as you are limited to 500 tokens each response.',
      ],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
    ]);
    const chain = prompt.pipe(this.model).pipe(new StringOutputParser());
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

  public async sendQuestion(userId: string, question: string): Promise<string> {
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      {
        client: this.supabaseClient,
        tableName: 'documents',
        queryName: 'match_documents',
      },
    );

    const chain = ConversationalRetrievalQAChain.fromLLM(
      this.model,
      vectorStore.asRetriever(),
      {
        memory: new BufferMemory({
          memoryKey: 'chat_history',
          inputKey: 'question',
          outputKey: 'text',
          returnMessages: true,
          chatHistory: new PostgresChatMessageHistory({
            pool: this.pgPool,
            tableName: 'messages',
            sessionId: `telegram:${userId}`,
          }),
        }),
      },
    );

    return chain.invoke({ question }).then((res) => res.text);
  }

  public async ingest(
    userId: string,
    document: TelegramDocument,
    url: string,
  ): Promise<void> {
    try {
      const { data: buffer } = await axios.get(url, {
        responseType: 'arraybuffer',
      });

      let loader: BaseDocumentLoader;

      switch (document.mime_type) {
        case 'application/pdf':
          loader = new PDFLoader(new Blob([buffer]), { splitPages: true });
          break;

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          loader = new DocxLoader(new Blob([buffer]));
          break;

        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          loader = new PPTXLoader(new Blob([buffer]));
          break;

        case 'text/csv':
          loader = new CSVLoader(new Blob([buffer]));
          break;

        case 'text/plain':
          loader = new TextLoader(new Blob([buffer]));
          break;

        default:
          throw new Error('Không hỗ trợ định dạng tài liệu này.');
      }

      const loadedDocs = await loader.load();
      const docs = loadedDocs.map((doc) => {
        return new Document({
          ...doc,
          metadata: {
            ...doc.metadata,
            user_id: userId,
            file_id: document.file_id,
            file_name: document.file_name,
          },
        });
      });

      await SupabaseVectorStore.fromDocuments(docs, new OpenAIEmbeddings(), {
        client: this.supabaseClient,
        tableName: 'documents',
        queryName: 'match_documents',
      });
    } catch (error) {
      console.error(error);

      throw new BadRequestException('Không thể xử lý tài liệu.');
    }
  }
}
