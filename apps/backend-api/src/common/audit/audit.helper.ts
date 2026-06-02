import { Injectable } from '@nestjs/common'
import { AuditService } from '../../modules/audit/audit.service'

@Injectable()
export class AuditInterceptorHelper {
  constructor(private auditService: AuditService) {}

  async logCritical(
    userId: string | undefined,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
  ) {
    await this.auditService.create({
      userId,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress,
    })
  }
}
