import { IsOptional, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class DetectRuntimeDto {
  @ApiProperty({ required: false, description: 'Probe Docker Engine on host' })
  @IsOptional()
  probeDocker?: boolean

  @ApiProperty({ required: false, description: 'Probe Kubernetes / kubelet on host' })
  @IsOptional()
  probeKubernetes?: boolean
}

export class DetectOsPreviewDto {
  @ApiProperty()
  @IsString()
  hostname: string

  @ApiProperty({ required: false })
  @IsOptional()
  port?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string
}
