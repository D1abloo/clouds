import type { CloudProvider } from '../core/models/api.models'
import type { TerraformRunItem, TerraformWorkspaceItem } from '../core/stores/terraform-run.store'
import { defaultTerraformLaunchDetails, launchRecordsFromDetails } from './terraform-launches.demo'

export interface TerraformFolder {
  id: string
  path: string
  label: string
  icon: string
  hint: string
}

export interface TerraformLaunchRecord {
  id: string
  name: string
  folderId: string
  workspaceId: string
  workspaceName: string
  provider: CloudProvider
  status: string
  createdAt: string
  instanceName: string
}

export const TERRAFORM_FOLDERS: TerraformFolder[] = [
  {
    id: 'apps',
    path: '/cloudops/apps',
    label: 'Aplicaciones',
    icon: 'apps',
    hint: 'APIs, frontends y servicios desplegados',
  },
  {
    id: 'infra',
    path: '/cloudops/infra',
    label: 'Infraestructura',
    icon: 'landscape',
    hint: 'Red, compute base y plataforma',
  },
  {
    id: 'data',
    path: '/cloudops/data',
    label: 'Datos',
    icon: 'storage',
    hint: 'Bases de datos y pipelines',
  },
  {
    id: 'security',
    path: '/cloudops/security',
    label: 'Seguridad',
    icon: 'security',
    hint: 'Escaneos y cumplimiento',
  },
]

export type TerraformFolderNode = {
  folder: TerraformFolder
  workspaces: TerraformWorkspaceItem[]
  launches: TerraformLaunchRecord[]
  expanded: boolean
}

export const buildFolderTree = (
  folders: TerraformFolder[],
  workspaces: TerraformWorkspaceItem[],
  launches: TerraformLaunchRecord[],
  expandedIds: ReadonlySet<string>,
  search = '',
): TerraformFolderNode[] => {
  const term = search.trim().toLowerCase()
  return folders
    .map((folder) => {
      const wsInFolder = workspaces.filter((w) => w.folderId === folder.id)
      const launchesInFolder = launches.filter((l) => l.folderId === folder.id)
      if (!term) {
        return {
          folder,
          workspaces: wsInFolder,
          launches: launchesInFolder,
          expanded: expandedIds.has(folder.id),
        }
      }
      const ws = wsInFolder.filter(
        (w) =>
          w.name.toLowerCase().includes(term) ||
          w.provider.toLowerCase().includes(term) ||
          folder.label.toLowerCase().includes(term),
      )
      const ls = launchesInFolder.filter(
        (l) =>
          l.name.toLowerCase().includes(term) ||
          l.instanceName.toLowerCase().includes(term) ||
          l.workspaceName.toLowerCase().includes(term),
      )
      if (ws.length === 0 && ls.length === 0 && !folder.label.toLowerCase().includes(term)) {
        return null
      }
      return {
        folder,
        workspaces: ws,
        launches: ls,
        expanded: true,
      }
    })
    .filter((n): n is TerraformFolderNode => n !== null)
}

export const defaultDemoLaunches = (): TerraformLaunchRecord[] =>
  launchRecordsFromDetails(defaultTerraformLaunchDetails())

export const demoRunFromLaunch = (launch: TerraformLaunchRecord): TerraformRunItem => ({
  id: launch.id,
  workspaceName: launch.workspaceName,
  provider: launch.provider,
  status: launch.status,
  createdAt: launch.createdAt,
  folderId: launch.folderId,
  instanceName: launch.instanceName,
  label: launch.name,
})
