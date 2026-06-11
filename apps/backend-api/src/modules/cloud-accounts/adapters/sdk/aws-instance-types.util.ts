import { DescribeInstanceTypesCommand, type EC2Client } from '@aws-sdk/client-ec2'
import type { AwsInstanceTypeRow } from './aws-ami-catalog.util'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
let cachedRows: AwsInstanceTypeRow[] | null = null
let cachedAt = 0

export const fetchAllAwsInstanceTypes = async (ec2: EC2Client): Promise<AwsInstanceTypeRow[]> => {
  if (cachedRows && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedRows
  }

  const all: AwsInstanceTypeRow[] = []
  let nextToken: string | undefined

  do {
    const res = await ec2.send(
      new DescribeInstanceTypesCommand({
        MaxResults: 100,
        NextToken: nextToken,
      }),
    )
    all.push(...(res.InstanceTypes ?? []))
    nextToken = res.NextToken
  } while (nextToken)

  const sorted = all
    .filter((t) => t.InstanceType)
    .sort((a, b) => (a.InstanceType ?? '').localeCompare(b.InstanceType ?? ''))

  if (sorted.length) {
    cachedRows = sorted
    cachedAt = Date.now()
  }

  return sorted
}
