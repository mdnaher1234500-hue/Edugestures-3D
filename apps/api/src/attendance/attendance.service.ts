import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceRecord } from '@edugesture/shared-types';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
    const attendances = await this.prisma.attendance.findMany({
      where: { sessionId },
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return attendances.map((a: any) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.student.name,
      joinedAt: a.joinedAt.toISOString(),
      leftAt: a.leftAt?.toISOString() ?? null,
      duration: a.duration,
    }));
  }

  async recordJoin(sessionId: string, studentId: string) {
    return this.prisma.attendance.upsert({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
      update: {
        joinedAt: new Date(),
        leftAt: null,
      },
      create: {
        sessionId,
        studentId,
        joinedAt: new Date(),
      },
    });
  }

  async recordLeave(sessionId: string, studentId: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } },
    });
    if (!existing) return null;

    const leftAt = new Date();
    const duration = Math.max(0, Math.floor((leftAt.getTime() - existing.joinedAt.getTime()) / 1000));

    return this.prisma.attendance.update({
      where: { sessionId_studentId: { sessionId, studentId } },
      data: { leftAt, duration },
    });
  }
}
