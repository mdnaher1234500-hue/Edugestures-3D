import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatMessagePayload, UserRole } from '@edugesture/shared-types';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { sessionId: string; senderId: string; message: string }): Promise<ChatMessagePayload> {
    const msg = await this.prisma.chatMessage.create({
      data: {
        sessionId: data.sessionId,
        senderId: data.senderId,
        message: data.message,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    return {
      id: msg.id,
      sessionId: msg.sessionId,
      senderId: msg.senderId,
      senderName: msg.sender.name,
      senderRole: msg.sender.role as UserRole,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  async getHistory(sessionId: string, limit = 100): Promise<ChatMessagePayload[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map((msg: any) => ({
      id: msg.id,
      sessionId: msg.sessionId,
      senderId: msg.senderId,
      senderName: msg.sender.name,
      senderRole: msg.sender.role as UserRole,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
    }));
  }
}
