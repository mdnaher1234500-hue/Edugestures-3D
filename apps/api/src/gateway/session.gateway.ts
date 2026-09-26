import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { SessionsService } from '../sessions/sessions.service';
import { ChatService } from '../chat/chat.service';
import {
  ClientToServerEvents,
  ModelTransformState,
  ServerToClientEvents,
  UserRole,
  applyGestureCommand,
} from '@edugesture/shared-types';
import { JwtPayload } from '../auth/jwt-payload.interface';

interface SocketData {
  userId: string;
  userName: string;
  role: UserRole;
  sessionCode?: string;
  sessionId?: string;
}

const PERSIST_INTERVAL_MS = 2000;

@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true },
})
export class SessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  private readonly logger = new Logger(SessionGateway.name);
  private readonly liveState = new Map<string, ModelTransformState>();
  private readonly dirtySessions = new Set<string>();
  private readonly sessionIdByCode = new Map<string, string>();
  private readonly lockedSessions = new Set<string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionsService: SessionsService,
    private readonly chatService: ChatService,
  ) {
    setInterval(() => this.flushDirtySessions(), PERSIST_INTERVAL_MS);
  }

  handleConnection(client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>) {
    const { sessionCode, userId, userName, sessionId } = client.data;
    if (sessionCode && userId && sessionId) {
      await this.sessionsService.leaveSession(userId, sessionId);
      const remaining = await this.server.in(sessionCode).fetchSockets();
      this.server.to(sessionCode).emit('session:participants', remaining.length);
      this.server.to(sessionCode).emit('participant:left', { userId, name: userName || 'Unknown' });
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('session:join')
  async onJoin(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    @MessageBody() payload: { sessionCode: string; token: string },
  ) {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(payload.token);
      const session = await this.sessionsService.getByCode(payload.sessionCode);

      // Check if locked
      if (this.lockedSessions.has(session.code) && decoded.role !== 'TEACHER') {
        client.emit('session:error', 'Session is locked');
        return;
      }

      client.data.userId = decoded.sub;
      client.data.userName = decoded.email;
      client.data.role = decoded.role as UserRole;
      client.data.sessionCode = session.code;
      client.data.sessionId = session.id;
      this.sessionIdByCode.set(session.code, session.id);

      await client.join(session.code);

      // Initialize live state from DB if not yet loaded
      if (!this.liveState.has(session.code)) {
        const persisted = await this.sessionsService.getTransformState(session.id);
        this.liveState.set(session.code, persisted);
      }

      client.emit('session:state', this.liveState.get(session.code)!);

      const sockets = await this.server.in(session.code).fetchSockets();
      this.server.to(session.code).emit('session:participants', sockets.length);
      this.server.to(session.code).emit('participant:joined', {
        userId: decoded.sub,
        name: decoded.email,
        role: decoded.role as UserRole,
      });

      this.logger.log(`User ${decoded.sub} joined session ${session.code}`);
    } catch (err) {
      this.logger.warn(`Join rejected for socket ${client.id}: ${(err as Error).message}`);
      client.emit('session:error', 'Unable to join session');
    }
  }

  @SubscribeMessage('session:leave')
  async onLeave(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    @MessageBody() payload: { sessionCode: string },
  ) {
    await client.leave(payload.sessionCode);
    if (client.data.userId && client.data.sessionId) {
      await this.sessionsService.leaveSession(client.data.userId, client.data.sessionId);
    }
    const sockets = await this.server.in(payload.sessionCode).fetchSockets();
    this.server.to(payload.sessionCode).emit('session:participants', sockets.length);
  }

  @SubscribeMessage('gesture:agent_status')
  onGestureAgentStatus(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    @MessageBody() payload: { sessionCode: string; status: string },
  ) {
    this.logger.log(`Gesture agent status for ${payload.sessionCode}: ${payload.status}`);
    this.server.to(payload.sessionCode).emit('gesture:agent_status' as any, {
      status: payload.status,
      connected: true,
    });
  }

  @SubscribeMessage('gesture:command')
  onGestureCommand(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    @MessageBody() payload: { sessionCode: string; command: any },
  ) {
    if (client.data.role !== UserRole.TEACHER) {
      client.emit('session:error', 'Only the teacher can issue gesture commands');
      return;
    }

    const { sessionCode, command } = payload;
    const current = this.liveState.get(sessionCode);
    if (!current) {
      client.emit('session:error', 'Session state not initialized');
      return;
    }

    const next = applyGestureCommand(current, command);
    this.liveState.set(sessionCode, next);
    this.dirtySessions.add(sessionCode);

    this.server.to(sessionCode).emit('session:state', next);
  }

  @SubscribeMessage('chat:send')
  async onChatSend(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    @MessageBody() payload: { sessionCode: string; message: string },
  ) {
    if (!client.data.userId || !client.data.sessionId) {
      client.emit('session:error', 'Not in a session');
      return;
    }

    const msg = await this.chatService.create({
      sessionId: client.data.sessionId,
      senderId: client.data.userId,
      message: payload.message.trim().slice(0, 500), // sanitize + limit
    });

    this.server.to(payload.sessionCode).emit('chat:message', msg);
  }

  @SubscribeMessage('chat:history')
  async onChatHistory(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    @MessageBody() payload: { sessionCode: string },
  ) {
    if (!client.data.sessionId) return;
    const messages = await this.chatService.getHistory(client.data.sessionId);
    client.emit('chat:history', messages);
  }

  @SubscribeMessage('participant:mute')
  async onMute(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    @MessageBody() payload: { sessionCode: string; userId: string },
  ) {
    if (client.data.role !== UserRole.TEACHER) return;
    this.server.to(payload.sessionCode).emit('participant:muted', { userId: payload.userId });
  }

  @SubscribeMessage('participant:remove')
  async onRemove(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    @MessageBody() payload: { sessionCode: string; userId: string },
  ) {
    if (client.data.role !== UserRole.TEACHER) return;
    this.server.to(payload.sessionCode).emit('participant:removed', { userId: payload.userId });
    // Disconnect the removed user
    const sockets = await this.server.in(payload.sessionCode).fetchSockets();
    for (const s of sockets) {
      if ((s.data as SocketData).userId === payload.userId) {
        s.leave(payload.sessionCode);
        s.disconnect(true);
      }
    }
  }

  @SubscribeMessage('classroom:lock')
  onLock(
    @ConnectedSocket() client: Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>,
    @MessageBody() payload: { sessionCode: string; locked: boolean },
  ) {
    if (client.data.role !== UserRole.TEACHER) return;
    if (payload.locked) {
      this.lockedSessions.add(payload.sessionCode);
    } else {
      this.lockedSessions.delete(payload.sessionCode);
    }
    this.server.to(payload.sessionCode).emit('classroom:locked', payload.locked);
  }

  private async flushDirtySessions() {
    for (const code of Array.from(this.dirtySessions)) {
      const state = this.liveState.get(code);
      const sessionId = this.sessionIdByCode.get(code);
      if (!state || !sessionId) continue;
      try {
        await this.sessionsService.persistTransformState(sessionId, state);
        this.dirtySessions.delete(code);
      } catch (err) {
        this.logger.error(`Failed to persist session ${code}: ${(err as Error).message}`);
      }
    }
  }
}
