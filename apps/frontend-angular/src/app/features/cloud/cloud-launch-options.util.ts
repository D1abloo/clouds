import type { CloudSlug } from './cloud-provider.data'

export type CloudLaunchStepId = 'image' | 'compute' | 'network' | 'storage' | 'review'

export type CloudLaunchStep = { id: CloudLaunchStepId; label: string; icon: string; shortLabel?: string }

export type CloudLaunchProviderOptions = {
  steps: CloudLaunchStep[]
  imageSectionTitle: string
  imageSectionHint: string
  instanceSectionTitle: string
  instanceSectionHint: string
  networkSectionTitle: string
  networkSectionHint: string
  storageSectionTitle: string
  storageSectionHint: string
  reviewSectionTitle: string
  reviewSectionHint: string
  instanceNameLabel: string
  subnetLabel: string
  azLabel: string
  resourceGroupLabel: string
  keyPairLabel: string
  diskSizeLabel: string
  volumeTypeLabel: string
  tagsLabel: string
  userDataLabel: string
  searchImageLabel: string
  keyPairs: string[]
  volumeTypes: { id: string; label: string }[]
  defaultVolumeGb: number
  defaultVolumeType: string
  zones: string[]
  resourceGroups?: string[]
  monitoringLabel: string
  publicIpLabel: string
  tagHint: string
  nextLabel: string
  backLabel: string
  launchLabel: string
  cancelLabel: string
  reviewLabels: {
    name: string
    image: string
    type: string
    region: string
    zone: string
    subnet: string
    resourceGroup?: string
    publicIp: string
    keyPair: string
    disk: string
    monitoring: string
    tags: string
  }
}

const awsZones = (region: string): string[] => [`${region}a`, `${region}b`, `${region}c`]

export const cloudLaunchSteps = (slug: CloudSlug): CloudLaunchStep[] => {
  if (slug === 'aws') {
    return [
      { id: 'image', label: 'Choose AMI', shortLabel: 'AMI', icon: 'image' },
      { id: 'compute', label: 'Instance type', shortLabel: 'Type', icon: 'memory' },
      { id: 'network', label: 'Network settings', shortLabel: 'Network', icon: 'device_hub' },
      { id: 'storage', label: 'Configure storage', shortLabel: 'Storage', icon: 'storage' },
      { id: 'review', label: 'Review and launch', shortLabel: 'Review', icon: 'fact_check' },
    ]
  }
  if (slug === 'gcp') {
    return [
      { id: 'image', label: 'Imagen', shortLabel: 'Imagen', icon: 'image' },
      { id: 'compute', label: 'Tipo de máquina', shortLabel: 'Máquina', icon: 'memory' },
      { id: 'network', label: 'Redes', shortLabel: 'Red', icon: 'device_hub' },
      { id: 'storage', label: 'Disco de arranque', shortLabel: 'Disco', icon: 'storage' },
      { id: 'review', label: 'Revisar', shortLabel: 'Revisar', icon: 'fact_check' },
    ]
  }
  if (slug === 'azure') {
    return [
      { id: 'image', label: 'Imagen SO', shortLabel: 'Imagen', icon: 'image' },
      { id: 'compute', label: 'Tamaño', shortLabel: 'Tamaño', icon: 'memory' },
      { id: 'network', label: 'Redes', shortLabel: 'Red', icon: 'device_hub' },
      { id: 'storage', label: 'Discos', shortLabel: 'Discos', icon: 'storage' },
      { id: 'review', label: 'Revisar + crear', shortLabel: 'Revisar', icon: 'fact_check' },
    ]
  }
  return [
    { id: 'image', label: 'Plantilla', shortLabel: 'Plantilla', icon: 'image' },
    { id: 'compute', label: 'Plan', shortLabel: 'Plan', icon: 'memory' },
    { id: 'network', label: 'Red', shortLabel: 'Red', icon: 'device_hub' },
    { id: 'storage', label: 'Almacenamiento', shortLabel: 'SSD', icon: 'storage' },
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
  publicIp: 'IP pública',
  keyPair: 'Par de claves',
  disk: 'Disco raíz',
  monitoring: 'Monitorización',
  tags: 'Etiquetas',
}

export const cloudLaunchOptions = (slug: CloudSlug, region = ''): CloudLaunchProviderOptions => {
  const base: CloudLaunchProviderOptions = {
    steps: cloudLaunchSteps(slug),
    imageSectionTitle: 'Imágenes operativas',
    imageSectionHint: 'Selecciona una imagen en estado available en la región.',
    instanceSectionTitle: 'Tipo de instancia',
    instanceSectionHint: 'Selecciona el tamaño de compute y asigna un nombre identificable.',
    networkSectionTitle: 'Red y conectividad',
    networkSectionHint: 'Configura región, zona y conectividad de red.',
    storageSectionTitle: 'Almacenamiento y acceso',
    storageSectionHint: 'Par de claves, disco raíz, etiquetas y script de arranque.',
    reviewSectionTitle: 'Revisar y lanzar',
    reviewSectionHint: 'Confirma la configuración antes de provisionar la infraestructura.',
    instanceNameLabel: 'Nombre de instancia',
    subnetLabel: 'Subred / VPC',
    azLabel: 'Zona de disponibilidad',
    resourceGroupLabel: 'Grupo de recursos',
    keyPairLabel: 'Par de claves SSH',
    diskSizeLabel: 'Tamaño disco raíz (GB)',
    volumeTypeLabel: 'Tipo de volumen',
    tagsLabel: 'Etiquetas',
    userDataLabel: 'User data / cloud-init',
    searchImageLabel: 'Buscar imagen',
    keyPairs: ['cloudops-prod', 'cloudops-staging', 'deploy-key'],
    volumeTypes: [{ id: 'gp3', label: 'gp3 — SSD general' }],
    defaultVolumeGb: 30,
    defaultVolumeType: 'gp3',
    zones: region ? awsZones(region) : ['a', 'b', 'c'],
    monitoringLabel: 'Monitorización',
    publicIpLabel: 'IP pública',
    tagHint: 'Environment=production,Team=platform',
    nextLabel: 'Siguiente',
    backLabel: 'Atrás',
    launchLabel: 'Lanzar instancia',
    cancelLabel: 'Cancelar',
    reviewLabels: { ...baseReviewLabels },
  }

  if (slug === 'aws') {
    return {
      ...base,
      imageSectionTitle: 'Application and OS Images (Amazon Machine Image)',
      imageSectionHint: 'An AMI contains the OS, application server, and applications for your instance.',
      instanceSectionTitle: 'Instance type',
      instanceSectionHint: 'Compare instance types based on vCPU, memory, and network performance.',
      networkSectionTitle: 'Network settings',
      networkSectionHint: 'Configure VPC, subnet, security group, and public IP assignment.',
      storageSectionTitle: 'Configure storage',
      storageSectionHint: 'Root volume, key pair, tags, and advanced details (user data).',
      reviewSectionTitle: 'Review and launch',
      reviewSectionHint: 'Review your instance configuration before launching.',
      instanceNameLabel: 'Name',
      subnetLabel: 'Subnet',
      azLabel: 'Availability Zone',
      keyPairLabel: 'Key pair (login)',
      diskSizeLabel: 'Root volume size (GiB)',
      volumeTypeLabel: 'Volume type (EBS)',
      tagsLabel: 'Tags',
      userDataLabel: 'Advanced details — User data',
      searchImageLabel: 'Filter AMIs',
      keyPairs: ['cloudops-ec2-prod', 'cloudops-ec2-staging', 'aws-deploy'],
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
      reviewLabels: {
        name: 'Name',
        image: 'AMI',
        type: 'Instance type',
        region: 'AWS Region',
        zone: 'Availability Zone',
        subnet: 'Subnet',
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
      imageSectionTitle: 'Boot disk and operating system',
      imageSectionHint: 'Public images and family images ready to launch in Compute Engine.',
      instanceSectionTitle: 'Machine configuration',
      instanceSectionHint: 'Select a machine type. Series include E2, N2, and C2 for different workloads.',
      networkSectionTitle: 'Networking',
      networkSectionHint: 'VPC network, firewall rules, network tags, and external IP.',
      storageSectionTitle: 'Boot disk and security',
      storageSectionHint: 'Boot disk size and type, SSH keys, metadata, and startup script.',
      reviewSectionTitle: 'Review and create',
      reviewSectionHint: 'Verify machine type, boot disk, networking, and firewall before creating.',
      instanceNameLabel: 'Instance name',
      subnetLabel: 'Subnetwork',
      azLabel: 'Zone',
      keyPairLabel: 'SSH Keys',
      diskSizeLabel: 'Boot disk size (GB)',
      volumeTypeLabel: 'Boot disk type',
      tagsLabel: 'Network tags',
      userDataLabel: 'Startup script',
      searchImageLabel: 'Filter images',
      keyPairs: ['gcp-ssh-prod', 'gcp-ops'],
      volumeTypes: [
        { id: 'pd-balanced', label: 'Balanced persistent disk' },
        { id: 'pd-ssd', label: 'SSD persistent disk' },
        { id: 'pd-standard', label: 'Standard persistent disk' },
      ],
      defaultVolumeType: 'pd-balanced',
      zones: region ? [`${region}-a`, `${region}-b`, `${region}-c`] : ['us-central1-a'],
      monitoringLabel: 'Enable Cloud Monitoring + Ops Agent',
      publicIpLabel: 'External IPv4 address (Ephemeral)',
      tagHint: 'http-server,https-server',
      nextLabel: 'Continuar',
      backLabel: 'Atrás',
      launchLabel: 'Crear',
      cancelLabel: 'Cancelar',
      reviewLabels: {
        name: 'Nombre',
        image: 'Imagen de arranque',
        type: 'Tipo de máquina',
        region: 'Región',
        zone: 'Zona',
        subnet: 'Subred',
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
      imageSectionTitle: 'Image',
      imageSectionHint: 'Select an operating system image from Azure Marketplace or your gallery.',
      instanceSectionTitle: 'Virtual machine size',
      instanceSectionHint: 'Choose a size based on vCPUs, memory, and temporary storage.',
      networkSectionTitle: 'Networking',
      networkSectionHint: 'Virtual network, subnet, NSG, and public IP configuration.',
      storageSectionTitle: 'Disks and security',
      storageSectionHint: 'OS disk type and size, SSH key, tags, and custom data.',
      reviewSectionTitle: 'Review + create',
      reviewSectionHint: 'Review the VM configuration summary before deployment.',
      instanceNameLabel: 'Virtual machine name',
      subnetLabel: 'Subnet',
      azLabel: 'Availability zone',
      resourceGroupLabel: 'Resource group',
      keyPairLabel: 'SSH public key source',
      diskSizeLabel: 'OS disk size (GB)',
      volumeTypeLabel: 'OS disk type',
      tagsLabel: 'Tags',
      userDataLabel: 'Custom data',
      searchImageLabel: 'Search images',
      keyPairs: ['azure-admin', 'cloudops-azure'],
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
      reviewLabels: {
        name: 'VM name',
        image: 'Image',
        type: 'Size',
        region: 'Region',
        zone: 'Availability zone',
        subnet: 'Subnet',
        resourceGroup: 'Resource group',
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
    imageSectionTitle: 'Plantillas Clouding',
    imageSectionHint: 'Plantillas operativas disponibles en la red seleccionada.',
    instanceSectionTitle: 'Plan Clouding',
    instanceSectionHint: 'Elige el plan según vCPU, RAM y tráfico incluido.',
    networkSectionTitle: 'Red y políticas',
    networkSectionHint: 'Región, red privada y política de acceso.',
    storageSectionTitle: 'SSD y acceso SSH',
    storageSectionHint: 'Disco SSD flexible, claves SSH, etiquetas y script de inicio.',
    reviewSectionTitle: 'Confirmar lanzamiento',
    reviewSectionHint: 'Revisa el resumen antes de provisionar la instancia.',
    instanceNameLabel: 'Nombre de instancia',
    subnetLabel: 'Red privada',
    azLabel: 'Zona',
    keyPairLabel: 'Clave SSH',
    diskSizeLabel: 'Tamaño SSD (GB)',
    volumeTypeLabel: 'Tipo SSD',
    tagsLabel: 'Etiquetas',
    userDataLabel: 'Script de inicio',
    searchImageLabel: 'Buscar plantilla',
    keyPairs: ['clouding-ssh', 'ops-key'],
    volumeTypes: [
      { id: 'ssd-flex', label: 'SSD flexible' },
      { id: 'ssd-pro', label: 'SSD performance' },
    ],
    defaultVolumeGb: 40,
    defaultVolumeType: 'ssd-flex',
    zones: ['eu-central-1', 'eu-central-2', 'us-east-1'],
    monitoringLabel: 'Clouding Metrics',
    publicIpLabel: 'IP pública flexible',
    tagHint: 'env=prod,team=ops',
    nextLabel: 'Continuar',
    backLabel: 'Atrás',
    launchLabel: 'Lanzar instancia',
    cancelLabel: 'Cancelar',
    reviewLabels: { ...baseReviewLabels },
  }
}
