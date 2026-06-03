import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'

export class LaunchInstanceTerraformEstimateDto {
  @ApiProperty({ enum: CloudProvider })
  @IsEnum(CloudProvider)
  provider: CloudProvider

  @ApiProperty()
  @IsString()
  region: string

  @ApiProperty()
  @IsString()
  instanceType: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  cloudAccountId?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>
}

export class LaunchInstanceTerraformPlanDto extends LaunchInstanceTerraformEstimateDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workspaceName?: string
}

export class LaunchInstanceTerraformApplyDto {
  @ApiProperty()
  @IsUUID()
  runId: string

  @ApiProperty()
  @IsBoolean()
  confirmed: boolean
}
