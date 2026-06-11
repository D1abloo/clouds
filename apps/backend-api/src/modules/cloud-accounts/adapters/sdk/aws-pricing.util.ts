/** On-demand Linux USD/hour (aprox.) — us-east-1; otras regiones × factor regional. */
const BASE_USD_HOUR: Record<string, number> = {
  't2.nano': 0.0058,
  't2.micro': 0.0116,
  't2.small': 0.023,
  't2.medium': 0.0464,
  't3.nano': 0.0052,
  't3.micro': 0.0104,
  't3.small': 0.0208,
  't3.medium': 0.0416,
  't3.large': 0.0832,
  't3.xlarge': 0.1664,
  't3.2xlarge': 0.3328,
  't3a.micro': 0.0094,
  't3a.small': 0.0188,
  't3a.medium': 0.0376,
  't3a.large': 0.0752,
  'm5.large': 0.096,
  'm5.xlarge': 0.192,
  'm5.2xlarge': 0.384,
  'm6i.large': 0.096,
  'm6i.xlarge': 0.192,
  'c5.large': 0.085,
  'c5.xlarge': 0.17,
  'c6i.large': 0.085,
  'r5.large': 0.126,
  'r6i.large': 0.126,
}

const REGION_FACTOR: Record<string, number> = {
  'us-east-1': 1,
  'us-east-2': 1,
  'us-west-2': 1,
  'eu-west-1': 1.1,
  'eu-west-2': 1.12,
  'eu-west-3': 1.14,
  'eu-central-1': 1.15,
  'eu-south-2': 1.08,
  'ap-southeast-1': 1.18,
}

const regionFactor = (region: string): number => REGION_FACTOR[region] ?? 1.12

const estimateFromSpecs = (vcpus: number, memoryGb: number): number => {
  return Math.round((0.012 * vcpus + 0.006 * memoryGb) * 10000) / 10000
}

export const awsOnDemandPricePerHour = (instanceType: string, region: string, vcpus = 2, memoryGb = 4): number => {
  const base = BASE_USD_HOUR[instanceType] ?? estimateFromSpecs(vcpus, memoryGb)
  return Math.round(base * regionFactor(region) * 10000) / 10000
}

export const awsPricePerMinute = (hourly: number): number => Math.round((hourly / 60) * 1000000) / 1000000
