import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthenticatedSessionGuard } from './guards/authenticated-session.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, AuthenticatedSessionGuard, PermissionsGuard],
  exports: [AuthService, AuthenticatedSessionGuard, PermissionsGuard],
})
export class AuthModule {}
