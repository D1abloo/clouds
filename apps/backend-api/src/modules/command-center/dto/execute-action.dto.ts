import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'

export enum CommandCenterActionType {
  RESTART_INSTANCE = 'restart-instance',
  SCALE_DEPLOYMENT = 'scale-deployment',
  TERRAFORM_PLAN = 'terraform-plan',
  JENKINS_BUILD = 'jenkins-build',
  VPS_BACKUP = 'vps-backup',
  SYNC_INVENTORY = 'sync-inventory',
}

export class ExecuteActionDto {
  @ApiProperty({ enum: CommandCenterActionType })
  @IsEnum(CommandCenterActionType)
  type!: CommandCenterActionType

  @ApiPropertyOptional({ description: 'Resource name or id (instance, deployment, account, job…)' })
  @IsOptional()
  @IsString()
  resource?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  namespace?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  replicas?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cloudAccountId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jenkinsServerId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobName?: string
}
