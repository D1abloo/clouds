import { IsArray, IsObject, IsOptional, IsString } from 'class-validator'
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
}
