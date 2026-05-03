import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import type { AuthSessionPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { readSessionToken, type RequestWithCookies } from './session-token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSessionPayload> {
    const result = await this.authService.login(dto, {
      ipAddress: request.ip,
      userAgent: readHeader(request.headers['user-agent']),
    });
    const { sessionToken, ttlSeconds, ...payload } = result;

    reply.setCookie(this.authService.getSessionCookieName(), sessionToken, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      maxAge: ttlSeconds,
    });

    return payload;
  }

  @Get('me')
  async me(@Req() request: RequestWithCookies): Promise<AuthSessionPayload> {
    return this.authService.getCurrentSession(
      readSessionToken(request, this.authService.getSessionCookieName()),
    );
  }

  @Post('logout')
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ loggedOut: true }> {
    const sessionToken = readSessionToken(request, this.authService.getSessionCookieName());
    const result = await this.authService.logout(sessionToken);

    reply.clearCookie(this.authService.getSessionCookieName(), {
      path: '/',
      sameSite: 'lax',
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    });

    return result;
  }
}

function readHeader(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  return value?.[0];
}
