import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, JoinSessionDto } from './dto/session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /** POST /api/sessions — Teacher creates a session */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  create(@Body() dto: CreateSessionDto, @CurrentUser('id') userId: string) {
    return this.sessionsService.create(userId, dto);
  }

  /** GET /api/sessions/my — Get my sessions (teacher or student) */
  @Get('my')
  getMySessions(@CurrentUser() user: { id: string; role: string }) {
    if (user.role === 'TEACHER') {
      return this.sessionsService.getMySessionsTeacher(user.id);
    }
    return this.sessionsService.getMySessionsStudent(user.id);
  }

  /** POST /api/sessions/join — Student joins a session */
  @Post('join')
  join(@Body() dto: JoinSessionDto, @CurrentUser('id') userId: string) {
    return this.sessionsService.join(userId, dto.code);
  }

  /** GET /api/sessions/:code — Get session by code */
  @Get(':code')
  getByCode(@Param('code') code: string) {
    return this.sessionsService.getByCode(code);
  }

  /** PATCH /api/sessions/:id/start — Teacher starts session */
  @Patch(':id/start')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  start(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.sessionsService.start(id, userId);
  }

  /** PATCH /api/sessions/:id/end — Teacher ends session */
  @Patch(':id/end')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  end(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.sessionsService.end(id, userId);
  }

  /** POST /api/sessions/:code/start-agent — Launch Python Gesture Agent */
  @Post(':code/start-agent')
  @UseGuards(RolesGuard)
  @Roles('TEACHER')
  startAgent(@Param('code') code: string) {
    return this.sessionsService.startGestureAgent(code);
  }
}
