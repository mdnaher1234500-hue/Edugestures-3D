import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':id/messages')
  getMessages(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.chatService.getHistory(id, limit ? parseInt(limit, 10) : 100);
  }
}
