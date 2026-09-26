import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ModelsService } from '../models/models.service';
import { ModelStatus } from '@edugesture/shared-types';

// Multer config for GLB + thumbnail uploads
const storage = diskStorage({
  destination: (_req, file, cb) => {
    const dir = file.fieldname === 'model'
      ? join(__dirname, '..', '..', 'uploads', 'models')
      : join(__dirname, '..', '..', 'uploads', 'thumbnails');
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: unknown, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
  if (file.fieldname === 'model') {
    const allowed = ['.glb', '.gltf'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) {
      return cb(new BadRequestException('Only .glb and .gltf files are allowed'), false);
    }
  }
  if (file.fieldname === 'thumbnail') {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) {
      return cb(new BadRequestException('Only image files are allowed for thumbnail'), false);
    }
  }
  cb(null, true);
};

const MAX_MODEL_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_THUMB_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('admin/models')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly modelsService: ModelsService) {}

  /** POST /api/admin/models — Upload a new 3D model */
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'model', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ],
      { storage, fileFilter, limits: { fileSize: MAX_MODEL_SIZE } },
    ),
  )
  async create(
    @UploadedFiles() files: { model?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] },
    @Body() body: { name: string; description?: string; category?: string; tags?: string },
    @CurrentUser('id') userId: string,
  ) {
    if (!files.model || files.model.length === 0) {
      throw new BadRequestException('A .glb model file is required');
    }

    const modelFile = files.model[0];
    const thumbnailFile = files.thumbnail?.[0];

    if (modelFile.size > MAX_MODEL_SIZE) {
      throw new BadRequestException('Model file exceeds 100 MB limit');
    }

    const fileUrl = `/uploads/models/${modelFile.filename}`;
    const thumbnailUrl = thumbnailFile ? `/uploads/thumbnails/${thumbnailFile.filename}` : undefined;

    let tags: string[] = [];
    if (body.tags) {
      try {
        tags = JSON.parse(body.tags);
      } catch {
        tags = body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    }

    return this.modelsService.create({
      name: body.name,
      description: body.description ?? '',
      category: body.category ?? '',
      tags,
      fileUrl,
      thumbnailUrl,
      fileSize: modelFile.size,
      createdById: userId,
    });
  }

  /** GET /api/admin/models — List all models (any status) */
  @Get()
  findAll() {
    return this.modelsService.findAll();
  }

  /** GET /api/admin/models/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modelsService.findById(id);
  }

  /** PATCH /api/admin/models/:id — Update metadata */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; category?: string; tags?: string[] },
  ) {
    return this.modelsService.update(id, body);
  }

  /** DELETE /api/admin/models/:id */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.modelsService.remove(id);
  }

  /** PATCH /api/admin/models/:id/publish */
  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.modelsService.updateStatus(id, ModelStatus.PUBLISHED);
  }

  /** PATCH /api/admin/models/:id/unpublish */
  @Patch(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.modelsService.updateStatus(id, ModelStatus.DRAFT);
  }

  /** PATCH /api/admin/models/:id/archive */
  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.modelsService.updateStatus(id, ModelStatus.ARCHIVED);
  }
}
