import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AccessControlModule } from './access-control/access-control.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('LOG_LEVEL', 'info'),
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            'req.body.password',
            'req.body.passwordConfirm',
            'req.body.token',
            'req.body.refreshToken',
          ],
          customProps: (req) => ({
            requestId: (req as { id?: string }).id ?? req.headers['x-request-id'],
          }),
        },
      }),
    }),
    AuthModule,
    AuditModule,
    AccessControlModule,
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
