import type { CloudSlug } from './cloud-provider.data'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type CloudLaunchStepLayout = 'sidebar' | 'horizontal' | 'tabs'

export type CloudLaunchTheme = {
  slug: CloudSlug
  logo: NavLogoKey
  accent: string
  accentDark: string
  accentMuted: string
  headerBg: string
  headerText: string
  surfaceBg: string
  panelBg: string
  stepLayout: CloudLaunchStepLayout
  consoleTitle: string
  consoleSubtitle: string
  diskLabel: string
  diskType: string
  networkKind: string
  sgLabel: string
  computeLabel: string
  monitorLabel: string
  regionLabel: string
  cancelStyle: 'link' | 'button'
  primaryBtnClass: string
}

export const cloudLaunchTheme = (slug: CloudSlug): CloudLaunchTheme => {
  const map: Record<CloudSlug, CloudLaunchTheme> = {
    aws: {
      slug: 'aws',
      logo: 'aws',
      accent: '#ff9900',
      accentDark: '#ec7211',
      accentMuted: 'color-mix(in srgb, #ff9900 12%, #f2f3f3)',
      headerBg: '#232f3e',
      headerText: '#ffffff',
      surfaceBg: '#f2f3f3',
      panelBg: '#ffffff',
      stepLayout: 'sidebar',
      consoleTitle: 'Launch an instance',
      consoleSubtitle: 'EC2 Instance Launch Wizard',
      diskLabel: '30 GB',
      diskType: 'gp3 EBS',
      networkKind: 'VPC + subnet',
      sgLabel: 'Security group',
      computeLabel: 'EC2',
      monitorLabel: 'CloudWatch',
      regionLabel: 'AWS Region',
      cancelStyle: 'link',
      primaryBtnClass: 'cld__btn-primary--aws',
    },
    gcp: {
      slug: 'gcp',
      logo: 'gcp',
      accent: '#4285f4',
      accentDark: '#1a73e8',
      accentMuted: 'color-mix(in srgb, #4285f4 8%, #ffffff)',
      headerBg: '#ffffff',
      headerText: '#202124',
      surfaceBg: '#f8f9fa',
      panelBg: '#ffffff',
      stepLayout: 'tabs',
      consoleTitle: 'Create an instance',
      consoleSubtitle: 'Compute Engine',
      diskLabel: '30 GB',
      diskType: 'pd-balanced',
      networkKind: 'VPC network + subred',
      sgLabel: 'Firewall rules',
      computeLabel: 'Compute Engine',
      monitorLabel: 'Cloud Monitoring',
      regionLabel: 'Region',
      cancelStyle: 'button',
      primaryBtnClass: 'cld__btn-primary--gcp',
    },
    azure: {
      slug: 'azure',
      logo: 'azure',
      accent: '#0078d4',
      accentDark: '#005a9e',
      accentMuted: 'color-mix(in srgb, #0078d4 8%, #ffffff)',
      headerBg: '#0078d4',
      headerText: '#ffffff',
      surfaceBg: '#faf9f8',
      panelBg: '#ffffff',
      stepLayout: 'horizontal',
      consoleTitle: 'Create a virtual machine',
      consoleSubtitle: 'Azure Portal',
      diskLabel: '30 GB',
      diskType: 'Premium_LRS',
      networkKind: 'Virtual network + subnet',
      sgLabel: 'Network security group',
      computeLabel: 'Virtual Machine',
      monitorLabel: 'Azure Monitor',
      regionLabel: 'Region',
      cancelStyle: 'button',
      primaryBtnClass: 'cld__btn-primary--azure',
    },
    clouding: {
      slug: 'clouding',
      logo: 'clouding',
      accent: '#6366f1',
      accentDark: '#4f46e5',
      accentMuted: 'color-mix(in srgb, #6366f1 10%, #ffffff)',
      headerBg: 'linear-gradient(135deg, #312e81 0%, #4338ca 55%, #6366f1 140%)',
      headerText: '#ffffff',
      surfaceBg: '#f5f3ff',
      panelBg: '#ffffff',
      stepLayout: 'horizontal',
      consoleTitle: 'Lanzar instancia',
      consoleSubtitle: 'Clouding Panel',
      diskLabel: '40 GB',
      diskType: 'ssd-flex',
      networkKind: 'Red privada',
      sgLabel: 'Política de acceso',
      computeLabel: 'Instancia Clouding',
      monitorLabel: 'Clouding Metrics',
      regionLabel: 'Región',
      cancelStyle: 'button',
      primaryBtnClass: 'cld__btn-primary--clouding',
    },
  }
  return map[slug]
}
