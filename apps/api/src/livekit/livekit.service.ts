import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  constructor(private readonly config: ConfigService) {}

  async createToken(room: string, identity: string, name: string) {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');

    if (!apiKey || !apiSecret) {
      // Mock / placeholder token for dev when LiveKit credentials are not yet set
      return {
        token: `mock-livekit-token-for-room-${room}`,
        url: this.config.get<string>('LIVEKIT_URL') ?? 'ws://localhost:7880',
        configured: false,
      };
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
    });

    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
    });

    return {
      token: await at.toJwt(),
      url: this.config.get<string>('LIVEKIT_URL') ?? 'ws://localhost:7880',
      configured: true,
    };
  }
}
