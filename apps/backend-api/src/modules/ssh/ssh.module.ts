import { Module } from '@nestjs/common'
import { SshService } from './ssh.service'
import { SshController } from './ssh.controller'
import { SshGateway } from './ssh.gateway'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [AuditModule],
  controllers: [SshController],
  providers: [SshService, SshGateway],
  exports: [SshService],
})
export class SshModule {}
