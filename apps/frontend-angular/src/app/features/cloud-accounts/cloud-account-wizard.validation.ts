import {
  AWS_ACCOUNT_ID_PATTERN,
  credentialTypeLabel,
  providerCard,
  type ConnectionProviderId,
} from './cloud-account-wizard.config'

export type WizardFormValue = {
  name: string
  accountId: string
  defaultRegion: string
  credentialType: string
  roleArn: string
  externalId: string
  accessKeyId: string
  secretAccessKey: string
  oidcProvider: string
  serviceAccountJson: string
  billingAccountId: string
  organizationId: string
  tenantId: string
  clientId: string
  clientSecret: string
  managedIdentity: string
  resourceGroup: string
  apiToken: string
  apiEmail: string
  appKey: string
  appSecret: string
  consumerKey: string
  kubeconfig: string
  clusterUrl: string
  bearerToken: string
  dockerHost: string
  dockerTlsCert: string
  dockerTlsKey: string
  dockerTlsCa: string
  sshHost: string
  sshUser: string
  githubOrg: string
  gitlabUrl: string
  jenkinsUrl: string
  jenkinsUser: string
  terraformOrg: string
  terraformHostname: string
  encryptCredentials: boolean
  syncOnCreate: boolean
}

export const isWizardFormValid = (prov: ConnectionProviderId, v: WizardFormValue): boolean => {
  if (!v.name?.trim()) return false

  switch (prov) {
    case 'AWS': {
      if (!AWS_ACCOUNT_ID_PATTERN.test(v.accountId?.trim() ?? '')) return false
      if (v.credentialType === 'iam_role' && !v.roleArn?.trim()) return false
      if (v.credentialType === 'access_key' && (!v.accessKeyId?.trim() || !v.secretAccessKey?.trim())) return false
      if (v.credentialType === 'oidc' && !v.oidcProvider?.trim()) return false
      return !!v.defaultRegion?.trim()
    }
    case 'GCP': {
      if (!v.accountId?.trim()) return false
      if (v.credentialType === 'service_account' && !v.serviceAccountJson?.trim()) return false
      if (v.credentialType === 'workload_identity' && !v.oidcProvider?.trim()) return false
      return !!v.defaultRegion?.trim()
    }
    case 'AZURE': {
      if (!v.accountId?.trim() || !v.tenantId?.trim()) return false
      if (v.credentialType === 'client_secret' && (!v.clientId?.trim() || !v.clientSecret?.trim())) return false
      if (v.credentialType === 'managed_identity' && !v.managedIdentity?.trim()) return false
      return !!v.defaultRegion?.trim()
    }
    case 'DIGITALOCEAN':
    case 'HETZNER':
    case 'LINODE':
    case 'IONOS':
    case 'VULTR':
    case 'SCALEWAY':
    case 'CLOUDING':
      return !!v.apiToken?.trim() && !!v.defaultRegion?.trim()
    case 'CLOUDFLARE':
      if (v.credentialType === 'global_key') return !!v.apiEmail?.trim() && !!v.apiToken?.trim()
      return !!v.apiToken?.trim()
    case 'OVH':
      return !!v.appKey?.trim() && !!v.appSecret?.trim() && !!v.consumerKey?.trim()
    case 'KUBERNETES':
      if (v.credentialType === 'kubeconfig') return !!v.kubeconfig?.trim()
      return !!v.clusterUrl?.trim() && !!v.bearerToken?.trim()
    case 'DOCKER':
      if (v.credentialType === 'ssh_tunnel') return !!v.sshHost?.trim() && !!v.sshUser?.trim()
      return !!v.dockerHost?.trim()
    case 'GITHUB':
      return !!v.apiToken?.trim() && !!v.githubOrg?.trim()
    case 'GITLAB':
      return !!v.apiToken?.trim() && !!v.gitlabUrl?.trim()
    case 'JENKINS':
      return !!v.jenkinsUrl?.trim() && !!v.jenkinsUser?.trim() && !!v.apiToken?.trim()
    case 'TERRAFORM':
      return !!v.apiToken?.trim() && !!v.terraformOrg?.trim()
    default:
      return false
  }
}

export const buildCredentialsPayload = (
  prov: ConnectionProviderId,
  v: WizardFormValue,
): Record<string, string | undefined> => {
  const base: Record<string, string | undefined> = {
    credentialType: v.credentialType,
    encrypted: v.encryptCredentials ? 'true' : 'false',
  }

  switch (prov) {
    case 'AWS':
      return {
        ...base,
        roleArn: v.roleArn || undefined,
        externalId: v.externalId || undefined,
        accessKeyId: v.accessKeyId || undefined,
        secretAccessKey: v.secretAccessKey || undefined,
        oidcProvider: v.oidcProvider || undefined,
      }
    case 'GCP':
      return {
        ...base,
        serviceAccountJson: v.serviceAccountJson || undefined,
        oidcProvider: v.oidcProvider || undefined,
      }
    case 'AZURE':
      return {
        ...base,
        tenantId: v.tenantId || undefined,
        clientId: v.clientId || undefined,
        clientSecret: v.clientSecret || undefined,
        managedIdentity: v.managedIdentity || undefined,
      }
    default:
      return {
        ...base,
        apiToken: v.apiToken || undefined,
        apiEmail: v.apiEmail || undefined,
        appKey: v.appKey || undefined,
        appSecret: v.appSecret || undefined,
        consumerKey: v.consumerKey || undefined,
        kubeconfig: v.kubeconfig || undefined,
        clusterUrl: v.clusterUrl || undefined,
        bearerToken: v.bearerToken || undefined,
        dockerHost: v.dockerHost || undefined,
        dockerTlsCert: v.dockerTlsCert || undefined,
        dockerTlsKey: v.dockerTlsKey || undefined,
        dockerTlsCa: v.dockerTlsCa || undefined,
        sshHost: v.sshHost || undefined,
        sshUser: v.sshUser || undefined,
        githubOrg: v.githubOrg || undefined,
        gitlabUrl: v.gitlabUrl || undefined,
        jenkinsUrl: v.jenkinsUrl || undefined,
        jenkinsUser: v.jenkinsUser || undefined,
        terraformOrg: v.terraformOrg || undefined,
        terraformHostname: v.terraformHostname || undefined,
      }
  }
}

export const buildConfigPayload = (prov: ConnectionProviderId, v: WizardFormValue): Record<string, unknown> => {
  const config: Record<string, unknown> = { integrationProvider: prov }

  if (prov === 'GCP') {
    if (v.billingAccountId) config['billingAccountId'] = v.billingAccountId
    if (v.organizationId) config['organizationId'] = v.organizationId
    if (v.accountId) config['projectId'] = v.accountId
  }
  if (prov === 'AZURE') {
    if (v.tenantId) config['tenantId'] = v.tenantId
    if (v.resourceGroup) config['resourceGroup'] = v.resourceGroup
  }
  if (prov === 'GITHUB' && v.githubOrg) config['organization'] = v.githubOrg
  if (prov === 'GITLAB' && v.gitlabUrl) config['baseUrl'] = v.gitlabUrl
  if (prov === 'JENKINS' && v.jenkinsUrl) config['baseUrl'] = v.jenkinsUrl
  if (prov === 'TERRAFORM') {
    if (v.terraformOrg) config['organization'] = v.terraformOrg
    if (v.terraformHostname) config['hostname'] = v.terraformHostname
  }

  return config
}

export const reviewSummaryLine = (prov: ConnectionProviderId, v: WizardFormValue): string => {
  const card = providerCard(prov)
  return `${card?.shortName ?? prov} · ${credentialTypeLabel(prov, v.credentialType)}`
}
