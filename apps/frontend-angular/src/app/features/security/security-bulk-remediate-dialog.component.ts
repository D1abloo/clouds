import { Component, computed, inject, signal } from '@angular/core'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { ToastService } from '../../core/services/toast.service'
import { SecurityCenterService } from './security-center.service'
import { securitySeverityLabel } from './security.config'

@Component({
  selector: 'app-security-bulk-remediate-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <article class="sec-bulk">
      <header class="sec-bulk__head">
        <mat-icon>healing</mat-icon>
        <div>
          <h2>Remediación masiva</h2>
          <p>Selecciona los hallazgos remediables y confirma antes de ejecutar.</p>
        </div>
      </header>
      <mat-dialog-content class="sec-bulk__body">
        @if (phase() === 'select') {
          <ul class="sec-bulk__list">
            @for (item of remediable(); track item.id) {
              <li>
                <label>
                  <input type="checkbox" [checked]="selected().has(item.id)" (change)="toggle(item.id)" />
                  <div>
                    <strong>{{ item.finding }}</strong>
                    <span>{{ item.resource }} · {{ severityLabel(item.severity) }}</span>
                    <em>{{ item.remediationAction }}</em>
                  </div>
                </label>
              </li>
            } @empty {
              <li class="sec-bulk__empty">No hay hallazgos remediables pendientes.</li>
            }
          </ul>
        } @else {
          <p class="sec-bulk__progress-label">{{ phase() === 'running' ? 'Remediando…' : 'Remediación completada' }}</p>
          <mat-progress-bar [mode]="phase() === 'running' ? 'indeterminate' : 'determinate'" [value]="100" />
          <p class="sec-bulk__count">{{ remediatedCount() }} de {{ selected().size }} remediados</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        @if (phase() === 'select') {
          <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button color="primary" type="button" [disabled]="selected().size === 0" (click)="handleRun()">
            Remediar ({{ selected().size }})
          </button>
        } @else {
          <button mat-flat-button color="primary" type="button" (click)="dialogRef.close(true)">Cerrar</button>
        }
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-bulk { min-width: min(520px, 94vw); max-height: 80vh; color: #0f172a; }
    .sec-bulk__head { display: flex; gap: 0.5rem; align-items: flex-start; padding-bottom: 0.55rem; border-bottom: 1px solid #e2e8f0; }
    .sec-bulk__head mat-icon { color: #ec4899; }
    .sec-bulk__head h2 { margin: 0; font-size: 0.95rem; font-weight: 700; }
    .sec-bulk__head p { margin: 0.15rem 0 0; font-size: 0.68rem; color: #64748b; }
    .sec-bulk__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; max-height: 50vh; overflow-y: auto; }
    .sec-bulk__list label { display: flex; gap: 0.45rem; padding: 0.45rem 0.55rem; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer; }
    .sec-bulk__list label:has(input:checked) { border-color: #ec4899; background: #fdf2f8; }
    .sec-bulk__list strong { display: block; font-size: 0.72rem; }
    .sec-bulk__list span { display: block; font-size: 0.62rem; color: #64748b; }
    .sec-bulk__list em { display: block; font-size: 0.6rem; color: #94a3b8; font-style: normal; margin-top: 0.15rem; }
    .sec-bulk__empty { padding: 1rem; text-align: center; color: #94a3b8; font-size: 0.72rem; }
    .sec-bulk__progress-label { font-size: 0.75rem; font-weight: 600; margin: 0 0 0.5rem; }
    .sec-bulk__count { font-size: 0.68rem; color: #64748b; margin: 0.5rem 0 0; }
  `,
})
export class SecurityBulkRemediateDialogComponent {
  readonly dialogRef = inject(MatDialogRef<SecurityBulkRemediateDialogComponent>)
  private readonly svc = inject(SecurityCenterService)
  private readonly toast = inject(ToastService)

  readonly phase = signal<'select' | 'running' | 'done'>('select')
  readonly selected = signal(new Set<string>())
  readonly remediatedCount = signal(0)
  readonly severityLabel = securitySeverityLabel

  readonly remediable = computed(() =>
    this.svc.risks().filter(
      (r) => r.remediable && !['completed', 'accepted_risk', 'snoozed'].includes(r.status),
    ),
  )

  toggle = (id: string): void => {
    this.selected.update((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  handleRun = (): void => {
    const ids = [...this.selected()]
    if (!ids.length) return
    this.phase.set('running')
    let done = 0
    const interval = setInterval(() => {
      if (done >= ids.length) {
        clearInterval(interval)
        this.phase.set('done')
        this.svc.refreshKpis()
        this.toast.success(`${ids.length} hallazgos remediados`)
        return
      }
      const id = ids[done]
      this.svc.updateRisk(id, { status: 'completed' })
      this.svc.appendHistory(id, 'Remediado (masivo)', 'admin@cloudops')
      done += 1
      this.remediatedCount.set(done)
    }, 600)
  }
}
