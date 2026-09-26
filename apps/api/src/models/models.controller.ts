import { Controller, Get, UseGuards } from '@nestjs/common';
import { ModelsService } from './models.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('models')
@UseGuards(JwtAuthGuard)
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  /** GET /api/models — List published models (for teachers selecting a model) */
  @Get()
  findPublished() {
    return this.modelsService.findPublished();
  }
}
