import {
  AWS_ACCOUNT_ID_PATTERN,
  CLOUD_PROVIDER_CARDS,
  CLOUD_WIZARD_STEPS,
  FULL_WIZARD_STEPS,
  WIZARD_SUBTITLE,
  credentialTypeLabel,
  maskSecret,
} from './cloud-account-wizard.config'
import { buildCredentialsPayload, isWizardFormValid } from './cloud-account-wizard.validation'

const baseForm = (): Record<string, unknown> => ({
  name: 'Producción EU',
  accountId: '',
  defaultRegion: '',
  credentialType: 'iam_role',
  roleArn: '',
  externalId: '',
  accessKeyId: '',
  secretAccessKey: '',
  oidcProvider: '',
  serviceAccountJson: '',
  billingAccountId: '',
  organizationId: '',
  tenantId: '',
  clientId: '',
  clientSecret: '',
  managedIdentity: '',
  resourceGroup: '',
  apiToken: '',
  apiEmail: '',
  appKey: '',
  appSecret: '',
  consumerKey: '',
  kubeconfig: '',
  clusterUrl: '',
  bearerToken: '',
  dockerHost: '',
  dockerTlsCert: '',
  dockerTlsKey: '',
  dockerTlsCa: '',
  sshHost: '',
  sshUser: '',
  githubOrg: '',
  gitlabUrl: '',
  jenkinsUrl: '',
  jenkinsUser: '',
  terraformOrg: '',
  terraformHostname: '',
  encryptCredentials: true,
  syncOnCreate: true,
})

describe('cloud-account-wizard.config', () => {
  it('no incluye texto demo en pasos ni subtítulo', () => {
    expect(WIZARD_SUBTITLE.toLowerCase()).not.toContain('demo')
    expect(FULL_WIZARD_STEPS).toHaveSize(6)
    expect(CLOUD_WIZARD_STEPS.map((s) => s.label).join(' ').toLowerCase()).not.toContain('demo')
    for (const card of CLOUD_PROVIDER_CARDS) {
      const blob = JSON.stringify(card).toLowerCase()
      expect(blob).not.toContain('modo demo')
      expect(blob).not.toContain('sin sdk')
    }
  })

  it('credentialTypeLabel no expone opciones demo', () => {
    expect(credentialTypeLabel('AWS', 'iam_role')).toBe('IAM Role (ARN)')
    expect(credentialTypeLabel('AWS', 'demo')).toBe('demo')
  })

  it('maskSecret enmascara valores sensibles', () => {
    expect(maskSecret('supersecreto1234')).toMatch(/1234$/)
    expect(maskSecret('')).toBe('—')
  })
})

describe('cloud-account-wizard.validation', () => {
  it('valida AWS con account ID de 12 dígitos e IAM role', () => {
    const v = {
      ...baseForm(),
      accountId: '123456789012',
      defaultRegion: 'eu-west-1',
      credentialType: 'iam_role',
      roleArn: 'arn:aws:iam::123456789012:role/SpendlyxRead',
    }
    expect(AWS_ACCOUNT_ID_PATTERN.test(v.accountId as string)).toBe(true)
    expect(isWizardFormValid('AWS', v as never)).toBe(true)
  })

  it('rechaza AWS sin ARN cuando el método es iam_role', () => {
    const v = {
      ...baseForm(),
      accountId: '123456789012',
      defaultRegion: 'eu-west-1',
      credentialType: 'iam_role',
    }
    expect(isWizardFormValid('AWS', v as never)).toBe(false)
  })

  it('valida GCP con JSON de service account', () => {
    const v = {
      ...baseForm(),
      accountId: 'mi-proyecto',
      defaultRegion: 'europe-west1-b',
      credentialType: 'service_account',
      serviceAccountJson: '{"type":"service_account"}',
    }
    expect(isWizardFormValid('GCP', v as never)).toBe(true)
  })

  it('valida Azure con tenant y client secret', () => {
    const v = {
      ...baseForm(),
      accountId: '11111111-1111-1111-1111-111111111111',
      tenantId: '22222222-2222-2222-2222-222222222222',
      defaultRegion: 'westeurope',
      credentialType: 'client_secret',
      clientId: 'app-id',
      clientSecret: 'secret',
    }
    expect(isWizardFormValid('AZURE', v as never)).toBe(true)
  })

  it('valida Clouding con API token y región', () => {
    const v = {
      ...baseForm(),
      defaultRegion: 'eu-central',
      credentialType: 'api_token',
      apiToken: 'clouding-token',
    }
    expect(isWizardFormValid('CLOUDING', v as never)).toBe(true)
  })

  it('buildCredentialsPayload no incluye demoMode', () => {
    const v = {
      ...baseForm(),
      accountId: '123456789012',
      roleArn: 'arn:aws:iam::123456789012:role/X',
    }
    const payload = buildCredentialsPayload('AWS', v as never)
    expect(payload['demoMode']).toBeUndefined()
    expect(payload['encrypted']).toBe('true')
  })
})
