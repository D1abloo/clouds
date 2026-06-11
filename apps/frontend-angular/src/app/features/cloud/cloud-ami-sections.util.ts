export type AwsImageSectionId =
  | 'quick_start'
  | 'amazon_linux'
  | 'ubuntu'
  | 'windows'
  | 'red_hat'
  | 'debian'
  | 'suse'
  | 'my_amis'
  | 'all'

export const AWS_IMAGE_SECTIONS: { id: AwsImageSectionId; label: string; logo?: string }[] = [
  { id: 'quick_start', label: 'Quick Start', logo: '/assets/logos/aws.svg' },
  { id: 'amazon_linux', label: 'Amazon Linux', logo: '/assets/logos/aws.svg' },
  { id: 'ubuntu', label: 'Ubuntu', logo: '/assets/logos/ubuntu.svg' },
  { id: 'windows', label: 'Windows', logo: '/assets/logos/windows.svg' },
  { id: 'red_hat', label: 'Red Hat', logo: '/assets/logos/redhat.svg' },
  { id: 'debian', label: 'Debian', logo: '/assets/logos/debian.svg' },
  { id: 'suse', label: 'SUSE', logo: '/assets/logos/suse.svg' },
  { id: 'my_amis', label: 'My AMIs', logo: '/assets/logos/aws.svg' },
  { id: 'all', label: 'All images' },
]

export const sanitizeAmiId = (id: string): string =>
  id.replace(/^\[+|\]+$/g, '').trim().replace(/^['"]|['"]$/g, '')

export const isValidAwsAmiId = (id: string): boolean => /^ami-[0-9a-f]{8,17}$/i.test(sanitizeAmiId(id))

export const sectionCount = (
  images: Array<{ category?: string }>,
  sectionId: AwsImageSectionId,
): number => {
  if (sectionId === 'all') return images.length
  return images.filter((i) => i.category === sectionId).length
}
