import { inject, Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { MatDialog } from '@angular/material/dialog'
import { Observable, forkJoin, of } from 'rxjs'
import { catchError, switchMap } from 'rxjs/operators'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import { VpsService } from '../../core/services/vps.service'
import {
  fallbackActionSpec,
  getInfraActionSpec,
} from './infrastructure-actions.catalog'
import {
  InfrastructureActionInfoDialogComponent,
  type InfrastructureActionInfoDialogResult,
} from './infrastructure-action-info.dialog'
import {
  InfrastructureResourceDetailDialogComponent,
  type InfrastructureResourceDetailDialogData,
} from './infrastructure-resource-detail.dialog'
import type { InfraOperation, InfraResourceRow } from './infrastructure-workspace.types'
import {
  buildInfraRowFromAdd,
  buildMetrics24hReport,
  buildPortScanReport,
  buildValidateResult,
  buildValidateResultFromAdd,
  mapPortCatalog,
  resolveVpsHost,
  scanPortsForHost,
} from './infrastructure-vps-operations.util'
import {
  VpsDiscoverySummaryDialogComponent,
  VpsMetrics24hDialogComponent,
  VpsPortScanDialogComponent,
  VpsValidateDialogComponent,
  type VpsDiscoverySummaryAction,
} from './infrastructure-vps-operations.dialog'
import type { VpsHostRow } from './infrastructure-workspace.builders'
import { buildPortAuditReport } from './infrastructure-vps-port-audit.util'
import { VpsPortAuditDialogComponent } from './infrastructure-vps-port-audit.dialog'
import { buildBatchValidateReport } from './infrastructure-vps-batch-validate.util'
import { VpsBatchValidateDialogComponent } from './infrastructure-vps-batch-validate.dialog'
import {
  buildSshRotationReport,
  type SshRotationApplyResult,
  type VpsDemoSshKey,
} from './infrastructure-vps-ssh-rotation.util'
import { VpsSshRotationDialogComponent } from './infrastructure-vps-ssh-rotation.dialog'
import type { VpsAddDialogResult } from './vps-add.dialog'
import type { VpsDiscoveryResult } from './vps-add-discovery.service'
import {
  buildModuleHeaderReport,
  buildModuleRowReport,
  type ModuleOperationReport,
} from './infrastructure-module-operations.util'
import { ModuleOperationDialogComponent } from './infrastructure-module-operation.dialog'
import { ModuleFormDialogComponent } from './infrastructure-module-form.dialog'

export interface InfraActionContext {
  moduleId: string
  logo?: NavLogoKey
  logos?: NavLogoKey[]
  tabId?: string
}

@Injectable({ providedIn: 'root' })
export class InfrastructureActionService {
  private readonly dialog = inject(MatDialog)
  private readonly demo = inject(DemoActionsService)
  private readonly toast = inject(ToastService)
  private readonly vps = inject(VpsService)
  private readonly router = inject(Router)

  openResourceDetail(data: InfrastructureResourceDetailDialogData): void {
    this.dialog.open(InfrastructureResourceDetailDialogComponent, {
      width: '680px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      data,
    })
  }

  validateAddPayload(payload: VpsAddDialogResult): Observable<void> {
    return new Observable((subscriber) => {
      this.demo.simulate(`Validar SSH · ${payload.name}`, 650).subscribe({
        next: () => {
          this.openValidateDialog(buildValidateResultFromAdd(payload))
          this.toast.success(`Conexión SSH validada · ${payload.name}`)
          subscriber.next()
          subscriber.complete()
        },
        error: () => {
          this.openValidateDialog(buildValidateResultFromAdd(payload))
          this.toast.success(`Conexión SSH validada (demo) · ${payload.name}`)
          subscriber.next()
          subscriber.complete()
        },
      })
    })
  }

  openDiscoverySummary(result: VpsDiscoveryResult, payload: VpsAddDialogResult): void {
    const row = buildInfraRowFromAdd(payload, result.host.id)
    row.metrics = [
      { label: 'CPU', value: result.host.cpu ?? 0 },
      { label: 'RAM', value: result.host.ram ?? 0 },
      { label: 'Disco', value: result.host.disk ?? 0 },
    ]
    if (result.ports.length) {
      row.hostPortScan = mapPortCatalog(result.ports, result.host.name)
    }

    const ref = this.dialog.open(VpsDiscoverySummaryDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      data: {
        hostName: result.host.name,
        hostIp: result.host.host,
        tasks: result.tasks,
        canOpenMetrics: payload.collectMetrics,
        canOpenPortScan: payload.runPortScan,
      },
    })

    ref.afterClosed().subscribe((action: VpsDiscoverySummaryAction | undefined) => {
      const host = { hostName: result.host.name, hostIp: result.host.host }
      if (action === 'metrics') this.openMetrics24h(host, row)
      if (action === 'ports') this.openPortScan(host, row)
    })
  }

  runRowOperation(op: InfraOperation, row: InfraResourceRow, ctx: InfraActionContext & { tabId?: string }): void {
    if (op.disabled) {
      this.toast.info(op.disabledReason ?? `${op.label} no disponible para este recurso`)
      return
    }
    if (op.confirm && !confirm(op.confirm)) return

    if (ctx.moduleId === 'vps') {
      const handled = this.runVpsOperation(op.id, row)
      if (handled) return
    }

    if (op.id === 'scale-form') {
      this.openScaleForm(row, ctx)
      return
    }
    if (op.id === 'expand-form') {
      this.openExpandForm(row, ctx)
      return
    }
    if (op.id === 'simulate-form') {
      this.openSimulateForm(row, ctx)
      return
    }
    if (op.id === 'thresholds-form') {
      this.openThresholdsForm(row, ctx)
      return
    }

    const moduleReport = buildModuleRowReport(ctx.moduleId, op.id, row, ctx.tabId ?? 'default')
    if (moduleReport) {
      this.runModuleOperationSimulate(op.label, row.title, () => this.openModuleReport(moduleReport))
      return
    }

    this.demo.simulate(`${op.label} · ${row.title}`, 700, `${op.label} completado`).subscribe(() => {
      this.toast.success(`${op.label}: ${row.title}`)
    })
  }

  private openScaleForm(row: InfraResourceRow, ctx: InfraActionContext & { tabId?: string }): void {
    const current = Number(row.fields.find((f) => /réplica|replica/i.test(f.label))?.value ?? 3)
    const ref = this.dialog.open(ModuleFormDialogComponent, {
      width: '420px',
      maxWidth: '96vw',
      data: { kind: 'scale', title: 'Escalar réplicas', resourceName: row.title, replicas: current },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result?.replicas) return
      this.runModuleOperationSimulate('Escalar réplicas', row.title, () => {
        const report = buildModuleRowReport(ctx.moduleId, 'scale-form', row, ctx.tabId ?? 'default', { replicas: result.replicas })
        if (report) this.openModuleReport(report)
      })
    })
  }

  private openExpandForm(row: InfraResourceRow, ctx: InfraActionContext & { tabId?: string }): void {
    const sizeMatch = row.fields.find((f) => /tamaño|size/i.test(f.label))?.value?.match(/\d+/)
    const current = sizeMatch ? Number(sizeMatch[0]) : 500
    const ref = this.dialog.open(ModuleFormDialogComponent, {
      width: '420px',
      maxWidth: '96vw',
      data: { kind: 'expand', title: 'Ampliar capacidad', resourceName: row.title, sizeGb: current + 250 },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result?.sizeGb) return
      this.runModuleOperationSimulate('Ampliar capacidad', row.title, () => {
        const report = buildModuleRowReport(ctx.moduleId, 'expand-form', row, ctx.tabId ?? 'default', { sizeGb: result.sizeGb })
        if (report) this.openModuleReport(report)
      })
    })
  }

  private openSimulateForm(row: InfraResourceRow, ctx: InfraActionContext & { tabId?: string }): void {
    const ref = this.dialog.open(ModuleFormDialogComponent, {
      width: '420px',
      maxWidth: '96vw',
      data: { kind: 'simulate', title: 'Simular crecimiento', resourceName: row.title, growthPct: 25, periodDays: 90 },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result?.growthPct) return
      this.runModuleOperationSimulate('Simular crecimiento', row.title, () => {
        const report = buildModuleRowReport(ctx.moduleId, 'simulate-form', row, ctx.tabId ?? 'default', {
          growthPct: result.growthPct,
          periodDays: result.periodDays,
        })
        if (report) this.openModuleReport(report)
      })
    })
  }

  private openThresholdsForm(row: InfraResourceRow, ctx: InfraActionContext & { tabId?: string }): void {
    const ref = this.dialog.open(ModuleFormDialogComponent, {
      width: '420px',
      maxWidth: '96vw',
      data: { kind: 'thresholds', title: 'Ajustar umbrales', resourceName: row.title },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      this.runModuleOperationSimulate('Ajustar umbrales', row.title, () => {
        const report = buildModuleRowReport(ctx.moduleId, 'thresholds-form', row, ctx.tabId ?? 'default', {
          cpuThreshold: result.cpuThreshold,
          ramThreshold: result.ramThreshold,
          diskThreshold: result.diskThreshold,
        })
        if (report) this.openModuleReport(report)
      })
    })
  }

  private runVpsOperation(opId: string, row: InfraResourceRow): boolean {
    const host = resolveVpsHost(row)

    switch (opId) {
      case 'ssh':
        return this.openSsh(host)
      case 'validate':
        return this.validateAccess(host, row)
      case 'metrics':
        return this.openMetrics24h(host, row)
      case 'scan':
        return this.openPortScan(host, row)
      default:
        return false
    }
  }

  private openSsh(host: ReturnType<typeof resolveVpsHost>): boolean {
    if (!host.hostId) {
      this.toast.info('Selecciona un servidor VPS con host registrado')
      return true
    }
    this.toast.success(`Abriendo terminal SSH · ${host.hostName}`)
    void this.router.navigate(['/terminal', host.hostId])
    return true
  }

  private validateAccess(host: ReturnType<typeof resolveVpsHost>, row: InfraResourceRow): boolean {
    if (!host.hostId) {
      this.openValidateDialog(buildValidateResult(row))
      return true
    }

    this.vps.validate(host.hostId).subscribe({
      next: () => {
        this.openValidateDialog(buildValidateResult(row))
        this.toast.success(`SSH validado: ${host.hostName}`)
      },
      error: () => {
        this.demo.simulate(`Validar ${host.hostName}`, 650).subscribe(() => {
          this.openValidateDialog(buildValidateResult(row))
          this.toast.success(`SSH validado (demo): ${host.hostName}`)
        })
      },
    })
    return true
  }

  private openMetrics24h(host: ReturnType<typeof resolveVpsHost>, row: InfraResourceRow): boolean {
    this.dialog.open(VpsMetrics24hDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      data: buildMetrics24hReport(row, host),
    })
    return true
  }

  private openPortScan(host: ReturnType<typeof resolveVpsHost>, row: InfraResourceRow): boolean {
    const ports = row.hostPortScan?.length ? row.hostPortScan : scanPortsForHost(host.hostName)
    const report = buildPortScanReport(host, ports)

    this.dialog.open(VpsPortScanDialogComponent, {
      width: '820px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      data: report,
    })
    return true
  }

  private openValidateDialog(result: ReturnType<typeof buildValidateResult>): void {
    this.dialog.open(VpsValidateDialogComponent, {
      width: '680px',
      maxWidth: '96vw',
      maxHeight: '90vh',
      data: result,
    })
  }

  runPortAudit(hosts: VpsHostRow[], portCatalog: Record<string, unknown>[]): void {
    const duration = 1800 + hosts.length * 400
    this.toast.info(`Auditoría de puertos en curso · ${hosts.length} hosts…`)
    this.demo.simulate('Auditoría de puertos', duration, 'Escaneo de flota completado').subscribe({
      next: () => {
        const report = buildPortAuditReport(hosts, portCatalog)
        this.dialog.open(VpsPortAuditDialogComponent, {
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          data: report,
        })
        this.toast.success(
          `Auditoría completada · ${report.violations.length} violaciones · ${report.totalOpenPorts} puertos abiertos`,
        )
      },
      error: () => {
        const report = buildPortAuditReport(hosts, portCatalog)
        this.dialog.open(VpsPortAuditDialogComponent, {
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          data: report,
        })
        this.toast.info(`Auditoría (demo) · ${report.hostCount} hosts`)
      },
    })
  }

  runBatchValidate(hosts: VpsHostRow[]): void {
    if (!hosts.length) {
      this.toast.info('No hay hosts VPS en el inventario')
      return
    }

    const spec = getInfraActionSpec('vps', 'Validar todos') ?? fallbackActionSpec('Validar todos')
    const enrichedSpec = {
      ...spec,
      impact: spec.impact.replace('{{count}}', String(hosts.length)),
    }

    const ref = this.dialog.open(InfrastructureActionInfoDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      data: { spec: enrichedSpec, moduleId: 'vps', logos: ['docker', 'kubernetes'] },
    })

    ref.afterClosed().subscribe((result: InfrastructureActionInfoDialogResult | undefined) => {
      if (result !== 'run') return
      this.executeBatchValidate(hosts)
    })
  }

  private executeBatchValidate(hosts: VpsHostRow[]): void {
    const duration = 2000 + hosts.length * 450
    this.toast.info(`Validación SSH en curso · ${hosts.length} hosts…`)

    const validations$ = forkJoin(
      hosts.map((host) =>
        this.vps.validate(host.id).pipe(catchError(() => of(null))),
      ),
    )

    validations$.subscribe()

    this.demo.simulate('Validar todos los VPS', duration, 'Validación batch completada').subscribe({
      next: () => this.openBatchValidateReport(hosts),
      error: () => this.openBatchValidateReport(hosts),
    })
  }

  private openBatchValidateReport(hosts: VpsHostRow[]): void {
    const report = buildBatchValidateReport(hosts)
    this.dialog.open(VpsBatchValidateDialogComponent, {
      width: '920px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: report,
    })
    const summary =
      report.hostsFail > 0
        ? `Validación completada · ${report.hostsFail} fallo(s) · ${report.hostsWarn} en revisión`
        : `Validación completada · ${report.hostsOk}/${report.hostCount} hosts OK · lat. media ${report.avgLatencyMs} ms`
    this.toast.success(summary)
  }

  runSshKeyRotation(
    hosts: VpsHostRow[],
    sshKeys: VpsDemoSshKey[],
    onKeyRotated?: (result: SshRotationApplyResult) => void,
  ): void {
    const duration = 2400 + hosts.length * 380
    this.toast.info(`Análisis de claves SSH en curso · ${hosts.length} hosts…`)
    this.demo.simulate('Rotar claves SSH', duration, 'Análisis SSH completado').subscribe({
      next: () => this.openSshRotationReport(hosts, sshKeys, onKeyRotated),
      error: () => this.openSshRotationReport(hosts, sshKeys, onKeyRotated),
    })
  }

  private openSshRotationReport(
    hosts: VpsHostRow[],
    sshKeys: VpsDemoSshKey[],
    onKeyRotated?: (result: SshRotationApplyResult) => void,
  ): void {
    const report = buildSshRotationReport(hosts, sshKeys)
    this.dialog.open(VpsSshRotationDialogComponent, {
      width: '920px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: { report, onKeyRotated },
    })
    const summary =
      report.legacyKeys > 0
        ? `Análisis completado · ${report.legacyKeys} legacy · ${report.keysToRotate} rotación(es) planificada(s)`
        : `Análisis completado · ${report.keysToRotate} clave(s) a rotar · ${report.affectedHosts} hosts`
    this.toast.success(summary)
  }

  runModuleHeaderAction(label: string, ctx: InfraActionContext, onRun?: () => void): void {
    const dedicated = buildModuleHeaderReport(ctx.moduleId, label)
    if (dedicated) {
      const spec = getInfraActionSpec(ctx.moduleId, label) ?? fallbackActionSpec(label)
      const ref = this.dialog.open(InfrastructureActionInfoDialogComponent, {
        width: '560px',
        maxWidth: '96vw',
        data: { spec, moduleId: ctx.moduleId, logo: ctx.logo, logos: ctx.logos },
      })
      ref.afterClosed().subscribe((result: InfrastructureActionInfoDialogResult | undefined) => {
        if (result !== 'run') return
        this.runModuleOperationSimulate(label, ctx.moduleId, () => {
          onRun?.()
          this.openModuleReport(dedicated)
        })
      })
      return
    }
    this.confirmAndRunAction(label, ctx, onRun).subscribe()
  }

  private runModuleOperationSimulate(label: string, target: string, onDone: () => void): void {
    this.toast.info(`${label} en curso…`)
    this.demo.simulate(`${label} · ${target}`, 900, `${label} completado`).subscribe({
      next: () => {
        onDone()
        this.toast.success(`${label} completado`)
      },
      error: () => {
        onDone()
        this.toast.info(`${label} (demo)`)
      },
    })
  }

  private openModuleReport(report: ModuleOperationReport): void {
    this.dialog.open(ModuleOperationDialogComponent, {
      width: '920px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: report,
    })
  }

  confirmAndRunAction(label: string, ctx: InfraActionContext, onRun?: () => void): Observable<void> {
    const spec = getInfraActionSpec(ctx.moduleId, label) ?? fallbackActionSpec(label)
    const ref = this.dialog.open(InfrastructureActionInfoDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      data: { spec, moduleId: ctx.moduleId, logo: ctx.logo, logos: ctx.logos },
    })

    return ref.afterClosed().pipe(
      switchMap((result: InfrastructureActionInfoDialogResult | undefined) => {
        if (result !== 'run') return of(undefined)
        return new Observable<void>((subscriber) => {
          this.demo.simulate(label, 900, `${label} completado`).subscribe({
            next: () => {
              this.toast.success(`${label} ejecutado correctamente`)
              onRun?.()
              subscriber.next()
              subscriber.complete()
            },
            error: () => {
              this.toast.info(`${label} (demo)`)
              onRun?.()
              subscriber.next()
              subscriber.complete()
            },
          })
        })
      }),
    )
  }
}
