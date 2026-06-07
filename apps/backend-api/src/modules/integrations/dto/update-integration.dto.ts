import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator'

export class UpdateIntegrationDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[]
}
