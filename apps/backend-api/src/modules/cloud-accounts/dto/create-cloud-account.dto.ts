import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  credentialType?: string

  @ApiProperty({ required: false, description: 'Reference to Vault/Secret Manager, never plain secret' })
  @IsOptional()
  @IsString()
  secretRef?: string
}
