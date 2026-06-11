import type { ConnectionProviderId, WizardStep } from './cloud-account-wizard.config'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type CloudAccountWizardTheme = {
  logo: NavLogoKey
  accent: string
  accentDark: string
  headerBg: string
  title: string
  eyebrow: string
}

const DEFAULT_THEME: CloudAccountWizardTheme = {
  logo: 'aws',
  accent: '#0284c7',
  accentDark: '#0369a1',
  headerBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0284c7 160%)',
  title: 'Conectar integración',
  eyebrow: 'Spendlyx · Integraciones',
}

const PROVIDER_THEMES: Partial<Record<ConnectionProviderId, Omit<CloudAccountWizardTheme, 'title' | 'eyebrow'>>> = {
  AWS: {
    logo: 'aws',
    accent: '#ff9900',
    accentDark: '#ec7211',
    headerBg: 'linear-gradient(135deg, #232f3e 0%, #131a22 55%, #ff9900 180%)',
  },
  GCP: {
    logo: 'gcp',
    accent: '#4285f4',
    accentDark: '#1a73e8',
    headerBg: 'linear-gradient(135deg, #1a237e 0%, #174ea6 50%, #34a853 120%)',
  },
  AZURE: {
    logo: 'azure',
    accent: '#0078d4',
    accentDark: '#005a9e',
    headerBg: 'linear-gradient(135deg, #0078d4 0%, #004578 60%, #50e6ff 160%)',
  },
  CLOUDING: {
    logo: 'clouding',
    accent: '#6366f1',
    accentDark: '#4f46e5',
    headerBg: 'linear-gradient(135deg, #312e81 0%, #4338ca 55%, #818cf8 140%)',
  },
  DIGITALOCEAN: {
    logo: 'digitalocean',
    accent: '#0080ff',
    accentDark: '#0069d9',
    headerBg: 'linear-gradient(135deg, #031b4e 0%, #0080ff 120%)',
  },
  HETZNER: {
    logo: 'hetzner',
    accent: '#d50c2d',
    accentDark: '#b30a26',
    headerBg: 'linear-gradient(135deg, #1a1a1a 0%, #d50c2d 140%)',
  },
  KUBERNETES: {
    logo: 'kubernetes',
    accent: '#326ce5',
    accentDark: '#2554b8',
    headerBg: 'linear-gradient(135deg, #1a237e 0%, #326ce5 120%)',
  },
  DOCKER: {
    logo: 'docker',
    accent: '#2496ed',
    accentDark: '#1d7ec4',
    headerBg: 'linear-gradient(135deg, #0b3954 0%, #2496ed 130%)',
  },
  GITHUB: {
    logo: 'github',
    accent: '#24292f',
    accentDark: '#57606a',
    headerBg: 'linear-gradient(135deg, #0d1117 0%, #30363d 120%)',
  },
  GITLAB: {
    logo: 'gitlab',
    accent: '#fc6d26',
    accentDark: '#e24329',
    headerBg: 'linear-gradient(135deg, #380d00 0%, #fc6d26 130%)',
  },
}

export const WIZARD_STEP_ICONS: Record<WizardStep, string> = {
  provider: 'cloud',
  method: 'key',
  credentials: 'badge',
  validate: 'verified',
  resources: 'widgets',
  finish: 'check_circle',
}

export const cloudAccountWizardTheme = (
  provider: ConnectionProviderId | null,
  providerName?: string,
): CloudAccountWizardTheme => {
  if (!provider) return DEFAULT_THEME
  const base = PROVIDER_THEMES[provider]
  if (!base) return DEFAULT_THEME
  return {
    ...base,
    title: providerName ? `Conectar ${providerName}` : DEFAULT_THEME.title,
    eyebrow: 'Spendlyx · Nueva conexión',
  }
}
