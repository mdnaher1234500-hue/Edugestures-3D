import { Module } from '@nestjs/common';
import { SessionGateway } from './session.gateway';
import { SessionsModule } from '../sessions/sessions.module';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SessionsModule, ChatModule, AuthModule],
  providers: [SessionGateway],
})
export class GatewayModule {}
