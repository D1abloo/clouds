import { Module } from '@nestjs/common'
import { PublicController } from './public.controller'
import { PublicService } from './public.service'
import { AuthModule } from '../auth/auth.module'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
