import {
  CreateSubnetCommand,
  DescribeAvailabilityZonesCommand,
  DescribeImagesCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
  RunInstancesCommand,
  type EC2Client,
  type RunInstancesCommandInput,
} from '@aws-sdk/client-ec2'
import type { CloudNetwork, CloudSecurityGroup } from '../cloud-provider.adapter'
import type { LaunchInstanceInput } from '../cloud-provider.adapter'
import type { LaunchPreflightCheck, LaunchPreflightResult } from '../../dto/launch-preflight.dto'
import { sanitizeAmiId, verifyAmiInRegion } from './aws-ami-sections.util'

const isAwsDryRunSuccess = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false
  const name = (err as { name?: string }).name ?? ''
  const msg = err.message.toLowerCase()
  return name === 'DryRunOperation' || msg.includes('dryrunoperation') || msg.includes('dry run flag is set')
}

export type AwsSubnetRow = CloudNetwork & {
  availabilityZone: string
  vpcId: string
  mapPublicIpOnLaunch?: boolean
  isDefaultForAz?: boolean
}

export const listAwsAvailabilityZones = async (ec2: EC2Client, region: string): Promise<string[]> => {
  const res = await ec2.send(
    new DescribeAvailabilityZonesCommand({
      Filters: [{ Name: 'region-name', Values: [region] }, { Name: 'state', Values: ['available'] }],
    }),
  )
  return (res.AvailabilityZones ?? [])
    .map((z) => z.ZoneName ?? '')
    .filter(Boolean)
    .sort()
}

export const fetchAwsNetworks = async (ec2: EC2Client, region: string): Promise<AwsSubnetRow[]> => {
  const [vpcs, subnets] = await Promise.all([
    ec2.send(new DescribeVpcsCommand({})),
    ec2.send(new DescribeSubnetsCommand({})),
  ])

  const vpcName = (id: string): string =>
    vpcs.Vpcs?.find((v) => v.VpcId === id)?.Tags?.find((t) => t.Key === 'Name')?.Value ?? id

  const networks: AwsSubnetRow[] =
    vpcs.Vpcs?.map((v) => ({
      id: v.VpcId ?? '',
      name: v.Tags?.find((t) => t.Key === 'Name')?.Value ?? v.VpcId ?? 'vpc',
      region,
      cidr: v.CidrBlock,
      type: 'vpc',
      availabilityZone: '',
      vpcId: v.VpcId ?? '',
    })) ?? []

  subnets.Subnets?.forEach((s) => {
    if (!s.SubnetId) return
    const vpcId = s.VpcId ?? ''
    networks.push({
      id: s.SubnetId,
      name: s.Tags?.find((t) => t.Key === 'Name')?.Value ?? s.SubnetId,
      region,
      cidr: s.CidrBlock,
      type: 'subnet',
      availabilityZone: s.AvailabilityZone ?? '',
      vpcId,
      mapPublicIpOnLaunch: s.MapPublicIpOnLaunch,
      isDefaultForAz: s.DefaultForAz,
    })
  })

  return networks
}

export const subnetsForAz = (networks: AwsSubnetRow[], az: string): AwsSubnetRow[] =>
  networks.filter((n) => n.type === 'subnet' && n.availabilityZone === az)

export const pickSubnetForLaunch = (
  networks: AwsSubnetRow[],
  az: string,
  subnetId?: string,
): { subnetId?: string; vpcId?: string; issue?: string } => {
  const inAz = subnetsForAz(networks, az)
  if (subnetId?.startsWith('subnet-')) {
    const picked = networks.find((n) => n.id === subnetId && n.type === 'subnet')
    if (!picked) return { issue: `La subnet ${subnetId} no existe en esta región.` }
    if (picked.availabilityZone !== az) {
      return {
        issue: `La subnet ${subnetId} está en ${picked.availabilityZone}, no en ${az}.`,
        subnetId,
        vpcId: picked.vpcId,
      }
    }
    return { subnetId, vpcId: picked.vpcId }
  }

  const defaultSubnet = inAz.find((s) => s.isDefaultForAz)
  if (defaultSubnet) return { subnetId: defaultSubnet.id, vpcId: defaultSubnet.vpcId }

  if (!inAz.length) {
    const vpcsInRegion = networks.filter((n) => n.type === 'vpc')
    const vpcHint =
      vpcsInRegion.length === 0
        ? ' No hay VPCs en esta región — crea una VPC o elige otra región.'
        : ` Hay ${vpcsInRegion.length} VPC(s) en la región — crea una subnet en ${az} o cambia de zona.`
    return {
      issue: `No hay subnet por defecto en la zona ${az}.${vpcHint}`,
    }
  }

  return {
    issue: `No hay subnet por defecto en ${az}. Hay ${inAz.length} subnet(s) en la zona — selecciona una explícitamente o crea una nueva con IP pública.`,
    vpcId: inAz[0]?.vpcId,
  }
}

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

export const suggestSubnetCidr = (vpcCidr: string | undefined, existing: string[]): string => {
  const vpc = parseCidr(vpcCidr ?? '10.0.0.0/16')
  if (!vpc) return '10.0.1.0/24'
  const used = existing.filter(Boolean)
  const baseFirst = (vpc.network >>> 24) & 255
  const baseSecond = (vpc.network >>> 16) & 255
  const vpcLabel = `${intToIp(vpc.network)}/${vpc.prefix}`

  for (let third = 0; third < 256; third += 1) {
    const candidate = `${baseFirst}.${baseSecond}.${third}.0/24`
    if (!isCidrWithinVpc(candidate, vpcLabel)) continue
    if (used.some((e) => cidrOverlaps(candidate, e))) continue
    return candidate
  }
  return `${baseFirst}.${baseSecond}.250.0/24`
}

export const validateSubnetCidrForVpc = (
  cidrBlock: string,
  vpcCidr: string | undefined,
  existingInVpc: string[],
): { ok: boolean; message?: string; suggestion?: string } => {
  if (!parseCidr(cidrBlock)) {
    return { ok: false, message: `CIDR inválido: ${cidrBlock}` }
  }
  if (!vpcCidr) {
    return { ok: false, message: 'No se encontró el CIDR de la VPC seleccionada' }
  }
  if (!isCidrWithinVpc(cidrBlock, vpcCidr)) {
    return {
      ok: false,
      message: `El CIDR ${cidrBlock} no está dentro de la VPC (${vpcCidr})`,
      suggestion: suggestSubnetCidr(vpcCidr, existingInVpc),
    }
  }
  const overlap = existingInVpc.find((e) => cidrOverlaps(cidrBlock, e))
  if (overlap) {
    return {
      ok: false,
      message: `El CIDR ${cidrBlock} se solapa con la subnet existente ${overlap}`,
      suggestion: suggestSubnetCidr(vpcCidr, existingInVpc),
    }
  }
  return { ok: true }
}

export const createAwsSubnet = async (
  ec2: EC2Client,
  region: string,
  input: { vpcId: string; availabilityZone: string; cidrBlock: string; name?: string; mapPublicIpOnLaunch?: boolean },
): Promise<AwsSubnetRow> => {
  const res = await ec2.send(
    new CreateSubnetCommand({
      VpcId: input.vpcId,
      AvailabilityZone: input.availabilityZone,
      CidrBlock: input.cidrBlock,
      TagSpecifications: input.name
        ? [{ ResourceType: 'subnet', Tags: [{ Key: 'Name', Value: input.name }] }]
        : undefined,
    }),
  )
  const s = res.Subnet
  if (!s?.SubnetId) throw new Error('CreateSubnet did not return SubnetId')
  return {
    id: s.SubnetId,
    name: input.name ?? s.SubnetId,
    region,
    cidr: s.CidrBlock,
    type: 'subnet',
    availabilityZone: s.AvailabilityZone ?? input.availabilityZone,
    vpcId: input.vpcId,
    mapPublicIpOnLaunch: input.mapPublicIpOnLaunch ?? s.MapPublicIpOnLaunch,
    isDefaultForAz: s.DefaultForAz,
  }
}

const archForAmi = async (ec2: EC2Client, amiId: string): Promise<string | undefined> => {
  const res = await ec2.send(new DescribeImagesCommand({ ImageIds: [amiId] }))
  return res.Images?.[0]?.Architecture
}

export const buildRunInput = (
  input: LaunchInstanceInput,
  imageId: string,
  subnetId?: string,
  securityGroupIds?: string[],
): RunInstancesCommandInput => {
  const runInput: RunInstancesCommandInput = {
    ImageId: imageId,
    InstanceType: input.instanceType as RunInstancesCommandInput['InstanceType'],
    MinCount: 1,
    MaxCount: 1,
    KeyName: input.keyPair?.trim() || undefined,
    UserData: input.userData ? Buffer.from(input.userData, 'utf8').toString('base64') : undefined,
    Monitoring: { Enabled: input.monitoring ?? false },
    TagSpecifications: [{ ResourceType: 'instance', Tags: [{ Key: 'Name', Value: input.name }] }],
  }

  if (input.tags) {
    for (const [key, value] of Object.entries(input.tags)) {
      if (key !== 'Name') runInput.TagSpecifications![0].Tags!.push({ Key: key, Value: value })
    }
  }

  if (input.diskGb || input.diskType) {
    runInput.BlockDeviceMappings = [
      {
        DeviceName: '/dev/xvda',
        Ebs: {
          VolumeSize: input.diskGb ?? 30,
          VolumeType: (input.diskType ?? 'gp3') as never,
          DeleteOnTermination: true,
        },
      },
    ]
  }

  if (subnetId?.startsWith('subnet-')) {
    runInput.NetworkInterfaces = [
      {
        DeviceIndex: 0,
        SubnetId: subnetId,
        Groups: securityGroupIds?.length ? securityGroupIds : undefined,
        AssociatePublicIpAddress: input.publicIp !== false,
      },
    ]
  } else if (securityGroupIds?.length) {
    runInput.SecurityGroupIds = securityGroupIds
    if (input.availabilityZone) runInput.Placement = { AvailabilityZone: input.availabilityZone }
  }

  return runInput
}

export const validateAwsLaunchPreflight = async (
  ec2: EC2Client,
  input: LaunchInstanceInput,
  networks: AwsSubnetRow[],
  securityGroups: CloudSecurityGroup[],
): Promise<LaunchPreflightResult> => {
  const checks: LaunchPreflightCheck[] = []
  const imageId = sanitizeAmiId(input.imageId)

  if (!input.region) checks.push({ id: 'region', level: 'error', message: 'Región requerida', field: 'region' })
  if (!input.availabilityZone) {
    checks.push({ id: 'az', level: 'error', message: 'Zona de disponibilidad requerida', field: 'availabilityZone' })
  }
  if (!input.instanceType) {
    checks.push({ id: 'type', level: 'error', message: 'Tipo de instancia requerido', field: 'instanceType' })
  }
  if (!imageId) checks.push({ id: 'ami', level: 'error', message: 'AMI requerida', field: 'imageId' })
  else if (!(await verifyAmiInRegion(ec2, imageId))) {
    checks.push({
      id: 'ami-region',
      level: 'error',
      message: `La AMI ${imageId} no existe en ${input.region}`,
      field: 'imageId',
      suggestion: 'Elige una AMI del catálogo de la misma región',
    })
  }

  const subnetPick = pickSubnetForLaunch(networks, input.availabilityZone ?? '', input.subnetId)
  if (subnetPick.issue) {
    checks.push({
      id: 'subnet-az',
      level: 'error',
      message: subnetPick.issue,
      field: 'subnetId',
      suggestion: 'Cambia de zona, selecciona otra subnet o crea una subnet en esta VPC',
    })
  } else if (subnetPick.subnetId) {
    checks.push({ id: 'subnet', level: 'ok', message: `Subnet ${subnetPick.subnetId} en ${input.availabilityZone}` })
  }

  const sgIds = input.securityGroupIds?.filter(Boolean) ?? []
  if (!sgIds.length) {
    checks.push({
      id: 'sg',
      level: 'warning',
      message: 'Sin security group — AWS usará default si existe',
      field: 'securityGroupIds',
    })
  } else if (subnetPick.vpcId) {
    const bad = sgIds.filter((id) => {
      const sg = securityGroups.find((s) => s.id === id)
      return sg?.vpcId && sg.vpcId !== subnetPick.vpcId
    })
    if (bad.length) {
      checks.push({
        id: 'sg-vpc',
        level: 'error',
        message: `Security group no pertenece a la VPC ${subnetPick.vpcId}`,
        field: 'securityGroupIds',
      })
    }
  }

  if (input.keyPair?.trim()) {
    checks.push({ id: 'keypair', level: 'ok', message: `Key pair ${input.keyPair}` })
  } else {
    checks.push({
      id: 'keypair',
      level: 'warning',
      message: 'Sin key pair — no podrás conectar por SSH',
      field: 'keyPair',
      suggestion: 'Crea un key pair en EC2 → Key Pairs',
    })
  }

  const amiArch = imageId ? await archForAmi(ec2, imageId) : undefined
  if (amiArch && input.instanceType) {
    const armType = input.instanceType.includes('g') || input.instanceType.startsWith('t4g') || input.instanceType.includes('a1')
    const amiArm = amiArch === 'arm64'
    if (armType !== amiArm && (amiArm || input.instanceType.includes('arm'))) {
      checks.push({
        id: 'arch',
        level: 'error',
        message: `Incompatibilidad: AMI ${amiArch} vs tipo ${input.instanceType}`,
        field: 'instanceType',
        suggestion: 'Elige un tipo compatible (x86_64 o arm64/graviton)',
      })
    } else {
      checks.push({ id: 'arch', level: 'ok', message: `Arquitectura compatible (${amiArch})` })
    }
  }

  const hasError = checks.some((c) => c.level === 'error')
  if (!hasError && subnetPick.subnetId && imageId && input.instanceType) {
    try {
      const runInput = buildRunInput(input, imageId, subnetPick.subnetId, sgIds)
      await ec2.send(new RunInstancesCommand({ ...runInput, DryRun: true }))
      checks.push({ id: 'dryrun', level: 'ok', message: 'EC2 DryRun superada — listo para lanzar' })
    } catch (err) {
      if (isAwsDryRunSuccess(err)) {
        checks.push({ id: 'dryrun', level: 'ok', message: 'EC2 DryRun superada — listo para lanzar' })
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        const isDefaultSubnet = /no default subnet/i.test(msg)
        checks.push({
          id: 'dryrun',
          level: 'error',
          message: isDefaultSubnet
            ? `No hay subnet por defecto en ${input.availabilityZone}`
            : msg,
          field: isDefaultSubnet ? 'subnetId' : undefined,
          suggestion: isDefaultSubnet
            ? 'Cambia de zona, selecciona una subnet existente o crea una nueva en la VPC'
            : 'Revisa red, permisos IAM o cuotas',
        })
      }
    }
  }

  const valid = !checks.some((c) => c.level === 'error')
  return {
    valid,
    checks,
    resolvedSubnetId: subnetPick.subnetId,
    resolvedVpcId: subnetPick.vpcId,
  }
}
