/** Catálogo estático amplio — respuesta inmediata si DescribeInstanceTypes falla o tarda. */
export type AwsStaticInstanceSpec = { id: string; vcpus: number; memoryGb: number }

const row = (family: string, size: string, vcpus: number, memoryGb: number): AwsStaticInstanceSpec => ({
  id: `${family}.${size}`,
  vcpus,
  memoryGb,
})

const burstable = (family: string): AwsStaticInstanceSpec[] => [
  row(family, 'nano', 2, 0.5),
  row(family, 'micro', 2, 1),
  row(family, 'small', 2, 2),
  row(family, 'medium', 2, 4),
  row(family, 'large', 2, 8),
  row(family, 'xlarge', 4, 16),
  row(family, '2xlarge', 8, 32),
]

const general = (family: string): AwsStaticInstanceSpec[] => [
  row(family, 'large', 2, 8),
  row(family, 'xlarge', 4, 16),
  row(family, '2xlarge', 8, 32),
  row(family, '4xlarge', 16, 64),
  row(family, '8xlarge', 32, 128),
  row(family, '12xlarge', 48, 192),
  row(family, '16xlarge', 64, 256),
  row(family, '24xlarge', 96, 384),
]

const compute = (family: string): AwsStaticInstanceSpec[] => [
  row(family, 'large', 2, 4),
  row(family, 'xlarge', 4, 8),
  row(family, '2xlarge', 8, 16),
  row(family, '4xlarge', 16, 32),
  row(family, '8xlarge', 32, 64),
  row(family, '12xlarge', 48, 96),
  row(family, '16xlarge', 64, 128),
  row(family, '24xlarge', 96, 192),
]

const memory = (family: string): AwsStaticInstanceSpec[] => [
  row(family, 'large', 2, 16),
  row(family, 'xlarge', 4, 32),
  row(family, '2xlarge', 8, 64),
  row(family, '4xlarge', 16, 128),
  row(family, '8xlarge', 32, 256),
  row(family, '12xlarge', 48, 384),
  row(family, '16xlarge', 64, 512),
  row(family, '24xlarge', 96, 768),
]

export const AWS_STATIC_INSTANCE_CATALOG: AwsStaticInstanceSpec[] = [
  ...burstable('t2'),
  ...burstable('t3'),
  ...burstable('t3a'),
  ...burstable('t4g'),
  ...general('m5'),
  ...general('m5a'),
  ...general('m5n'),
  ...general('m6i'),
  ...general('m6a'),
  ...general('m7i'),
  ...compute('c5'),
  ...compute('c5a'),
  ...compute('c5n'),
  ...compute('c6i'),
  ...compute('c6a'),
  ...compute('c7i'),
  ...memory('r5'),
  ...memory('r5a'),
  ...memory('r5n'),
  ...memory('r6i'),
  ...memory('r6a'),
  ...memory('r7i'),
  row('i3', 'large', 2, 15.25),
  row('i3', 'xlarge', 4, 30.5),
  row('i3', '2xlarge', 8, 61),
  row('i3', '4xlarge', 16, 122),
  row('i3', '8xlarge', 32, 244),
  row('i3', '16xlarge', 64, 488),
  row('g4dn', 'xlarge', 4, 16),
  row('g4dn', '2xlarge', 8, 32),
  row('g4dn', '4xlarge', 16, 64),
  row('g4dn', '8xlarge', 32, 128),
  row('g4dn', '12xlarge', 48, 192),
  row('g5', 'xlarge', 4, 16),
  row('g5', '2xlarge', 8, 32),
  row('g5', '4xlarge', 16, 64),
  row('g5', '8xlarge', 32, 128),
  row('g5', '12xlarge', 48, 192),
  row('g5', '16xlarge', 64, 256),
  row('g5', '24xlarge', 96, 384),
]
