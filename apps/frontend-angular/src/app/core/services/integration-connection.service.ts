import { inject, Injectable } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { Observable } from 'rxjs'
import { CloudAccountFormDialogComponent } from '../../features/cloud-accounts/cloud-account-form-dialog.component'
import type { ConnectionProviderId } from '../../features/cloud-accounts/cloud-account-wizard.config'
import { GithubAccountDialogComponent } from '../../features/repositories/components/github-account-dialog.component'
import { GitlabAccountDialogComponent } from '../../features/repositories/components/gitlab-account-dialog.component'
import type { CloudProvider } from '../models/api.models'
import {
  getModuleRequirement,
  resolveModuleId,
} from '../routing/module-requirements.util'

export type VpsProviderId = 'DIGITALOCEAN' | 'HETZNER' | 'LINODE' | 'OVH'

const PROVIDER_FALLBACK_ROUTES: Record<string, string> = {
  aws: '/cloud/aws/accounts',
  gcp: '/cloud/gcp/accounts',
  azure: '/cloud/azure/accounts',
  github: '/repositories/github',
  gitlab: '/repositories/gitlab',
  jenkins: '/jenkins/jobs',
  docker: '/docker/containers',
  kubernetes: '/kubernetes/pods',
  k8s: '/kubernetes/pods',
  terraform: '/terraform/workspaces',
  vps: '/vps/digitalocean/accounts',
  digitalocean: '/vps/digitalocean/accounts',
  hetzner: '/vps/hetzner/accounts',
  linode: '/vps/linode/accounts',
  ovh: '/vps/ovh/accounts',
}

@Injectable({ providedIn: 'root' })
export class IntegrationConnectionService {
  private readonly dialog = inject(MatDialog)

  openCloudProvider(provider: CloudProvider): Observable<unknown> {
    return this.openWizard({ suggestedProvider: provider })
  }

  openVpsProvider(provider: VpsProviderId): Observable<unknown> {
    return this.openWizard({ suggestedProvider: provider })
  }

  openGithub(): Observable<unknown> {
    return this.dialog
      .open(GithubAccountDialogComponent, {
        width: '920px',
        maxWidth: '96vw',
        maxHeight: '92vh',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
  }

  openGitlab(): Observable<unknown> {
    return this.dialog
      .open(GitlabAccountDialogComponent, {
        width: '720px',
        maxWidth: '96vw',
        maxHeight: '92vh',
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
  }

  openJenkins(): Observable<unknown> {
    return this.openWizard({ suggestedProvider: 'JENKINS' })
  }

  openDocker(): Observable<unknown> {
    return this.openWizard({ suggestedProvider: 'DOCKER' })
  }

  openKubernetes(): Observable<unknown> {
    return this.openWizard({ suggestedProvider: 'KUBERNETES' })
  }

  openTerraform(): Observable<unknown> {
    return this.openWizard({ suggestedProvider: 'TERRAFORM' })
  }

  openDataSource(): Observable<unknown> {
    return this.openWizard({ suggestedProvider: 'AWS' })
  }

  openForProviderAlias(alias: string): Observable<unknown> {
    const key = alias.trim().toLowerCase()
    switch (key) {
      case 'aws':
        return this.openCloudProvider('AWS')
      case 'gcp':
        return this.openCloudProvider('GCP')
      case 'azure':
        return this.openCloudProvider('AZURE')
      case 'github':
        return this.openGithub()
      case 'gitlab':
        return this.openGitlab()
      case 'jenkins':
        return this.openJenkins()
      case 'docker':
        return this.openDocker()
      case 'kubernetes':
      case 'k8s':
        return this.openKubernetes()
      case 'terraform':
        return this.openTerraform()
      case 'vps':
        return this.openVpsProvider('DIGITALOCEAN')
      case 'digitalocean':
        return this.openVpsProvider('DIGITALOCEAN')
      case 'hetzner':
        return this.openVpsProvider('HETZNER')
      case 'linode':
        return this.openVpsProvider('LINODE')
      case 'ovh':
        return this.openVpsProvider('OVH')
      default:
        return this.openDataSource()
    }
  }

  fallbackRouteForAlias(alias: string): string {
    const key = alias.trim().toLowerCase()
    return PROVIDER_FALLBACK_ROUTES[key] ?? '/settings/integrations'
  }

  openForModuleId(moduleId: string): Observable<unknown> {
    const id = resolveModuleId(moduleId)
    const req = getModuleRequirement(id)

    if (req?.provider) {
      switch (req.provider) {
        case 'aws':
          return this.openCloudProvider('AWS')
        case 'gcp':
          return this.openCloudProvider('GCP')
        case 'azure':
          return this.openCloudProvider('AZURE')
        case 'vps':
          return this.openVpsProvider('DIGITALOCEAN')
        case 'docker':
          return this.openDocker()
        case 'kubernetes':
          return this.openKubernetes()
        case 'terraform':
          return this.openTerraform()
        case 'github':
          return this.openGithub()
        case 'gitlab':
          return this.openGitlab()
        case 'jenkins':
          return this.openJenkins()
        case 'repository':
          return this.openGithub()
      }
    }

    if (req?.kind === 'data-dependent' || req?.showOptionalCloudCta) {
      return this.openDataSource()
    }

    return this.openDataSource()
  }

  private openWizard(data: {
    suggestedProvider?: ConnectionProviderId | CloudProvider
    provider?: ConnectionProviderId | CloudProvider
  }): Observable<unknown> {
    return this.dialog
      .open(CloudAccountFormDialogComponent, {
        width: '760px',
        maxWidth: '95vw',
        panelClass: 'cloud-account-wizard-panel',
        data,
      })
      .afterClosed()
  }
}
