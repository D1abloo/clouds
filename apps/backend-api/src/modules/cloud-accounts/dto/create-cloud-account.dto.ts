import { IsEnum, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'
import { Type } from 'class-transformer'

export class CloudAccountCredentialsDto {
  @ApiProperty({ required: false, example: 'iam_role' })
  @IsOptional()
  @IsString()
  credentialType?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  roleArn?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  externalId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accessKeyId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secretAccessKey?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  oidcProvider?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serviceAccountJson?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenantId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientSecret?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  managedIdentity?: string

  @ApiProperty({ required: false, description: 'Use demo credentials without real SDK' })
  @IsOptional()
  @IsString()
  demoMode?: string
}

export class CreateCloudAccountDto {
  @ApiProperty()
  @IsUUID()
  projectId: string

  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty({ enum: CloudProvider })
  @IsEnum(CloudProvider)
  provider: CloudProvider

  @ApiProperty({ required: false, description: 'AWS Account ID / GCP Project ID / Azure Subscription ID' })
  @IsOptional()
  @IsString()
  accountId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  defaultRegion?: string

  @ApiProperty({ required: false, description: 'Provider-specific config (billing, resource group, etc.)' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>

  @ApiProperty({ type: CloudAccountCredentialsDto })
  @ValidateNested()
  @Type(() => CloudAccountCredentialsDto)
  credentials: CloudAccountCredentialsDto
}
