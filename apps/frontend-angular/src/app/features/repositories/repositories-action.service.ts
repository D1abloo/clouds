import { inject, Injectable } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import { RepositoriesActionDialogComponent } from './components/repositories-action-dialog.component'
import { BranchCommitsDialogComponent } from './components/branch-commits-dialog.component'
import { GitlabOpenDialogComponent } from './components/gitlab-open-dialog.component'
import { PrDetailDialogComponent } from './components/pr-detail-dialog.component'
import { PrCommitsDialogComponent } from './components/pr-commits-dialog.component'
import { PrChecksDialogComponent } from './components/pr-checks-dialog.component'
import { PrPreviewDialogComponent } from './components/pr-preview-dialog.component'
import { PrReviewDialogComponent } from './components/pr-review-dialog.component'
import { PrMergeDialogComponent } from './components/pr-merge-dialog.component'
import { PrOpenGithubDialogComponent } from './components/pr-open-github-dialog.component'
import type { GitlabProject } from './utils/gitlab-demo-catalog'
import type { GlobalBranchRow, GlobalCommitRow } from './utils/repositories-global-demo.util'
import {
  buildBranchCompareReport,
  buildBranchDeployReport,
  buildBranchSyncReport,
  buildCommitDeployReport,
  buildCommitDetailReport,
  buildCommitDiffReport,
  buildCommitCiReport,
  buildCommitRefreshReport,
  buildCommitSourceReport,
  buildDeployCommitReport,
  buildDeployHistoryReport,
  buildDeployLogsReport,
  buildDeployNewReport,
  buildDeployPipelineReport,
  buildDeployRetryReport,
  buildDeployRollbackReport,
  buildDeployTargetReport,
  buildGithubActionsReport,
  buildGithubWebhookReport,
  buildGitlabMrsReport,
  buildGitlabPipelinesReport,
  buildOpenExternalReport,
  buildWebhookCreateReport,
  buildWebhookPayloadReport,
  buildWebhookRetryReport,
  buildWebhookTestReport,
  buildWebhookToggleReport,
  type RepoActionReport,
} from './utils/repositories-action-reports.util'

@Injectable({ providedIn: 'root' })
export class RepositoriesActionService {
  private readonly dialog = inject(MatDialog)
  private readonly demo = inject(DemoActionsService)
  private readonly toast = inject(ToastService)

  open(report: RepoActionReport): void {
    this.dialog.open(RepositoriesActionDialogComponent, {
      width: '900px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: report,
    })
  }

  run(label: string, report: RepoActionReport, successMsg?: string): void {
    this.toast.info(`${label} en curso…`)
    this.demo.simulate(label, 500, successMsg ?? `${label} completado`).subscribe({
      next: () => {
        this.open(report)
        this.toast.success(successMsg ?? `${label} completado`)
      },
      error: () => {
        this.open(report)
        this.toast.info(`${label} (demo)`)
      },
    })
  }

  createWebhook = (): void => this.run('Crear webhook', buildWebhookCreateReport())
  testWebhook = (): void => this.run('Probar webhook', buildWebhookTestReport())
  viewPayload = (row: Record<string, unknown>): void => this.run('Ver payload', buildWebhookPayloadReport(row))
  toggleWebhook = (row: Record<string, unknown>): void => this.run('Cambiar estado webhook', buildWebhookToggleReport(row))
  retryWebhook = (row: Record<string, unknown>): void => this.run('Reintentar evento', buildWebhookRetryReport(row))

  syncBranches = (): void => this.run('Sincronizar ramas', buildBranchSyncReport())
  compareBranches = (a?: GlobalBranchRow): void => this.run('Comparar ramas', buildBranchCompareReport(a))
  viewBranchCommits = (row: GlobalBranchRow): void => {
    this.toast.info(`Cargando commits · ${row.name}…`)
    this.demo.simulate('Ver commits de rama', 400).subscribe({
      next: () => {
        this.dialog.open(BranchCommitsDialogComponent, {
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          data: { branch: row },
        })
        this.toast.success(`Commits · ${row.name}`)
      },
      error: () => {
        this.dialog.open(BranchCommitsDialogComponent, {
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          data: { branch: row },
        })
      },
    })
  }
  deployBranch = (row: GlobalBranchRow): void => this.run('Desplegar rama', buildBranchDeployReport(row))

  viewCommitDetail = (row: GlobalCommitRow): void => this.run('Ver detalle commit', buildCommitDetailReport(row))
  viewCommitDiff = (row: GlobalCommitRow): void => this.run('Ver diff', buildCommitDiffReport(row))
  viewCommitCi = (row: GlobalCommitRow): void => this.run('Ver CI', buildCommitCiReport(row))
  refreshCommits = (): void => this.run('Actualizar commits', buildCommitRefreshReport())
  copyCommitSha = (row: GlobalCommitRow): void => {
    void navigator.clipboard.writeText(row.sha).then(
      () => this.toast.success(`SHA copiado · ${row.sha.slice(0, 10)}`),
      () => this.toast.info(`SHA: ${row.sha}`),
    )
  }
  deployCommit = (row: GlobalCommitRow): void => this.run('Desplegar commit', buildCommitDeployReport(row))
  openCommitSource = (row: GlobalCommitRow): void => this.run('Abrir origen', buildCommitSourceReport(row))

  private openPrDialog = (component: unknown, pr: Record<string, unknown>, width = '760px'): void => {
    this.dialog.open(component as never, {
      width,
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: { pr },
    })
  }

  viewPr = (pr: Record<string, unknown>): void => {
    this.toast.info(`Cargando PR #${pr['number']}…`)
    this.openPrDialog(PrDetailDialogComponent, pr, '820px')
  }

  viewPrCommits = (pr: Record<string, unknown>): void => {
    this.toast.info(`Commits · PR #${pr['number']}`)
    this.openPrDialog(PrCommitsDialogComponent, pr, '860px')
  }

  viewPrChecks = (pr: Record<string, unknown>): void => {
    this.openPrDialog(PrChecksDialogComponent, pr, '800px')
  }

  viewPrGithubActions = (pr: Record<string, unknown>): void => {
    this.dialog.open(PrChecksDialogComponent, {
      width: '800px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: { pr, mode: 'actions' as const },
    })
  }

  deployPrPreview = (pr: Record<string, unknown>): void => {
    this.toast.info(`Desplegando preview · PR #${pr['number']}…`)
    this.openPrDialog(PrPreviewDialogComponent, pr, '720px')
  }

  openPrGithub = (pr: Record<string, unknown>): void => {
    this.openPrDialog(PrOpenGithubDialogComponent, pr, '720px')
  }

  requestPrReview = (pr: Record<string, unknown>): void => {
    this.openPrDialog(PrReviewDialogComponent, pr, '640px')
  }

  mergePr = (pr: Record<string, unknown>): void => {
    this.openPrDialog(PrMergeDialogComponent, pr, '680px')
  }

  newDeploy = (): void => this.run('Nuevo despliegue', buildDeployNewReport())
  deployHistory = (): void => this.run('Ver historial', buildDeployHistoryReport())
  viewDeployLogs = (d: Record<string, unknown>): void => this.run('Ver logs', buildDeployLogsReport(d))
  viewDeployTarget = (d: Record<string, unknown>): void => this.run('Ver destino', buildDeployTargetReport(d))
  viewDeployCommit = (d: Record<string, unknown>): void => this.run('Ver commit', buildDeployCommitReport(d))
  viewDeployPipeline = (d: Record<string, unknown>): void => this.run('Ver pipeline', buildDeployPipelineReport(d))
  retryDeploy = (d: Record<string, unknown>): void => this.run('Reintentar despliegue', buildDeployRetryReport(d))
  rollbackDeploy = (d: Record<string, unknown>): void => this.run('Rollback demo', buildDeployRollbackReport(d))

  viewGithubActions = (repoName?: string): void => this.run('Ver GitHub Actions', buildGithubActionsReport(repoName))
  createGithubWebhook = (repoName?: string): void => this.run('Crear webhook GitHub', buildGithubWebhookReport(repoName))
  openGithub = (fullName: string): void => this.run('Abrir en GitHub', buildOpenExternalReport('github', fullName, fullName))

  viewGitlabMrs = (): void => this.run('Ver merge requests', buildGitlabMrsReport())
  viewGitlabPipelines = (): void => this.run('Ver pipelines', buildGitlabPipelinesReport())
  openGitlab = (project: GitlabProject): void => {
    this.dialog.open(GitlabOpenDialogComponent, {
      width: '720px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      data: { project },
    })
  }

  addGitlabAccount = (): void => {
    const r = buildGitlabMrsReport()
    r.title = 'Añadir cuenta GitLab'
    r.subtitle = 'PAT con scopes api, read_repository, write_repository'
    r.summary = 'Conecta tu instancia GitLab.com o self-hosted para sincronizar proyectos, pipelines y MRs.'
    this.run('Añadir cuenta GitLab', r)
  }
}
