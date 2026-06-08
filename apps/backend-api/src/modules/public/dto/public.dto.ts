import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class PublicRegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  firstName: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  lastName: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  company: string

  @ApiProperty()
  @IsEmail({}, { message: 'Introduce un email profesional válido' })
  email: string

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir letras y números',
  })
  password: string

  @ApiProperty()
  @IsBoolean()
  acceptTerms: boolean

  @ApiProperty()
  @IsBoolean()
  acceptPrivacy: boolean

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean

  /** Honeypot — debe permanecer vacío */
  @IsOptional()
  @IsString()
  website?: string
}

export class ResendVerificationDto {
  @ApiProperty()
  @IsEmail()
  email: string
}

export class VerifyEmailQueryDto {
  @ApiProperty()
  @IsString()
  token: string
}

export class ContactFormDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string

  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  @MinLength(3)
  subject: string

  @ApiProperty()
  @IsIn(['general', 'ventas', 'soporte', 'partners', 'otro'])
  reason: string

  @ApiProperty()
  @IsString()
  @MinLength(10)
  message: string

  @IsOptional()
  @IsString()
  website?: string
}
