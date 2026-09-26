import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { LiveKitService } from './livekit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('livekit')
@UseGuards(JwtAuthGuard)
export class LiveKitController {
  constructor(private readonly livekitService: LiveKitService) {}

  @Post('token')
  getToken(
    @Body('room') room: string,
    @CurrentUser() user: { id: string; name: string },
  ) {
    return this.livekitService.createToken(room || 'default-room', user.id, user.name);
  }
}
