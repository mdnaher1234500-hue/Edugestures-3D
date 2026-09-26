import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModelStatus } from '@edugesture/shared-types';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    description: string;
    category: string;
    tags: string[];
    fileUrl: string;
    thumbnailUrl?: string;
    fileSize: number;
    createdById: string;
  }) {
    // Calculate version: find max version for same name by same creator
    const existing = await this.prisma.threeDModel.findMany({
      where: { name: data.name, createdById: data.createdById },
      orderBy: { version: 'desc' },
      take: 1,
    });
    const version = existing.length > 0 ? existing[0].version + 1 : 1;

    return this.prisma.threeDModel.create({
      data: {
        ...data,
        version,
        status: 'DRAFT',
      },
    });
  }

  async findAll(filters?: { status?: ModelStatus; category?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;

    return this.prisma.threeDModel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async findPublished() {
    return this.prisma.threeDModel.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const model = await this.prisma.threeDModel.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!model) throw new NotFoundException('Model not found');
    return model;
  }

  async update(id: string, data: { name?: string; description?: string; category?: string; tags?: string[] }) {
    await this.findById(id);
    return this.prisma.threeDModel.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: ModelStatus) {
    const model = await this.findById(id);

    // Validate status transitions
    if (status === 'PUBLISHED' && model.status === 'ARCHIVED') {
      throw new BadRequestException('Cannot publish an archived model. Create a new version.');
    }

    return this.prisma.threeDModel.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.threeDModel.delete({ where: { id } });
  }
}
