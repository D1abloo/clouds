import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LaunchInstanceDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsString()
  region: string

  @ApiProperty()
  @IsString()
  instanceType: string

  @ApiProperty()
  @IsString()
  imageId: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subnetId?: string

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  securityGroupIds?: string[]

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  tags?: Record<string, string>

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  availabilityZone?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resourceGroup?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyPair?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  publicIp?: boolean

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(16384)
  diskGb?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  diskType?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userData?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  monitoring?: boolean
}
