import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModelTransformState } from '@edugesture/shared-types';
import { customAlphabet } from 'nanoid';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teacherId: string, data: { title: string; modelId: string }) {
    // Verify model exists and is published
    const model = await this.prisma.threeDModel.findUnique({ where: { id: data.modelId } });
    if (!model) throw new NotFoundException('Model not found');
    if (model.status !== 'PUBLISHED') throw new BadRequestException('Model is not published');

    // Generate unique 6-char code
    let code = generateCode();
    let attempts = 0;
    while (await this.prisma.session.findUnique({ where: { code } })) {
      code = generateCode();
      attempts++;
      if (attempts > 10) throw new BadRequestException('Could not generate unique code');
    }

    const session = await this.prisma.session.create({
      data: {
        code,
        title: data.title,
        teacherId,
        modelId: data.modelId,
        status: 'PENDING',
      },
      include: {
        model: { select: { id: true, name: true, fileUrl: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });

    return this.formatSession(session);
  }

  async getByCode(code: string) {
    const session = await this.prisma.session.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        model: { select: { id: true, name: true, fileUrl: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return this.formatSession(session);
  }

  async getById(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        model: { select: { id: true, name: true, fileUrl: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    return this.formatSession(session);
  }

  async getMySessionsTeacher(teacherId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { teacherId },
      include: {
        model: { select: { id: true, name: true, fileUrl: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((s: any) => this.formatSession(s));
  }

  async getMySessionsStudent(userId: string) {
    const participations = await this.prisma.participant.findMany({
      where: { userId },
      include: {
        session: {
          include: {
            model: { select: { id: true, name: true, fileUrl: true } },
            teacher: { select: { id: true, name: true } },
            _count: { select: { participants: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return participations.map((p: any) => this.formatSession(p.session));
  }

  async start(id: string, teacherId: string) {
    const session = await this.getById(id);
    if (session.teacherId !== teacherId) throw new ForbiddenException('Not the session owner');
    if (session.status !== 'PENDING') throw new BadRequestException('Session is not in PENDING state');

    const updated = await this.prisma.session.update({
      where: { id },
      data: { status: 'LIVE', startedAt: new Date() },
      include: {
        model: { select: { id: true, name: true, fileUrl: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });
    return this.formatSession(updated);
  }

  async end(id: string, teacherId: string) {
    const session = await this.getById(id);
    if (session.teacherId !== teacherId) throw new ForbiddenException('Not the session owner');

    const updated = await this.prisma.session.update({
      where: { id },
      data: { status: 'ENDED', endedAt: new Date() },
      include: {
        model: { select: { id: true, name: true, fileUrl: true } },
        teacher: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });

    // Finalize attendance
    await this.prisma.participant.updateMany({
      where: { sessionId: id, leftAt: null },
      data: { leftAt: new Date(), status: 'LEFT' },
    });

    return this.formatSession(updated);
  }

  async join(userId: string, code: string) {
    const session = await this.getByCode(code);
    if (session.status === 'ENDED') throw new BadRequestException('Session has ended');
    if (session.isLocked) throw new BadRequestException('Session is locked');

    // Upsert participant
    await this.prisma.participant.upsert({
      where: { sessionId_userId: { sessionId: session.id, userId } },
      update: { status: 'ACTIVE', leftAt: null, joinedAt: new Date() },
      create: { sessionId: session.id, userId, status: 'ACTIVE' },
    });

    // Upsert attendance
    await this.prisma.attendance.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId: userId } },
      update: { joinedAt: new Date(), leftAt: null },
      create: { sessionId: session.id, studentId: userId },
    });

    return session;
  }

  async leaveSession(userId: string, sessionId: string) {
    const now = new Date();
    await this.prisma.participant.updateMany({
      where: { sessionId, userId },
      data: { leftAt: now, status: 'LEFT' },
    });

    // Update attendance
    const attendance = await this.prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: userId } },
    });
    if (attendance) {
      const duration = Math.floor((now.getTime() - attendance.joinedAt.getTime()) / 1000);
      await this.prisma.attendance.update({
        where: { id: attendance.id },
        data: { leftAt: now, duration },
      });
    }
  }

  async getTransformState(sessionId: string): Promise<ModelTransformState> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    return {
      rotationX: session.rotationX,
      rotationY: session.rotationY,
      zoom: session.zoom,
      selectedMeshName: session.selectedMeshName,
      highlightedMeshName: session.highlightedMeshName,
      updatedAt: session.updatedAt.getTime(),
    };
  }

  async persistTransformState(sessionId: string, state: ModelTransformState) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        rotationX: state.rotationX,
        rotationY: state.rotationY,
        zoom: state.zoom,
        selectedMeshName: state.selectedMeshName,
        highlightedMeshName: state.highlightedMeshName,
      },
    });
  }

  private agentProcesses = new Map<string, any>();

  startGestureAgent(code: string) {
    const sessionCode = code.toUpperCase();
    const existing = this.agentProcesses.get(sessionCode);
    if (existing && !existing.killed) {
      return { success: true, message: `Gesture agent already running for session ${sessionCode}` };
    }

    const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { spawn } = require('child_process');
    const agentDir = path.resolve(process.cwd(), 'apps/gesture-agent');

    try {
      const proc = spawn('python', ['src/main.py', '--session', sessionCode], {
        cwd: agentDir,
        detached: true,
        shell: true,
        stdio: 'ignore',
        windowsHide: false,
      });

      proc.on('error', (err: any) => {
        console.warn(`Failed to start python agent process: ${err.message}`);
        this.agentProcesses.delete(sessionCode);
      });

      proc.on('exit', () => {
        this.agentProcesses.delete(sessionCode);
      });

      proc.unref();
      this.agentProcesses.set(sessionCode, proc);

      return { success: true, message: `Python gesture agent launched for session ${sessionCode}` };
    } catch (err: any) {
      return { success: false, message: `Failed to launch gesture agent: ${err.message}` };
    }
  }

  private formatSession(session: any) {
    return {
      id: session.id,
      code: session.code,
      title: session.title,
      status: session.status,
      modelId: session.model?.id ?? session.modelId,
      modelUrl: session.model?.fileUrl ?? '',
      modelName: session.model?.name ?? '',
      teacherId: session.teacher?.id ?? session.teacherId,
      teacherName: session.teacher?.name ?? '',
      participantCount: session._count?.participants ?? 0,
      isLocked: session.isLocked ?? false,
      createdAt: session.createdAt?.toISOString() ?? '',
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
    };
  }
}
