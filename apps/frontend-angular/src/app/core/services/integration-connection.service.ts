import { inject, Injectable } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { CloudAccountFormDialogComponent } from '../../features/cloud-accounts/cloud-account-form-dialog.component'
import {
  resolveProviderAlias,
  wizardRouteForAlias,
  type ConnectionProviderId,
} from '../../features/cloud-accounts/cloud-account-wizard.config'
import { GithubAccountDialogComponent } from '../../features/repositories/components/github-account-dialog.component'
import { GitlabAccountDialogComponent } from '../../features/repositories/components/gitlab-account-dialog.component'
import type { CloudProvider } from '../models/api.models'
import {
  getModuleRequirement,
  resolveModuleId,
} from '../routing/module-requirements.util'

export type VpsProviderId =
  | 'DIGITALOCEAN'
  | 'HETZNER'
  | 'LINODE'
  | 'OVH'
  | 'IONOS'
  | 'VULTR'
  | 'SCALEWAY'

export type ConnectionOpenOptions = {
  preferDialog?: boolean
}

const PROVIDER_FALLBACK_ROUTES: Record<string, string> = {
  aws: '/cloud/aws/accounts',
  gcp: '/cloud/gcp/accounts',
  azure: '/cloud/azure/accounts',
  clouding: '/cloud/clouding/accounts',
  github: '/repositories/github',
  gitlab: '/repositories/gitlab',
  jenkins: '/jenkins/jobs',
  docker: '/docker/containers',
  kubernetes: '/kubernetes/pods',
  k8s: '/kubernetes/pods',
  terraform: '/terraform/workspaces',
  vps: '/vps/digitalocean/overview',
  digitalocean: '/vps/digitalocean/overview',
  hetzner: '/vps/hetzner/overview',
  linode: '/vps/linode/overview',
  ovh: '/vps/ovh/overview',
  ionos: '/vps/ionos/overview',
  vultr: '/vps/vultr/overview',
  scaleway: '/vps/scaleway/overview',
}

@Injectable({ providedIn: 'root' })
export class IntegrationConnectionService {
  private readonly dialog = inject(MatDialog)
  private readonly router = inject(Router)

  navigateToWizard(alias: string): void {
    const key = alias.trim().toLowerCase()
    void this.router.navigateByUrl(wizardRouteForAlias(key))
  }

  openCloudProvider(provider: CloudProvider, options?: ConnectionOpenOptions): Observable<unknown> {
    if (options?.preferDialog) {
      return this.openWizard({ suggestedProvider: provider }, { preferDialog: true })
    }
    this.navigateToWizard(provider.toLowerCase())
    return of(null)
  }

  openVpsProvider(provider: VpsProviderId, options?: ConnectionOpenOptions): Observable<unknown> {
    if (options?.preferDialog) {
      return this.openWizard({ suggestedProvider: provider, scope: 'vps' }, { preferDialog: true })
    }
    this.navigateToWizard(provider.toLowerCase())
    return of(null)
  }

  openGithub(options?: ConnectionOpenOptions): Observable<unknown> {
    if (options?.preferDialog) {
      return this.dialog
        .open(GithubAccountDialogComponent, {
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          autoFocus: 'first-tabbable',
        })
        .afterClosed()
    }
    void this.router.navigateByUrl('/admin/configuracion/integraciones/github/conectar')
    return of(null)
  }

  openGitlab(options?: ConnectionOpenOptions): Observable<unknown> {
    if (options?.preferDialog) {
      return this.dialog
        .open(GitlabAccountDialogComponent, {
          width: '720px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          autoFocus: 'first-tabbable',
        })
        .afterClosed()
    }
    void this.router.navigateByUrl('/admin/configuracion/integraciones/gitlab/conectar')
    return of(null)
  }

  openJenkins(options?: ConnectionOpenOptions): Observable<unknown> {
    return this.openWizard({ suggestedProvider: 'JENKINS' }, options)
  }

  openDocker(options?: ConnectionOpenOptions): Observable<unknown> {
    if (options?.preferDialog) {
      return this.openWizard({ suggestedProvider: 'DOCKER', scope: 'platform' }, { preferDialog: true })
    }
    this.navigateToWizard('docker')
    return of(null)
  }

  openKubernetes(options?: ConnectionOpenOptions): Observable<unknown> {
    if (options?.preferDialog) {
      return this.openWizard({ suggestedProvider: 'KUBERNETES', scope: 'platform' }, { preferDialog: true })
    }
    this.navigateToWizard('kubernetes')
    return of(null)
  }

  openTerraform(options?: ConnectionOpenOptions): Observable<unknown> {
    return this.openWizard({ suggestedProvider: 'TERRAFORM' }, options)
  }

  openDataSource(options?: ConnectionOpenOptions): Observable<unknown> {
    return this.openWizard({ suggestedProvider: 'AWS', scope: 'cloud' }, options)
  }

  openForProviderAlias(alias: string, options?: ConnectionOpenOptions): Observable<unknown> {
    const key = alias.trim().toLowerCase()

    if (!options?.preferDialog) {
      this.navigateToWizard(key)
      return of(null)
    }

    switch (key) {
      case 'aws':
        return this.openCloudProvider('AWS', { preferDialog: true })
      case 'gcp':
        return this.openCloudProvider('GCP', { preferDialog: true })
      case 'azure':
        return this.openCloudProvider('AZURE', { preferDialog: true })
      case 'clouding':
        return this.openCloudProvider('CLOUDING', { preferDialog: true })
      case 'github':
        return this.openGithub({ preferDialog: true })
      case 'gitlab':
        return this.openGitlab({ preferDialog: true })
      case 'jenkins':
        return this.openJenkins({ preferDialog: true })
      case 'docker':
        return this.openDocker({ preferDialog: true })
      case 'kubernetes':
      case 'k8s':
        return this.openKubernetes({ preferDialog: true })
      case 'terraform':
        return this.openTerraform({ preferDialog: true })
      case 'vps':
        return this.openWizard({ suggestedProvider: 'DIGITALOCEAN', scope: 'vps' }, { preferDialog: true })
      case 'digitalocean':
        return this.openVpsProvider('DIGITALOCEAN', { preferDialog: true })
      case 'hetzner':
        return this.openVpsProvider('HETZNER', { preferDialog: true })
      case 'linode':
        return this.openVpsProvider('LINODE', { preferDialog: true })
      case 'ovh':
        return this.openVpsProvider('OVH', { preferDialog: true })
      case 'ionos':
        return this.openVpsProvider('IONOS', { preferDialog: true })
      case 'vultr':
        return this.openVpsProvider('VULTR', { preferDialog: true })
      case 'scaleway':
        return this.openVpsProvider('SCALEWAY', { preferDialog: true })
      default:
        return this.openDataSource({ preferDialog: true })
    }
  }

  fallbackRouteForAlias(alias: string): string {
    const key = alias.trim().toLowerCase()
    return PROVIDER_FALLBACK_ROUTES[key] ?? '/settings/integrations'
  }

  openForModuleId(moduleId: string, options?: ConnectionOpenOptions): Observable<unknown> {
    const id = resolveModuleId(moduleId)
    const req = getModuleRequirement(id)
    const preferDialog = options?.preferDialog ?? true

    const vpsByModule: Partial<Record<string, VpsProviderId>> = {
      ionos: 'IONOS',
      vultr: 'VULTR',
      scaleway: 'SCALEWAY',
      digitalocean: 'DIGITALOCEAN',
      hetzner: 'HETZNER',
      linode: 'LINODE',
      ovh: 'OVH',
    }
    const vpsId = vpsByModule[id]
    if (vpsId) {
      return preferDialog
        ? this.openVpsProvider(vpsId, { preferDialog: true })
        : this.openVpsProvider(vpsId)
    }
    if (id === 'clouding') {
      return preferDialog
        ? this.openCloudProvider('CLOUDING', { preferDialog: true })
        : this.openCloudProvider('CLOUDING')
    }

    if (req?.provider) {
      switch (req.provider) {
        case 'aws':
          return preferDialog
            ? this.openCloudProvider('AWS', { preferDialog: true })
            : this.openCloudProvider('AWS')
        case 'gcp':
          return preferDialog
            ? this.openCloudProvider('GCP', { preferDialog: true })
            : this.openCloudProvider('GCP')
        case 'azure':
          return preferDialog
            ? this.openCloudProvider('AZURE', { preferDialog: true })
            : this.openCloudProvider('AZURE')
        case 'clouding':
          return preferDialog
            ? this.openCloudProvider('CLOUDING', { preferDialog: true })
            : this.openCloudProvider('CLOUDING')
        case 'vps':
          return preferDialog
            ? this.openVpsProvider('DIGITALOCEAN', { preferDialog: true })
            : this.openVpsProvider('DIGITALOCEAN')
        case 'docker':
          return preferDialog
            ? this.openDocker({ preferDialog: true })
            : this.openDocker()
        case 'kubernetes':
          return preferDialog
            ? this.openKubernetes({ preferDialog: true })
            : this.openKubernetes()
        case 'terraform':
          return this.openTerraform({ preferDialog })
        case 'github':
          return this.openGithub()
        case 'gitlab':
          return this.openGitlab()
        case 'jenkins':
          return this.openJenkins({ preferDialog })
        case 'repository':
          return this.openGithub()
      }
    }

    if (req?.kind === 'ai') {
      void this.router.navigateByUrl('/settings/copilot')
      return of(null)
    }

    if (req?.kind === 'data-dependent' || req?.showOptionalCloudCta) {
      return this.openDataSource({ preferDialog })
    }

    return this.openDataSource({ preferDialog })
  }

  /** Abre modal del asistente (CTAs en empty states) */
  openWizardDialog(data: {
    suggestedProvider?: ConnectionProviderId | CloudProvider
    provider?: ConnectionProviderId | CloudProvider
    scope?: 'all' | 'cloud' | 'vps' | 'platform'
  }): Observable<unknown> {
    return this.openWizard(data, { preferDialog: true })
  }

  resolveProvider = (alias: string): ConnectionProviderId | null => resolveProviderAlias(alias)

  private openWizard(
    data: {
      suggestedProvider?: ConnectionProviderId | CloudProvider
      provider?: ConnectionProviderId | CloudProvider
      scope?: 'all' | 'cloud' | 'vps' | 'platform'
    },
    options?: ConnectionOpenOptions,
  ): Observable<unknown> {
    if (!options?.preferDialog) {
      const alias = String(data.suggestedProvider ?? data.provider ?? 'aws').toLowerCase()
      this.navigateToWizard(alias)
      return of(null)
    }
    return this.dialog
      .open(CloudAccountFormDialogComponent, {
        ...CloudAccountFormDialogComponent.dialogConfig,
        data,
      })
      .afterClosed()
  }
}
