const ipToInt = (ip: string): number => {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return 0
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

const intToIp = (n: number): string =>
  [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')

const parseCidr = (cidr: string): { network: number; prefix: number; mask: number } | null => {
  const [ip, prefixStr] = cidr.trim().split('/')
  const prefix = Number(prefixStr)
  if (!ip || !Number.isFinite(prefix) || prefix < 0 || prefix > 32) return null
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  return { network: ipToInt(ip) & mask, prefix, mask }
}

export const cidrOverlaps = (a: string, b: string): boolean => {
  const ca = parseCidr(a)
  const cb = parseCidr(b)
  if (!ca || !cb) return false
  const minPrefix = Math.min(ca.prefix, cb.prefix)
  const mask = minPrefix === 0 ? 0 : (~0 << (32 - minPrefix)) >>> 0
  return (ca.network & mask) === (cb.network & mask)
}

export const isCidrWithinVpc = (subnetCidr: string, vpcCidr: string): boolean => {
  const sub = parseCidr(subnetCidr)
  const vpc = parseCidr(vpcCidr)
  if (!sub || !vpc) return false
  return (sub.network & vpc.mask) === vpc.network && sub.prefix >= vpc.prefix
}

/** Suggest a /24 block inside the VPC that does not overlap existing subnets. */
export const suggestSubnetCidr = (vpcCidr: string | undefined, existing: string[]): string => {
  const vpc = parseCidr(vpcCidr ?? '10.0.0.0/16')
  if (!vpc) return '10.0.1.0/24'

  const used = existing.filter(Boolean)
  const baseThird = (vpc.network >>> 8) & 255
  const baseSecond = (vpc.network >>> 16) & 255
  const baseFirst = (vpc.network >>> 24) & 255

  for (let third = 0; third < 256; third += 1) {
    const candidate = `${baseFirst}.${baseSecond}.${third}.0/24`
    if (!isCidrWithinVpc(candidate, `${intToIp(vpc.network)}/${vpc.prefix}`)) continue
    if (used.some((e) => cidrOverlaps(candidate, e))) continue
    if (third === baseThird && vpc.prefix >= 24) continue
    return candidate
  }

  for (let third = 1; third < 256; third += 1) {
    const candidate = `${baseFirst}.${baseSecond}.${third}.0/24`
    if (!isCidrWithinVpc(candidate, `${intToIp(vpc.network)}/${vpc.prefix}`)) continue
    if (used.some((e) => cidrOverlaps(candidate, e))) continue
    return candidate
  }

  return `${baseFirst}.${baseSecond}.250.0/24`
}

export const extractApiErrorMessage = (err: { error?: unknown; message?: string }): string => {
  const body = err.error
  if (body && typeof body === 'object') {
    const msg = (body as { message?: string | string[] }).message
    if (typeof msg === 'string') return msg
    if (Array.isArray(msg)) return msg.join('. ')
  }
  if (typeof body === 'string') return body
  return err.message ?? 'Error desconocido'
}
