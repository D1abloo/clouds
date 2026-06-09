import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator'

export class CreateUserShortcutDto {
  @IsString()
  @MinLength(1)
  route!: string

  @IsString()
  @MinLength(1)
  label!: string

  @IsOptional()
  @IsString()
  section?: string

  @IsOptional()
  @IsString()
  icon?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number

  @IsOptional()
  @IsString()
  organizationId?: string
}
