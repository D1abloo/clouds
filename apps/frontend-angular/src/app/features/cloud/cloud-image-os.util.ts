export type ImageOsVendor = 'amazon' | 'ubuntu' | 'debian' | 'windows' | 'redhat' | 'suse' | 'linux'

export type CloudImageLike = { name: string; os?: string }

export const resolveImageOsVendor = (img: CloudImageLike): ImageOsVendor => {
  const n = `${img.name} ${img.os ?? ''}`.toLowerCase()
  if (n.includes('windows')) return 'windows'
  if (n.includes('ubuntu')) return 'ubuntu'
  if (n.includes('debian')) return 'debian'
  if (n.includes('red hat') || n.includes('rhel') || n.includes('rocky') || n.includes('alma')) return 'redhat'
  if (n.includes('suse')) return 'suse'
  if (n.includes('amazon') || n.includes('al2') || n.includes('al202')) return 'amazon'
  return 'linux'
}

const LOGO_BY_VENDOR: Record<ImageOsVendor, string> = {
  amazon: '/assets/logos/aws.svg',
  ubuntu: '/assets/logos/ubuntu.svg',
  debian: '/assets/logos/debian.svg',
  windows: '/assets/logos/windows.svg',
  redhat: '/assets/logos/redhat.svg',
  suse: '/assets/logos/suse.svg',
  linux: '/assets/logos/linux.svg',
}

export const imageOsLogoSrc = (img: CloudImageLike): string => LOGO_BY_VENDOR[resolveImageOsVendor(img)]

export const imageOsLabel = (img: CloudImageLike): string => {
  const v = resolveImageOsVendor(img)
  const labels: Record<ImageOsVendor, string> = {
    amazon: 'Amazon Linux',
    ubuntu: 'Ubuntu',
    debian: 'Debian',
    windows: 'Windows Server',
    redhat: 'Red Hat',
    suse: 'SUSE',
    linux: 'Linux',
  }
  return labels[v]
}

export const isCloudImageAvailable = (status?: string): boolean => {
  const s = (status ?? 'available').toLowerCase()
  return s === 'available' || s === 'ready'
}

export { sanitizeAmiId, isValidAwsAmiId } from './cloud-ami-sections.util'
