import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [ModelsModule],
  controllers: [AdminController],
})
export class AdminModule {}
