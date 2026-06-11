import { ApiProperty } from '@nestjs/swagger'

export class PublicCloudAccountsStatsDto {
  @ApiProperty({ example: 3 })
  aws: number

  @ApiProperty({ example: 2 })
  gcp: number

  @ApiProperty({ example: 1 })
  azure: number

  @ApiProperty({ example: 6 })
  total: number
}

export class PublicStatsResponseDto {
  @ApiProperty({ example: 12 })
  organizations: number

  @ApiProperty({ example: 28 })
  users: number

  @ApiProperty({ type: PublicCloudAccountsStatsDto })
  cloudAccounts: PublicCloudAccountsStatsDto

  @ApiProperty({ example: 47, description: 'Instancias en estado RUNNING' })
  activeInstances: number

  @ApiProperty({ example: 156, description: 'Total de instancias registradas' })
  totalInstances: number

  @ApiProperty({ example: '99.9%', description: 'Disponibilidad de plataforma' })
  uptimePercent: string

  @ApiProperty({ example: '2026-06-10T12:00:00.000Z' })
  updatedAt: string
}
