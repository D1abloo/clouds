import { ApiPropertyOptional } from '@nestjs/swagger'
import { CopilotAiProvider, CopilotScopeMode } from '@prisma/client'
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class UpdateCopilotSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @ApiPropertyOptional({ enum: CopilotAiProvider })
  @IsOptional()
  @IsEnum(CopilotAiProvider)
  provider?: CopilotAiProvider

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string

  @ApiPropertyOptional({ description: 'Nueva clave API (solo se almacena cifrada)' })
  @IsOptional()
  @IsString()
  apiKey?: string

  @ApiPropertyOptional({ enum: CopilotScopeMode })
  @IsOptional()
  @IsEnum(CopilotScopeMode)
  scopeMode?: CopilotScopeMode

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowAutonomous?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowLaunch?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(16384)
  maxTokens?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemPrompt?: string
}
