import { IsInt, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateVpsDto {
  @ApiProperty()
  @IsUUID()
  projectId: string

  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsString()
  hostname: string

  @ApiProperty({ required: false, default: 22 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number

  @ApiProperty()
  @IsString()
  username: string

  @ApiProperty({ required: false, description: 'Vault reference for SSH private key' })
  @IsOptional()
  @IsString()
  sshKeyRef?: string

  @ApiProperty({ required: false, description: 'Provider, OS, environment, tags, etc.' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

export class ExecuteCommandDto {
  @ApiProperty()
  @IsString()
  command: string

  @ApiProperty({ required: false })
  @IsOptional()
  confirmed?: boolean
}
