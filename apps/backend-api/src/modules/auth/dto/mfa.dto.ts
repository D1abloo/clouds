import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class MfaSetupDto {
  @ApiProperty({ description: 'Enable or disable MFA for the current user' })
  @IsBoolean()
  enabled: boolean

  @ApiProperty({ required: false, description: 'Vault reference for TOTP secret (never plain secret)' })
  @IsOptional()
  @IsString()
  secretRef?: string
}
