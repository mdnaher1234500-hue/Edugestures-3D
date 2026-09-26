import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { ModelsModule } from './models/models.module';
import { SessionsModule } from './sessions/sessions.module';
import { GatewayModule } from './gateway/gateway.module';
import { ChatModule } from './chat/chat.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LiveKitModule } from './livekit/livekit.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    ModelsModule,
    SessionsModule,
    GatewayModule,
    ChatModule,
    AttendanceModule,
    LiveKitModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
