import { LaunchProvider } from '../../data/instance-pricing'

export interface LaunchInstanceFormState {
  provider: LaunchProvider
  accountId: string
  region: string
  instanceType: string
  name: string
  ami: string
  keyPair: string
  vpcId: string
  subnetId: string
  securityGroups: string[]
  ebsType: 'gp3' | 'io2' | 'gp2'
  ebsSizeGb: number
  ebsIops: number
  gcpFamily: 'general' | 'compute' | 'memory'
  gcpMachineType: string
  gcpVpc: string
  gcpSubnet: string
  gcpExternalIp: boolean
  gcpServiceAccount: string
  gcpDiskOs: string
  gcpDiskType: 'pd-balanced' | 'pd-ssd' | 'pd-extreme'
  gcpDiskSizeGb: number
  gcpStartupScript: string
  azureImage: string
  azureAuth: 'ssh' | 'password'
  azureSshKey: string
  azurePassword: string
  azureConfirmPassword: string
  azureResourceGroup: string
  azureVmSize: string
  azureVnet: string
  azureSubnet: string
  azureNsgMode: 'existing' | 'new'
  azureNsgName: string
  azureOsDisk: 'Standard_HDD' | 'Standard_SSD' | 'Premium_SSD'
}

export const DEFAULT_LAUNCH_FORM = (): LaunchInstanceFormState => ({
  provider: 'AWS',
  accountId: '',
  region: 'eu-west-1',
  instanceType: 't3.medium',
  name: 'web-prod-01',
  ami: 'Amazon Linux 2023',
  keyPair: 'my-ssh-key',
  vpcId: '',
  subnetId: '',
  securityGroups: ['sg-web'],
  ebsType: 'gp3',
  ebsSizeGb: 50,
  ebsIops: 3000,
  gcpFamily: 'general',
  gcpMachineType: 'e2-medium',
  gcpVpc: 'default',
  gcpSubnet: 'default',
  gcpExternalIp: true,
  gcpServiceAccount: 'default',
  gcpDiskOs: 'Ubuntu 22.04',
  gcpDiskType: 'pd-balanced',
  gcpDiskSizeGb: 50,
  gcpStartupScript: '',
  azureImage: 'Ubuntu Server 22.04',
  azureAuth: 'ssh',
  azureSshKey: '',
  azurePassword: '',
  azureConfirmPassword: '',
  azureResourceGroup: 'rg-cloudops',
  azureVmSize: 'Standard_B2s',
  azureVnet: '',
  azureSubnet: '',
  azureNsgMode: 'existing',
  azureNsgName: 'nsg-web',
  azureOsDisk: 'Premium_SSD',
})
