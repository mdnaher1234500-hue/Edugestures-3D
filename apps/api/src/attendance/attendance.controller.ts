import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get(':id/attendance')
  @UseGuards(RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  getSessionAttendance(@Param('id') id: string) {
    return this.attendanceService.getSessionAttendance(id);
  }
}
