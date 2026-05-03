import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';

@Module({
  imports: [AuditModule, AuthModule, DatabaseModule],
  controllers: [AccessControlController],
  providers: [AccessControlService],
})
export class AccessControlModule {}
