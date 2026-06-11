import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsUUID } from 'class-validator'

export class CopilotChatDto {
  @ApiProperty()
  @IsString()
  message: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  threadId?: string
}
