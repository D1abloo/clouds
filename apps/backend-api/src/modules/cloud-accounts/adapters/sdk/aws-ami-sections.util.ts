import { DescribeImagesCommand, type EC2Client } from '@aws-sdk/client-ec2'
import type { CloudImage } from '../cloud-provider.adapter'

export type AmiSectionId =
  | 'quick_start'
  | 'amazon_linux'
  | 'ubuntu'
  | 'windows'
  | 'red_hat'
  | 'debian'
  | 'suse'
  | 'other'
  | 'my_amis'

export type AmiSectionDef = {
  id: AmiSectionId
  label: string
  owners: string[]
  nameWildcards: string[]
  maxPerPattern?: number
}

const QUICK_START: AmiSectionDef['nameWildcards'] = [
  'al2023-ami-*-kernel-*-x86_64',
  'amzn2-ami-hvm-*-x86_64-gp2',
  'ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*',
  'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
  'debian-12-amd64-*',
  'Windows_Server-2022-English-Full-Base-*',
]

export const AWS_AMI_SECTIONS: AmiSectionDef[] = [
  {
    id: 'quick_start',
    label: 'Quick Start',
    owners: ['amazon', '099720109477', '131827586825', '801119249231'],
    nameWildcards: QUICK_START,
    maxPerPattern: 1,
  },
  {
    id: 'amazon_linux',
    label: 'Amazon Linux',
    owners: ['amazon'],
    nameWildcards: ['al2023-ami-*', 'amzn2-ami-*', 'amzn-ami-*'],
    maxPerPattern: 6,
  },
  {
    id: 'ubuntu',
    label: 'Ubuntu',
    owners: ['099720109477'],
    nameWildcards: ['ubuntu/images/hvm-ssd/ubuntu-*-amd64-server-*'],
    maxPerPattern: 8,
  },
  {
    id: 'windows',
    label: 'Windows',
    owners: ['801119249231'],
    nameWildcards: ['Windows_Server-*-English-*-Base-*'],
    maxPerPattern: 8,
  },
  {
    id: 'red_hat',
    label: 'Red Hat',
    owners: ['309956199498', '792107900819'],
    nameWildcards: ['RHEL-*', 'Red Hat Enterprise Linux*'],
    maxPerPattern: 6,
  },
  {
    id: 'debian',
    label: 'Debian',
    owners: ['131827586825'],
    nameWildcards: ['debian-*-amd64-*'],
    maxPerPattern: 6,
  },
  {
    id: 'suse',
    label: 'SUSE',
    owners: ['679593333126'],
    nameWildcards: ['suse-*', 'SUSE-*'],
    maxPerPattern: 4,
  },
  {
    id: 'other',
    label: 'Community AMIs',
    owners: ['amazon'],
    nameWildcards: ['*'],
    maxPerPattern: 0,
  },
  {
    id: 'my_amis',
    label: 'My AMIs',
    owners: ['self'],
    nameWildcards: ['*'],
    maxPerPattern: 32,
  },
]

type RawImage = {
  ImageId?: string
  Name?: string
  PlatformDetails?: string
  Platform?: string
  Architecture?: string
  State?: string
  Description?: string
  CreationDate?: string
}

export const sanitizeAmiId = (id: string): string =>
  id.replace(/^\[+|\]+$/g, '').trim().replace(/^['"]|['"]$/g, '')

export const isValidAwsAmiId = (id: string): boolean => /^ami-[0-9a-f]{8,17}$/i.test(sanitizeAmiId(id))

const toCloudImage = (img: RawImage, region: string, category: AmiSectionId): CloudImage | null => {
  const id = sanitizeAmiId(img.ImageId ?? '')
  if (!isValidAwsAmiId(id) || (img.State ?? 'available') !== 'available') return null
  return {
    id,
    name: img.Name ?? id,
    region,
    os: img.PlatformDetails ?? img.Platform ?? 'Linux/UNIX',
    architecture: img.Architecture ?? 'x86_64',
    status: 'available',
    description: img.Description,
    category,
  }
}

const pickLatest = (images: RawImage[], limit: number): RawImage[] =>
  images
    .filter((i) => i.ImageId && (i.State ?? 'available') === 'available')
    .sort((a, b) => (b.CreationDate ?? '').localeCompare(a.CreationDate ?? ''))
    .slice(0, limit)

const fetchByPattern = async (
  ec2: EC2Client,
  owners: string[],
  wildcard: string,
  limit: number,
): Promise<RawImage[]> => {
  if (wildcard === '*' && owners.includes('amazon')) return []
  const res = await ec2.send(
    new DescribeImagesCommand({
      Owners: owners,
      Filters: [
        { Name: 'state', Values: ['available'] },
        ...(wildcard !== '*' ? [{ Name: 'name', Values: [wildcard] }] : []),
      ],
    }),
  )
  return pickLatest(res.Images ?? [], limit)
}

export const fetchSectionAmis = async (
  ec2: EC2Client,
  region: string,
  section: AmiSectionDef,
): Promise<CloudImage[]> => {
  const out: CloudImage[] = []
  const seen = new Set<string>()
  const limit = section.maxPerPattern ?? 4

  if (section.id === 'other') return out

  if (section.id === 'my_amis') {
    try {
      const res = await ec2.send(
        new DescribeImagesCommand({
          Owners: ['self'],
          Filters: [{ Name: 'state', Values: ['available'] }],
        }),
      )
      for (const img of pickLatest(res.Images ?? [], limit)) {
        const row = toCloudImage(img, region, section.id)
        if (row && !seen.has(row.id)) {
          seen.add(row.id)
          out.push(row)
        }
      }
    } catch {
      /* empty */
    }
    return out
  }

  for (const owner of section.owners) {
    for (const wildcard of section.nameWildcards) {
      try {
        const batch = await fetchByPattern(ec2, [owner], wildcard, limit)
        for (const img of batch) {
          const row = toCloudImage(img, region, section.id)
          if (row && !seen.has(row.id)) {
            seen.add(row.id)
            out.push(row)
          }
        }
      } catch {
        /* try next */
      }
    }
  }

  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export const fetchAllAwsAmisBySection = async (ec2: EC2Client, region: string): Promise<CloudImage[]> => {
  const seen = new Set<string>()
  const merged: CloudImage[] = []

  for (const section of AWS_AMI_SECTIONS) {
    const rows = await fetchSectionAmis(ec2, region, section)
    for (const img of rows) {
      if (seen.has(img.id)) continue
      seen.add(img.id)
      merged.push(img)
    }
  }

  return merged
}

export const verifyAmiInRegion = async (ec2: EC2Client, amiId: string): Promise<boolean> => {
  const id = sanitizeAmiId(amiId)
  if (!isValidAwsAmiId(id)) return false
  try {
    const res = await ec2.send(new DescribeImagesCommand({ ImageIds: [id] }))
    const img = res.Images?.[0]
    return !!img && (img.State ?? 'available') === 'available'
  } catch {
    return false
  }
}
