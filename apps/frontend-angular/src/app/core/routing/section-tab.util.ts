import { DestroyRef, WritableSignal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute } from '@angular/router'

/** Maps URL section slugs to mat-tab indices per module */
export const sectionToTabIndex = (module: string, section: string): number => {
  const maps: Record<string, Record<string, number>> = {
    cloud: {
      overview: 0,
      accounts: 1,
      instances: 2,
      network: 3,
      firewall: 4,
      regions: 5,
      volumes: 6,
      snapshots: 6,
      'load-balancers': 3,
      metrics: 7,
      billing: 9,
      'ai-studio': 10,
      finops: 11,
      audit: 11,
    },
    vps: {
      overview: 0,
      servers: 0,
      ssh: 1,
      services: 2,
      docker: 3,
      kubernetes: 4,
      ports: 5,
      metrics: 6,
      audit: 7,
    },
    docker: {
      overview: 0,
      containers: 0,
      hosts: 1,
      images: 2,
      networks: 3,
      volumes: 4,
      logs: 5,
    },
    jenkins: {
      overview: 0,
      servers: 0,
      jobs: 0,
      pipelines: 2,
      builds: 1,
      logs: 4,
      parameters: 5,
      history: 1,
      artifacts: 6,
      tests: 7,
      agents: 8,
      nodes: 8,
      queue: 3,
      'failed-builds': 1,
    },
    kubernetes: {
      overview: 0,
      pods: 0,
      clusters: 1,
      nodes: 2,
      namespaces: 3,
      deployments: 4,
      services: 5,
      ingress: 5,
      events: 6,
      logs: 6,
      yaml: 7,
      metrics: 0,
    },
    billing: {
      overview: 0,
      'aws-costs': 0,
      'gcp-costs': 0,
      'azure-costs': 0,
      'vps-costs': 0,
      'by-account': 0,
      'by-instance': 0,
      forecast: 0,
      'cost-alerts': 0,
      'export-reports': 0,
    },
    alerts: {
      active: 0,
      critical: 0,
      warning: 0,
      info: 0,
      rules: 2,
      silenced: 3,
      history: 1,
      escalations: 4,
    },
  }
  return maps[module]?.[section] ?? 0
}

export const providerFromSlug = (slug: string): 'AWS' | 'GCP' | 'AZURE' | 'CLOUDING' => {
  const s = slug.toLowerCase()
  if (s === 'gcp') return 'GCP'
  if (s === 'azure') return 'AZURE'
  if (s === 'clouding') return 'CLOUDING'
  return 'AWS'
}

export const vpsProviderFromSlug = (
  slug: string,
): 'DIGITALOCEAN' | 'HETZNER' | 'LINODE' | 'OVH' | 'IONOS' | 'VULTR' | 'SCALEWAY' => {
  const s = slug.toLowerCase()
  if (s === 'hetzner') return 'HETZNER'
  if (s === 'linode') return 'LINODE'
  if (s === 'ovh') return 'OVH'
  if (s === 'ionos') return 'IONOS'
  if (s === 'vultr') return 'VULTR'
  if (s === 'scaleway') return 'SCALEWAY'
  return 'DIGITALOCEAN'
}

export const bindSectionTabs = (
  route: ActivatedRoute,
  destroyRef: DestroyRef,
  tabIndex: WritableSignal<number>,
  module: string,
  sectionMap?: (section: string) => number,
): void => {
  route.paramMap.pipe(takeUntilDestroyed(destroyRef)).subscribe((params) => {
    const section = params.get('section')
    if (section) {
      tabIndex.set(sectionMap ? sectionMap(section) : sectionToTabIndex(module, section))
    }
  })
}
