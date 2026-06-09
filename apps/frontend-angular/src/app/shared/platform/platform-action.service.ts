import { inject, Injectable } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { delay, Observable, of, tap } from 'rxjs'
import { ToastService } from '../../core/services/toast.service'
import { PlatformActionDialogComponent } from './platform-action-dialog.component'
import { ReportDocumentDialogComponent } from './report-document-dialog.component'
import { ReportScheduleDialogComponent } from '../../features/reports/report-schedule-dialog.component'
import {
  buildHubReport,
  buildPlatformActionReport,
  type PlatformActionReport,
  type PlatformArea,
} from './platform-action-reports.util'
import { getPlatformQuickActionId, resolveHeaderActionId } from './platform-module-ops.catalog'

@Injectable({ providedIn: 'root' })
export class PlatformActionService {
  private readonly dialog = inject(MatDialog)
  private readonly toast = inject(ToastService)

  simulate = (
    label: string,
    ms = 600,
    successMsg?: string,
  ): Observable<{ ok: true; action: string }> =>
    of({ ok: true as const, action: label }).pipe(
      delay(ms),
      tap(() => this.toast.success(successMsg ?? `${label} completado`)),
    )

  open(report: PlatformActionReport): void {
    this.dialog.open(PlatformActionDialogComponent, {
      width: '900px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      data: report,
    })
  }

  openReportDocument = (row?: Record<string, unknown>, mode: 'view' | 'download' | 'generate' = 'view'): void => {
    this.dialog.open(ReportDocumentDialogComponent, {
      width: 'min(920px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '94vh',
      panelClass: 'report-document-dialog-panel',
      data: { row, mode },
    })
  }

  openReportSchedule = (row?: Record<string, unknown>): void => {
    this.dialog.open(ReportScheduleDialogComponent, {
      width: 'min(680px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'report-schedule-dialog-panel',
      data: { row },
    })
  }

  run(label: string, report: PlatformActionReport, successMsg?: string): void {
    this.toast.info(`${label} en curso…`)
    setTimeout(() => {
      this.open(report)
      this.toast.success(successMsg ?? `${label} completado`)
    }, 500)
  }

  runModuleAction(
    moduleId: string,
    actionLabel: string,
    tabLabel?: string,
    row?: Record<string, unknown>,
    onRefresh?: () => void,
  ): void {
    if (actionLabel === 'Refresh' || actionLabel === 'Actualizar') {
      onRefresh?.()
      this.toast.success('Datos actualizados')
      return
    }
    if (moduleId === 'reports') {
      if (actionLabel.includes('Programar')) {
        this.openReportSchedule(row)
        return
      }
      const mode =
        actionLabel.includes('Generar') ? 'generate'
        : actionLabel.includes('PDF') || actionLabel.includes('Descargar') ? 'download'
        : 'view'
      this.toast.info(`${actionLabel}…`)
      this.openReportDocument(row ?? { type: 'cost', name: 'Informe ejecutivo', period: 'Junio 2026', status: 'success' }, mode)
      this.toast.success(`${actionLabel} completado`)
      return
    }
    const actionId = resolveHeaderActionId(actionLabel)
    const report = buildPlatformActionReport(moduleId, actionId, { actionLabel, tabLabel, row })
    this.run(actionLabel, report)
  }

  runRowAction(
    moduleId: string,
    actionId: string,
    row: Record<string, unknown>,
    tabLabel?: string,
    actionLabel?: string,
  ): void {
    if (moduleId === 'reports' && actionId === 'schedule') {
      this.openReportSchedule(row)
      return
    }
    if (moduleId === 'reports' && ['detail', 'download', 'export'].includes(actionId)) {
      const mode = actionId === 'download' || actionId === 'export' ? 'download' : 'view'
      this.openReportDocument(row, mode)
      return
    }
    if (actionId === 'copy') {
      const prefix = String(row['secret'] ?? row['prefix'] ?? row['name'] ?? '')
      void navigator.clipboard.writeText(prefix).then(
        () => this.toast.success('Copiado al portapapeles'),
        () => this.toast.info(prefix || 'Valor copiado (demo)'),
      )
      return
    }
    const label = actionLabel ?? actionId
    const report = buildPlatformActionReport(moduleId, actionId, { actionLabel: label, tabLabel, row })
    this.run(label, report)
  }

  runQuickAction(moduleId: string, label: string, tabLabel?: string): void {
    if (moduleId === 'reports') {
      const row =
        label.includes('ejecutivo') || label.includes('Ejecutivo')
          ? { type: 'cost', name: 'Resumen ejecutivo de costes', period: 'Junio 2026', status: 'success' }
          : { type: 'activity', name: 'Actividad operativa', period: 'Semana actual', status: 'success' }
      this.openReportDocument(row, label.includes('CSV') ? 'download' : 'view')
      return
    }
    const actionId = getPlatformQuickActionId(label)
    const report = buildPlatformActionReport(moduleId, actionId, { actionLabel: label, tabLabel })
    this.run(label, report)
  }

  runHubAction(
    module: string,
    section: string,
    actionLabel: string,
    row?: { name: string; status: string; detail: string; cost?: string },
    onRefresh?: () => void,
  ): void {
    if (actionLabel === 'Refresh' || actionLabel === 'Actualizar') {
      onRefresh?.()
      this.toast.success('Vista actualizada')
      return
    }
    const actionId = resolveHeaderActionId(actionLabel)
    const report = buildHubReport(module, section, actionId, row)
    this.run(actionLabel, report)
  }

  runPageAction(
    moduleId: string,
    actionId: string,
    actionLabel: string,
    opts?: { row?: Record<string, unknown>; tabLabel?: string; area?: PlatformArea; count?: number },
  ): void {
    const report = buildPlatformActionReport(moduleId, actionId, {
      actionLabel,
      row: opts?.row ?? (opts?.count != null ? { count: opts.count } : undefined),
      tabLabel: opts?.tabLabel,
      area: opts?.area,
    })
    this.run(actionLabel, report)
  }

  openDetail(moduleId: string, row: Record<string, unknown>, tabLabel?: string): void {
    if (moduleId === 'reports') {
      this.openReportDocument(row, 'view')
      return
    }
    const report = buildPlatformActionReport(moduleId, 'detail', { tabLabel, row })
    this.open(report)
  }
}
