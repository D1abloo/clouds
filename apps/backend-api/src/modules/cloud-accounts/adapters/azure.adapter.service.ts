import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { CloudProvider, InstanceStatus } from '@prisma/client'
import {
  ActionResult,
  CloudAdapterContext,
  CloudImage,
  CloudInstance,
  CloudInstanceType,
  CloudNetwork,
  CloudProviderAdapter,
  CloudRegion,
  CloudSecurityGroup,
  LaunchInstanceInput,
  ValidationResult,
} from './cloud-provider.adapter'
import type { CreateSubnetDto, LaunchPreflightResult } from '../dto/launch-preflight.dto'
import {
  buildValidation,
  mockImages,
  mockInstanceTypes,
  mockNetworks,
  mockSecurityGroups,
  regionsFor,
  synthesizeInstances,
} from './cloud-adapter.helpers'
import {
  createAzureComputeClient,
  createAzureNetworkClient,
  createAzureSubscriptionClient,
  resolveAzureSubscriptionId,
} from './sdk/azure-client.factory'
import {
  instancesOnSyncError,
  isDemoMode,
  mapAzurePowerState,
  parseAzureResourceIds,
  resolveSyncedInstances,
  sdkErrorMessage,
} from './sdk/adapter-sdk.util'

const AZURE_PERMS = [
  'Microsoft.Compute/virtualMachines/read',
  'Microsoft.Compute/virtualMachines/start/action',
  'Microsoft.Compute/virtualMachines/powerOff/action',
]

const FALLBACK_REGIONS = [
  { id: 'westeurope', name: 'West Europe', zones: ['1', '2', '3'] },
  { id: 'eastus', name: 'East US', zones: ['1', '2'] },
  { id: 'spaincentral', name: 'Spain Central', zones: ['1'] },
]

@Injectable()
export class AzureAdapterService implements CloudProviderAdapter {
  private readonly logger = new Logger(AzureAdapterService.name)

  async validateConnection(ctx: CloudAdapterContext): Promise<ValidationResult> {
    if (isDemoMode(ctx)) return buildValidation(ctx, 'Azure', AZURE_PERMS)
    try {
      const subId = resolveAzureSubscriptionId(ctx)
      const client = createAzureSubscriptionClient(ctx)
      const sub = await client.subscriptions.get(subId)
      return {
        valid: !!sub.subscriptionId,
        message: `Azure connected — ${sub.displayName ?? subId}`,
        permissions: AZURE_PERMS,
        sdkReady: true,
      }
    } catch (err) {
      return {
        valid: false,
        message: sdkErrorMessage(err),
        permissions: AZURE_PERMS,
        sdkReady: true,
      }
    }
  }

  async listRegions(ctx: CloudAdapterContext): Promise<CloudRegion[]> {
    if (isDemoMode(ctx)) return regionsFor(ctx, FALLBACK_REGIONS)
    try {
      const subId = resolveAzureSubscriptionId(ctx)
      const client = createAzureSubscriptionClient(ctx)
      const locations = client.subscriptions.listLocations(subId)
      const items: { id: string; name: string; zones: string[] }[] = []
      for await (const loc of locations) {
        if (loc.name) items.push({ id: loc.name, name: loc.displayName ?? loc.name, zones: [] })
      }
      return regionsFor(ctx, items.length ? items : FALLBACK_REGIONS)
    } catch (err) {
      this.logger.warn(`Azure listRegions fallback: ${sdkErrorMessage(err)}`)
      return regionsFor(ctx, FALLBACK_REGIONS)
    }
  }

  async listNetworks(ctx: CloudAdapterContext, region?: string): Promise<CloudNetwork[]> {
    const r = region ?? ctx.defaultRegion ?? 'westeurope'
    if (isDemoMode(ctx)) return mockNetworks(ctx, r).map((n) => ({ ...n, type: 'vnet' }))
    try {
      const client = createAzureNetworkClient(ctx)
      const networks: CloudNetwork[] = []
      for await (const vnet of client.virtualNetworks.listAll()) {
        if (vnet.location !== r && region) continue
        networks.push({
          id: vnet.id ?? '',
          name: vnet.name ?? 'vnet',
          region: vnet.location ?? r,
          cidr: vnet.addressSpace?.addressPrefixes?.[0],
          type: 'vnet',
        })
      }
      return networks.length ? networks : mockNetworks(ctx, r).map((n) => ({ ...n, type: 'vnet' }))
    } catch (err) {
      this.logger.warn(`Azure listNetworks fallback: ${sdkErrorMessage(err)}`)
      return mockNetworks(ctx, r).map((n) => ({ ...n, type: 'vnet' }))
    }
  }

  async listSecurityGroups(ctx: CloudAdapterContext, region?: string): Promise<CloudSecurityGroup[]> {
    const r = region ?? ctx.defaultRegion ?? 'westeurope'
    if (isDemoMode(ctx)) return mockSecurityGroups(ctx, r).map((s) => ({ ...s, name: `nsg-${s.name}` }))
    try {
      const client = createAzureNetworkClient(ctx)
      const groups: CloudSecurityGroup[] = []
      for await (const nsg of client.networkSecurityGroups.listAll()) {
        if (nsg.location !== r && region) continue
        groups.push({
          id: nsg.id ?? '',
          name: nsg.name ?? 'nsg',
          region: nsg.location ?? r,
          rules: (nsg.securityRules?.length ?? 0) + (nsg.defaultSecurityRules?.length ?? 0),
        })
      }
      return groups.length ? groups : mockSecurityGroups(ctx, r).map((s) => ({ ...s, name: `nsg-${s.name}` }))
    } catch (err) {
      this.logger.warn(`Azure listSecurityGroups fallback: ${sdkErrorMessage(err)}`)
      return mockSecurityGroups(ctx, r).map((s) => ({ ...s, name: `nsg-${s.name}` }))
    }
  }

  async listImages(ctx: CloudAdapterContext, region: string): Promise<CloudImage[]> {
    if (isDemoMode(ctx)) {
      return mockImages(ctx, region).map((i) => ({
        ...i,
        id: `/subscriptions/${resolveAzureSubscriptionId(ctx) || 'demo'}/images/${i.id}`,
      }))
    }
    const operational: CloudImage[] = [
      { id: 'Canonical:ubuntu-22_04-lts:22_04-lts-gen2:latest', name: 'Ubuntu 22.04 LTS', region, os: 'linux', architecture: 'x86_64', status: 'available' },
      { id: 'Debian:debian-12:12-gen2:latest', name: 'Debian 12', region, os: 'linux', architecture: 'x86_64', status: 'available' },
      { id: 'MicrosoftWindowsServer:WindowsServer:2022-datacenter:latest', name: 'Windows Server 2022', region, os: 'windows', architecture: 'x86_64', status: 'available' },
      { id: 'RedHat:RHEL:9-lvm-gen2:latest', name: 'RHEL 9', region, os: 'linux', architecture: 'x86_64', status: 'available' },
      { id: 'Canonical:0001-com-ubuntu-server-jammy:22_04-lts-arm64:latest', name: 'Ubuntu 22.04 ARM64', region, os: 'linux', architecture: 'arm64', status: 'available' },
    ]
    return operational.length
      ? operational
      : mockImages(ctx, region).map((i) => ({
          ...i,
          id: `/subscriptions/${resolveAzureSubscriptionId(ctx) || 'demo'}/images/${i.id}`,
        }))
  }

  async listInstanceTypes(ctx: CloudAdapterContext, region: string): Promise<CloudInstanceType[]> {
    if (isDemoMode(ctx)) {
      return mockInstanceTypes(ctx, region).map((t) => ({
        ...t,
        id: `Standard_B${t.vcpus}s`,
        name: `Standard_B${t.vcpus}s`,
      }))
    }
    return [
      { id: 'Standard_B1s', name: 'Standard_B1s', region, vcpus: 1, memoryGb: 1, pricePerHour: 0.01 },
      { id: 'Standard_B2s', name: 'Standard_B2s', region, vcpus: 2, memoryGb: 4, pricePerHour: 0.04 },
      { id: 'Standard_D2s_v5', name: 'Standard_D2s_v5', region, vcpus: 2, memoryGb: 8, pricePerHour: 0.09 },
    ]
  }

  async listKeyPairs(_ctx: CloudAdapterContext, _region?: string): Promise<import('./cloud-provider.adapter').CloudKeyPair[]> {
    return []
  }

  async listInstances(ctx: CloudAdapterContext, region?: string): Promise<CloudInstance[]> {
    if (isDemoMode(ctx)) {
      const all = synthesizeInstances(ctx)
      return region ? all.filter((i) => i.region === region) : all
    }
    try {
      const client = createAzureComputeClient(ctx)
      const items: CloudInstance[] = []
      for await (const vm of client.virtualMachines.listAll()) {
        if (region && vm.location !== region) continue
        const power = vm.instanceView?.statuses?.find((s) => s.code?.startsWith('PowerState/'))?.code
        const { resourceGroup, name } = parseAzureResourceIds(vm.id ?? '')
        items.push({
          id: vm.id ?? name,
          name: vm.name ?? name,
          region: vm.location ?? 'unknown',
          status: mapAzurePowerState(power),
          instanceType: vm.hardwareProfile?.vmSize ?? 'unknown',
          provider: CloudProvider.AZURE,
          metadata: {
            resourceGroup,
            vmName: name,
            publicIp: undefined,
            privateIp: undefined,
            isDemo: false,
            syncedAt: new Date().toISOString(),
          },
        })
      }
      return resolveSyncedInstances(ctx, items, () => synthesizeInstances(ctx))
    } catch (err) {
      this.logger.warn(`Azure listInstances fallback: ${sdkErrorMessage(err)}`)
      return instancesOnSyncError(ctx, () => synthesizeInstances(ctx))
    }
  }

  async getInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<CloudInstance | null> {
    return (await this.listInstances(ctx, region)).find((i) => i.id === instanceId || i.name === instanceId) ?? null
  }

  private resolveVmRef = async (ctx: CloudAdapterContext, instanceId: string, region?: string) => {
    if (instanceId.includes('/subscriptions/')) {
      const parsed = parseAzureResourceIds(instanceId)
      return { resourceGroup: parsed.resourceGroup, vmName: parsed.name }
    }
    const inst = await this.getInstance(ctx, instanceId, region)
    const meta = (inst?.metadata ?? {}) as Record<string, string>
    return {
      resourceGroup: meta['resourceGroup'] ?? (ctx.config['resourceGroup'] as string) ?? 'cloudops-rg',
      vmName: meta['vmName'] ?? instanceId,
    }
  }

  async startInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    if (isDemoMode(ctx)) return { success: true, message: `[Azure Demo] Started ${instanceId}` }
    const { resourceGroup, vmName } = await this.resolveVmRef(ctx, instanceId, region)
    const client = createAzureComputeClient(ctx)
    await client.virtualMachines.beginStart(resourceGroup, vmName)
    return { success: true, message: `[Azure] Started ${vmName}` }
  }

  async stopInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    if (isDemoMode(ctx)) return { success: true, message: `[Azure Demo] Stopped ${instanceId}` }
    const { resourceGroup, vmName } = await this.resolveVmRef(ctx, instanceId, region)
    const client = createAzureComputeClient(ctx)
    await client.virtualMachines.beginPowerOff(resourceGroup, vmName, { skipShutdown: false })
    return { success: true, message: `[Azure] Stopped ${vmName}` }
  }

  async restartInstance(ctx: CloudAdapterContext, instanceId: string, region?: string): Promise<ActionResult> {
    if (isDemoMode(ctx)) return { success: true, message: `[Azure Demo] Restarted ${instanceId}` }
    const { resourceGroup, vmName } = await this.resolveVmRef(ctx, instanceId, region)
    const client = createAzureComputeClient(ctx)
    await client.virtualMachines.beginRestart(resourceGroup, vmName)
    return { success: true, message: `[Azure] Restarted ${vmName}` }
  }

  async launchInstance(ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<CloudInstance> {
    const resourceGroup = input.resourceGroup ?? (ctx.config['resourceGroup'] as string) ?? 'cloudops-rg'
    const launchMeta = {
      imageId: input.imageId,
      subnetId: input.subnetId,
      securityGroupIds: input.securityGroupIds,
      availabilityZone: input.availabilityZone,
      resourceGroup,
      keyPair: input.keyPair,
      publicIp: input.publicIp,
      diskGb: input.diskGb,
      diskType: input.diskType,
      userData: input.userData ? true : false,
      monitoring: input.monitoring,
      tags: input.tags,
    }

    if (isDemoMode(ctx)) {
      return {
        id: `vm-${Date.now().toString(36)}`,
        name: input.name,
        region: input.region,
        status: 'PENDING' as InstanceStatus,
        instanceType: input.instanceType,
        provider: ctx.provider,
        metadata: { ...launchMeta, isDemo: true },
      }
    }
    const client = createAzureComputeClient(ctx)
    const osProfile: Record<string, unknown> = {
      computerName: input.name,
      adminUsername: 'azureuser',
      adminPassword: `Co${Date.now()}!Aa1`,
    }
    if (input.userData) {
      osProfile.customData = Buffer.from(input.userData, 'utf8').toString('base64')
    }

    const osDisk = {
      createOption: 'FromImage' as const,
      ...(input.diskGb ? { diskSizeGB: input.diskGb } : {}),
      ...(input.diskType ? { managedDisk: { storageAccountType: input.diskType } } : {}),
    }

    const poller = await client.virtualMachines.beginCreateOrUpdate(resourceGroup, input.name, {
      location: input.region,
      hardwareProfile: { vmSize: input.instanceType },
      storageProfile: {
        imageReference: {
          publisher: 'Canonical',
          offer: '0001-com-ubuntu-server-jammy',
          sku: '22_04-lts-gen2',
          version: 'latest',
        },
        osDisk,
      },
      osProfile: osProfile as never,
      networkProfile: {
        networkInterfaces: input.subnetId ? [{ id: input.subnetId }] : [],
      },
      tags: input.tags,
    })
    const vm = await poller.pollUntilDone()
    return {
      id: vm.id ?? input.name,
      name: vm.name ?? input.name,
      region: vm.location ?? input.region,
      status: 'PENDING',
      instanceType: input.instanceType,
      provider: CloudProvider.AZURE,
      metadata: { ...launchMeta, vmName: vm.name, isDemo: false },
    }
  }

  async listAvailabilityZones(_ctx: CloudAdapterContext, region: string): Promise<string[]> {
    return [`${region}-1`, `${region}-2`, `${region}-3`]
  }

  async validateLaunchPreflight(_ctx: CloudAdapterContext, input: LaunchInstanceInput): Promise<LaunchPreflightResult> {
    const checks: LaunchPreflightResult['checks'] = []
    if (!input.region) checks.push({ id: 'region', level: 'error', message: 'Región requerida', field: 'region' })
    if (!input.instanceType) checks.push({ id: 'size', level: 'error', message: 'VM size requerido', field: 'instanceType' })
    if (!input.imageId) checks.push({ id: 'image', level: 'error', message: 'Imagen requerida', field: 'imageId' })
    if (checks.every((c) => c.level !== 'error')) {
      checks.push({ id: 'ok', level: 'ok', message: 'Configuración Azure válida' })
    }
    return { valid: !checks.some((c) => c.level === 'error'), checks }
  }

  async createSubnet(_ctx: CloudAdapterContext, _input: CreateSubnetDto): Promise<CloudNetwork> {
    throw new BadRequestException('Creación de subnet Azure desde el wizard — próximamente')
  }

  async syncInventory(ctx: CloudAdapterContext): Promise<CloudInstance[]> {
    return this.listInstances(ctx)
  }
}
