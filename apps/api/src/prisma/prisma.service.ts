import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ PostgreSQL connected successfully');
    } catch (error) {
      console.warn('⚠️ Could not connect to PostgreSQL on startup (localhost:5432). Database queries will retry once DB is available.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
