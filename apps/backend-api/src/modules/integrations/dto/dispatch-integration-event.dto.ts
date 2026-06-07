import { IsIn, IsObject, IsOptional, IsString } from 'class-validator'

export class DispatchIntegrationEventDto {
  @IsString()
  eventType!: string

  @IsString()
  title!: string

  @IsString()
  body!: string

  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: 'info' | 'warning' | 'critical'

  @IsOptional()
  @IsString()
  source?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}
