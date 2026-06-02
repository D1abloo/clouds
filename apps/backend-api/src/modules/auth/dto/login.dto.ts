import { IsEmail, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'admin@cloudops.local' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(8)
  password: string
}

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty({ required: false })
  @IsString()
  name?: string
}
