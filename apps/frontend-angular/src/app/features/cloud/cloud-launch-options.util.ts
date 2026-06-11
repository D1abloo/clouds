import type { CloudSlug } from './cloud-provider.data'

export type CloudLaunchStepId = 'account' | 'region' | 'compute' | 'image' | 'review'

export type CloudLaunchStep = { id: CloudLaunchStepId; label: string; icon: string; shortLabel?: string }

export type CloudLaunchProviderOptions = {
  steps: CloudLaunchStep[]
  accountSectionTitle: string
  accountSectionHint: string
  regionSectionTitle: string
  regionSectionHint: string
  imageSectionTitle: string
  imageSectionHint: string
  instanceSectionTitle: string
  instanceSectionHint: string
  reviewSectionTitle: string
  reviewSectionHint: string
  instanceNameLabel: string
  subnetLabel: string
  vpcLabel: string
  azLabel: string
  resourceGroupLabel: string
  subscriptionLabel: string
  projectLabel: string
  keyPairLabel: string
  diskSizeLabel: string
  volumeTypeLabel: string
  tagsLabel: string
  userDataLabel: string
  searchImageLabel: string
  volumeTypes: { id: string; label: string }[]
  defaultVolumeGb: number
  defaultVolumeType: string
  resourceGroups?: string[]
  monitoringLabel: string
  publicIpLabel: string
  tagHint: string
  nextLabel: string
  backLabel: string
  launchLabel: string
  cancelLabel: string
  permissionLabels: string[]
  reviewLabels: {
    name: string
    image: string
    type: string
    region: string
    zone: string
    subnet: string
    vpc?: string
    resourceGroup?: string
    subscription?: string
    project?: string
    publicIp: string
    keyPair: string
    disk: string
    monitoring: string
    tags: string
  }
}

export const defaultZonesForRegion = (slug: CloudSlug, region: string): string[] => {
  if (!region) return []
  if (slug === 'gcp') return [`${region}-a`, `${region}-b`, `${region}-c`]
  if (slug === 'azure') return [`${region}-1`, `${region}-2`, `${region}-3`]
  if (slug === 'clouding') return ['eu-central-1', 'eu-central-2', 'us-east-1']
  return [`${region}a`, `${region}b`, `${region}c`]
}

export const cloudLaunchSteps = (slug: CloudSlug): CloudLaunchStep[] => {
  if (slug === 'aws') {
    return [
      { id: 'account', label: 'Cuenta', shortLabel: 'Cuenta', icon: 'verified_user' },
      { id: 'region', label: 'Región y red', shortLabel: 'Región', icon: 'device_hub' },
      { id: 'compute', label: 'Compute', shortLabel: 'Compute', icon: 'memory' },
      { id: 'image', label: 'Imagen', shortLabel: 'Imagen', icon: 'image' },
      { id: 'review', label: 'Lanzar', shortLabel: 'Lanzar', icon: 'rocket_launch' },
    ]
  }
  if (slug === 'gcp') {
    return [
      { id: 'account', label: 'Proyecto y permisos', shortLabel: 'Cuenta', icon: 'verified_user' },
      { id: 'region', label: 'Región y red', shortLabel: 'Red', icon: 'device_hub' },
      { id: 'compute', label: 'Tipo de máquina', shortLabel: 'Máquina', icon: 'memory' },
      { id: 'image', label: 'Imagen de arranque', shortLabel: 'Imagen', icon: 'image' },
      { id: 'review', label: 'Revisar y crear', shortLabel: 'Revisar', icon: 'fact_check' },
    ]
  }
  if (slug === 'azure') {
    return [
      { id: 'account', label: 'Subscription & permissions', shortLabel: 'Account', icon: 'verified_user' },
      { id: 'region', label: 'Networking', shortLabel: 'Network', icon: 'device_hub' },
      { id: 'compute', label: 'VM size & disks', shortLabel: 'Size', icon: 'memory' },
      { id: 'image', label: 'Operating system', shortLabel: 'Image', icon: 'image' },
      { id: 'review', label: 'Review + create', shortLabel: 'Review', icon: 'fact_check' },
    ]
  }
  return [
    { id: 'account', label: 'Cuenta', shortLabel: 'Cuenta', icon: 'verified_user' },
    { id: 'region', label: 'Región y red', shortLabel: 'Red', icon: 'device_hub' },
    { id: 'compute', label: 'Plan', shortLabel: 'Plan', icon: 'memory' },
    { id: 'image', label: 'Plantilla', shortLabel: 'Plantilla', icon: 'image' },
    { id: 'review', label: 'Confirmar', shortLabel: 'Confirmar', icon: 'fact_check' },
  ]
}

const baseReviewLabels = {
  name: 'Nombre',
  image: 'Imagen',
  type: 'Tipo',
  region: 'Región',
  zone: 'Zona',
  subnet: 'Subred',
  vpc: 'VPC',
  publicIp: 'IP pública',
  keyPair: 'Par de claves',
  disk: 'Disco raíz',
  monitoring: 'Monitorización',
  tags: 'Etiquetas',
}

export const cloudLaunchOptions = (slug: CloudSlug): CloudLaunchProviderOptions => {
  const base: CloudLaunchProviderOptions = {
    steps: cloudLaunchSteps(slug),
    accountSectionTitle: 'Cuenta conectada',
    accountSectionHint: 'Verifica credenciales y permisos antes de provisionar.',
    regionSectionTitle: 'Región y red',
    regionSectionHint: 'Selecciona región, zona y valida la conectividad de red.',
    imageSectionTitle: 'Imágenes operativas',
    imageSectionHint: 'Selecciona una imagen compatible con la región y el tipo de instancia.',
    instanceSectionTitle: 'Tipo de instancia',
    instanceSectionHint: 'Selecciona compute, disco raíz, security group y acceso SSH.',
    reviewSectionTitle: 'Revisar y lanzar',
    reviewSectionHint: 'Confirma la configuración antes de provisionar la infraestructura.',
    instanceNameLabel: 'Nombre de instancia',
    subnetLabel: 'Subred',
    vpcLabel: 'VPC / red virtual',
    azLabel: 'Zona de disponibilidad',
    resourceGroupLabel: 'Grupo de recursos',
    subscriptionLabel: 'Suscripción',
    projectLabel: 'Proyecto',
    keyPairLabel: 'Par de claves SSH',
    diskSizeLabel: 'Tamaño disco raíz (GB)',
    volumeTypeLabel: 'Tipo de volumen',
    tagsLabel: 'Etiquetas',
    userDataLabel: 'User data / cloud-init',
    searchImageLabel: 'Buscar imagen',
    volumeTypes: [{ id: 'gp3', label: 'gp3 — SSD general' }],
    defaultVolumeGb: 30,
    defaultVolumeType: 'gp3',
    monitoringLabel: 'Monitorización',
    publicIpLabel: 'IP pública',
    tagHint: 'Environment=production,Team=platform',
    nextLabel: 'Siguiente',
    backLabel: 'Atrás',
    launchLabel: 'Lanzar instancia',
    cancelLabel: 'Cancelar',
    permissionLabels: ['Instancias', 'Redes', 'Subnets', 'Security Groups', 'Key Pairs', 'Imágenes'],
    reviewLabels: { ...baseReviewLabels },
  }

  if (slug === 'aws') {
    return {
      ...base,
      accountSectionTitle: 'AWS account & permissions',
      accountSectionHint: 'Verify IAM credentials and EC2 permissions before launch.',
      regionSectionTitle: 'Region & network settings',
      regionSectionHint: 'Configure AWS Region, Availability Zone, VPC and subnet. Resolve missing default subnets before launch.',
      imageSectionTitle: 'Application and OS Images (AMI)',
      imageSectionHint: 'An AMI contains the OS and applications. Must match region and instance architecture.',
      instanceSectionTitle: 'Instance type & storage',
      instanceSectionHint: 'Select instance type, root volume, security group and key pair.',
      reviewSectionTitle: 'Review and launch',
      reviewSectionHint: 'Preflight validation runs automatically. Fix errors before launching.',
      instanceNameLabel: 'Name',
      subnetLabel: 'Subnet',
      vpcLabel: 'VPC',
      azLabel: 'Availability Zone',
      keyPairLabel: 'Key pair (login)',
      diskSizeLabel: 'Root volume size (GiB)',
      volumeTypeLabel: 'Volume type (EBS)',
      tagsLabel: 'Tags',
      userDataLabel: 'Advanced details — User data',
      searchImageLabel: 'Filter AMIs',
      volumeTypes: [
        { id: 'gp3', label: 'gp3 — General Purpose SSD' },
        { id: 'gp2', label: 'gp2 — General Purpose SSD (legacy)' },
        { id: 'io2', label: 'io2 — Provisioned IOPS SSD' },
      ],
      defaultVolumeType: 'gp3',
      monitoringLabel: 'Enable CloudWatch detailed monitoring',
      publicIpLabel: 'Auto-assign public IP',
      tagHint: 'Name=web-prod,Environment=production',
      nextLabel: 'Next',
      backLabel: 'Previous',
      launchLabel: 'Launch instance',
      cancelLabel: 'Cancel',
      permissionLabels: ['EC2', 'VPC', 'Subnets', 'Security Groups', 'Key Pairs', 'Images (AMI)'],
      reviewLabels: {
        name: 'Name',
        image: 'AMI',
        type: 'Instance type',
        region: 'AWS Region',
        zone: 'Availability Zone',
        subnet: 'Subnet',
        vpc: 'VPC',
        publicIp: 'Auto-assign public IP',
        keyPair: 'Key pair',
        disk: 'Root volume',
        monitoring: 'Detailed monitoring',
        tags: 'Tags',
      },
    }
  }

  if (slug === 'gcp') {
    return {
      ...base,
      accountSectionTitle: 'Proyecto GCP y permisos',
      accountSectionHint: 'Verifica la cuenta de servicio y permisos de Compute Engine.',
      regionSectionTitle: 'Región, zona y VPC',
      regionSectionHint: 'Red VPC, subred, firewall rules e IP externa.',
      imageSectionTitle: 'Boot disk and operating system',
      imageSectionHint: 'Imágenes públicas listas para Compute Engine en la región seleccionada.',
      instanceSectionTitle: 'Configuración de máquina',
      instanceSectionHint: 'Tipo de máquina, disco de arranque, firewall y claves SSH.',
      reviewSectionTitle: 'Revisar y crear',
      reviewSectionHint: 'Validación previa al crear la instancia.',
      instanceNameLabel: 'Instance name',
      subnetLabel: 'Subnetwork',
      vpcLabel: 'VPC network',
      azLabel: 'Zone',
      projectLabel: 'Proyecto GCP',
      keyPairLabel: 'SSH Keys',
      diskSizeLabel: 'Boot disk size (GB)',
      volumeTypeLabel: 'Boot disk type',
      tagsLabel: 'Network tags',
      userDataLabel: 'Startup script',
      searchImageLabel: 'Filter images',
      volumeTypes: [
        { id: 'pd-balanced', label: 'Balanced persistent disk' },
        { id: 'pd-ssd', label: 'SSD persistent disk' },
        { id: 'pd-standard', label: 'Standard persistent disk' },
      ],
      defaultVolumeType: 'pd-balanced',
      monitoringLabel: 'Enable Cloud Monitoring + Ops Agent',
      publicIpLabel: 'External IPv4 address (Ephemeral)',
      tagHint: 'http-server,https-server',
      nextLabel: 'Continuar',
      backLabel: 'Atrás',
      launchLabel: 'Crear',
      cancelLabel: 'Cancelar',
      permissionLabels: ['Compute Engine', 'VPC', 'Subnets', 'Firewall', 'SSH Keys', 'Images'],
      reviewLabels: {
        name: 'Nombre',
        image: 'Imagen de arranque',
        type: 'Tipo de máquina',
        region: 'Región',
        zone: 'Zona',
        subnet: 'Subred',
        vpc: 'VPC network',
        project: 'Proyecto',
        publicIp: 'IP externa',
        keyPair: 'Clave SSH',
        disk: 'Disco de arranque',
        monitoring: 'Cloud Monitoring',
        tags: 'Network tags',
      },
    }
  }

  if (slug === 'azure') {
    return {
      ...base,
      accountSectionTitle: 'Azure subscription & permissions',
      accountSectionHint: 'Verify service principal and RBAC permissions for VM deployment.',
      regionSectionTitle: 'Networking',
      regionSectionHint: 'Virtual network, subnet, NSG and public IP configuration.',
      imageSectionTitle: 'Image',
      imageSectionHint: 'Select an operating system image from Azure Marketplace or your gallery.',
      instanceSectionTitle: 'Virtual machine size & disks',
      instanceSectionHint: 'Choose VM size, OS disk, NSG and SSH key.',
      reviewSectionTitle: 'Review + create',
      reviewSectionHint: 'Preflight validation before VM deployment.',
      instanceNameLabel: 'Virtual machine name',
      subnetLabel: 'Subnet',
      vpcLabel: 'Virtual network',
      azLabel: 'Availability zone',
      resourceGroupLabel: 'Resource group',
      subscriptionLabel: 'Subscription',
      keyPairLabel: 'SSH public key source',
      diskSizeLabel: 'OS disk size (GB)',
      volumeTypeLabel: 'OS disk type',
      tagsLabel: 'Tags',
      userDataLabel: 'Custom data',
      searchImageLabel: 'Search images',
      volumeTypes: [
        { id: 'Premium_LRS', label: 'Premium SSD LRS' },
        { id: 'StandardSSD_LRS', label: 'Standard SSD LRS' },
        { id: 'Standard_LRS', label: 'Standard HDD LRS' },
      ],
      defaultVolumeType: 'Premium_LRS',
      resourceGroups: ['rg-cloudops-prod', 'rg-cloudops-staging', 'rg-network'],
      monitoringLabel: 'Enable Azure Monitor + VM insights',
      publicIpLabel: 'Public IP (Standard SKU)',
      tagHint: 'Environment=Production,Owner=platform',
      nextLabel: 'Next',
      backLabel: 'Previous',
      launchLabel: 'Create',
      cancelLabel: 'Cancel',
      permissionLabels: ['Virtual Machines', 'VNet', 'Subnets', 'NSG', 'SSH Keys', 'Images'],
      reviewLabels: {
        name: 'VM name',
        image: 'Image',
        type: 'Size',
        region: 'Region',
        zone: 'Availability zone',
        subnet: 'Subnet',
        vpc: 'Virtual network',
        resourceGroup: 'Resource group',
        subscription: 'Subscription',
        publicIp: 'Public IP',
        keyPair: 'SSH key',
        disk: 'OS disk',
        monitoring: 'Azure Monitor',
        tags: 'Tags',
      },
    }
  }

  return {
    ...base,
    accountSectionTitle: 'Cuenta Clouding',
    accountSectionHint: 'Verifica credenciales y acceso a la API.',
    regionSectionTitle: 'Región y red privada',
    regionSectionHint: 'Región, red privada y política de acceso.',
    imageSectionTitle: 'Plantillas Clouding',
    imageSectionHint: 'Plantillas operativas disponibles en la red seleccionada.',
    instanceSectionTitle: 'Plan Clouding',
    instanceSectionHint: 'Plan, SSD, claves SSH y etiquetas.',
    reviewSectionTitle: 'Confirmar lanzamiento',
    reviewSectionHint: 'Revisa el resumen antes de provisionar.',
    instanceNameLabel: 'Nombre de instancia',
    subnetLabel: 'Red privada',
    vpcLabel: 'Red',
    azLabel: 'Zona',
    keyPairLabel: 'Clave SSH',
    diskSizeLabel: 'Tamaño SSD (GB)',
    volumeTypeLabel: 'Tipo SSD',
    tagsLabel: 'Etiquetas',
    userDataLabel: 'Script de inicio',
    searchImageLabel: 'Buscar plantilla',
    volumeTypes: [
      { id: 'ssd-flex', label: 'SSD flexible' },
      { id: 'ssd-pro', label: 'SSD performance' },
    ],
    defaultVolumeGb: 40,
    defaultVolumeType: 'ssd-flex',
    monitoringLabel: 'Clouding Metrics',
    publicIpLabel: 'IP pública flexible',
    tagHint: 'env=prod,team=ops',
    nextLabel: 'Continuar',
    backLabel: 'Atrás',
    launchLabel: 'Lanzar instancia',
    cancelLabel: 'Cancelar',
    permissionLabels: ['Instancias', 'Redes', 'Subnets', 'Políticas', 'SSH', 'Plantillas'],
    reviewLabels: { ...baseReviewLabels },
  }
}
