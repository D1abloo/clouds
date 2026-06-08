import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ValidateVpsPreviewDto {
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
}
