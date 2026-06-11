import { DescribeImagesCommand, type EC2Client, type InstanceTypeInfo } from '@aws-sdk/client-ec2'
import type { CloudImage } from '../cloud-provider.adapter'

const QUICK_START_SPECS: Array<{
  name: string
  owners: string[]
  nameWildcards: string[]
  os: string
  architecture: string
}> = [
  {
    name: 'Amazon Linux 2023',
    owners: ['amazon'],
    nameWildcards: ['al2023-ami-*-kernel-*-x86_64'],
    os: 'Linux/UNIX',
    architecture: 'x86_64',
  },
  {
    name: 'Amazon Linux 2',
    owners: ['amazon'],
    nameWildcards: ['amzn2-ami-hvm-*-x86_64-gp2'],
    os: 'Linux/UNIX',
    architecture: 'x86_64',
  },
  {
    name: 'Ubuntu Server 24.04 LTS',
    owners: ['099720109477'],
    nameWildcards: ['ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*'],
    os: 'Linux/UNIX',
    architecture: 'x86_64',
  },
  {
    name: 'Ubuntu Server 22.04 LTS',
    owners: ['099720109477'],
    nameWildcards: ['ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*'],
    os: 'Linux/UNIX',
    architecture: 'x86_64',
  },
  {
    name: 'Debian 12',
    owners: ['131827586825'],
    nameWildcards: ['debian-12-amd64-*'],
    os: 'Linux/UNIX',
    architecture: 'x86_64',
  },
  {
    name: 'Red Hat Enterprise Linux 9',
    owners: ['309956199498'],
    nameWildcards: ['RHEL-9*'],
    os: 'Linux/UNIX',
    architecture: 'x86_64',
  },
  {
    name: 'Windows Server 2022 Base',
    owners: ['801119249231'],
    nameWildcards: ['Windows_Server-2022-English-Full-Base-*'],
    os: 'Windows',
    architecture: 'x86_64',
  },
]

export const isValidAwsAmiId = (id: string): boolean => /^ami-[0-9a-f]{8,17}$/i.test(id)

type DescribeImageRow = {
  ImageId?: string
  State?: string
  CreationDate?: string
  Description?: string
  Name?: string
}

const pickLatestImage = (images: DescribeImageRow[] | undefined): DescribeImageRow | undefined =>
  (images ?? [])
    .filter((img) => img.ImageId && (img.State ?? 'available') === 'available')
    .sort((a, b) => (b.CreationDate ?? '').localeCompare(a.CreationDate ?? ''))[0]

export const fetchQuickStartAmis = async (ec2: EC2Client, region: string): Promise<CloudImage[]> => {
  const results: CloudImage[] = []
  const seen = new Set<string>()

  for (const spec of QUICK_START_SPECS) {
    for (const wildcard of spec.nameWildcards) {
      try {
        const res = await ec2.send(
          new DescribeImagesCommand({
            Owners: spec.owners,
            Filters: [
              { Name: 'name', Values: [wildcard] },
              { Name: 'state', Values: ['available'] },
              { Name: 'architecture', Values: [spec.architecture] },
            ],
          }),
        )
        const best = pickLatestImage(res.Images)
        if (!best?.ImageId || seen.has(best.ImageId)) continue
        seen.add(best.ImageId)
        results.push({
          id: best.ImageId,
          name: spec.name,
          region,
          os: spec.os,
          architecture: spec.architecture,
          status: 'available',
          description: best.Description ?? best.Name,
        })
        break
      } catch {
        /* try next wildcard */
      }
    }
  }

  return results
}

export const mapDescribeImages = (
  images: Array<{
    ImageId?: string
    Name?: string
    PlatformDetails?: string
    Platform?: string
    Architecture?: string
    State?: string
    Description?: string
  }>,
  region: string,
): CloudImage[] =>
  images
    .filter((img) => img.ImageId && isValidAwsAmiId(img.ImageId) && (img.State ?? 'available') === 'available')
    .map((img) => ({
      id: img.ImageId!,
      name: img.Name ?? img.ImageId!,
      region,
      os: img.PlatformDetails ?? img.Platform ?? 'Linux/UNIX',
      architecture: img.Architecture ?? 'x86_64',
      status: 'available',
      description: img.Description,
    }))

export type AwsInstanceTypeRow = InstanceTypeInfo
