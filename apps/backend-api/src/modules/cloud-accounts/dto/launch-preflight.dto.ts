import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { LaunchInstanceDto } from './launch-instance.dto'

export class LaunchPreflightDto extends LaunchInstanceDto {}

export type LaunchPreflightCheck = {
  id: string
  level: 'error' | 'warning' | 'ok'
  message: string
  field?: string
  suggestion?: string
}

export type LaunchPreflightResult = {
  valid: boolean
  checks: LaunchPreflightCheck[]
  resolvedSubnetId?: string
  resolvedVpcId?: string
}

export class CreateSubnetDto {
  @ApiProperty()
  @IsString()
  region: string

  @ApiProperty()
  @IsString()
  vpcId: string

  @ApiProperty()
  @IsString()
  availabilityZone: string

  @ApiProperty()
  @IsString()
  cidrBlock: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  mapPublicIpOnLaunch?: boolean
}
