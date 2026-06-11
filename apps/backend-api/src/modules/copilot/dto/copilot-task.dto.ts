import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

export class CreateCopilotTaskDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  prompt: string
}
