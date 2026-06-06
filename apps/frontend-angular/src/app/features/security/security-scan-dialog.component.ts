import { Component, inject, signal } from '@angular/core'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { SecurityCenterService } from './security-center.service'
import { ToastService } from '../../core/services/toast.service'

const SCAN_STEPS = [
  { label: 'Preparando escaneo', icon: 'hourglass_top' },
  { label: 'Analizando recursos', icon: 'dns' },
  { label: 'Detectando hallazgos', icon: 'gpp_maybe' },
  { label: 'Escaneando red y puertos', icon: 'settings_ethernet' },
  { label: 'Revisando IAM y secretos', icon: 'vpn_key' },
  { label: 'Evaluando firewalls', icon: 'security' },
  { label: 'Generando recomendaciones', icon: 'lightbulb' },
  { label: 'Escaneo completado', icon: 'check_circle' },
]

@Component({
  selector: 'app-security-scan-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <article class="sec-scan">
      <header class="sec-scan__head">
        <mat-icon class="sec-scan__icon">radar</mat-icon>
        <div>
          <h2>Escaneo de postura de seguridad</h2>
          <p>Analizando red, puertos, servicios, secretos, IAM, firewalls y cumplimiento.</p>
        </div>
      </header>
      <mat-dialog-content class="sec-scan__body">
        <mat-progress-bar mode="determinate" [value]="progress()" />
        <span class="sec-scan__pct">{{ progress() }}%</span>
        <ol class="sec-scan__steps">
          @for (step of SCAN_STEPS; track step.label; let i = $index) {
            <li [class.sec-scan__step--done]="stepIndex() > i" [class.sec-scan__step--active]="stepIndex() === i">
              <mat-icon>{{ step.icon }}</mat-icon>
              <span>{{ step.label }}</span>
              @if (stepIndex() === i && running()) { <em>En curso…</em> }
              @if (stepIndex() > i) { <em>Completado</em> }
            </li>
          }
        </ol>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        @if (done()) {
          <button mat-flat-button color="primary" type="button" (click)="handleClose()">Cerrar</button>
        } @else {
          <button mat-stroked-button type="button" [disabled]="running()" (click)="handleCancel()">Cancelar</button>
        }
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-scan { min-width: min(480px, 92vw); color: #0f172a; }
    .sec-scan__head { display: flex; gap: 0.65rem; align-items: flex-start; padding-bottom: 0.65rem; border-bottom: 1px solid #e2e8f0; }
    .sec-scan__icon { font-size: 2rem; width: 2rem; height: 2rem; color: #ec4899; }
    .sec-scan__head h2 { margin: 0; font-size: 1rem; font-weight: 700; }
    .sec-scan__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; }
    .sec-scan__body { padding-top: 0.85rem !important; }
    .sec-scan__pct { display: block; margin: 0.35rem 0 0.65rem; font-size: 0.68rem; font-weight: 700; color: #db2777; text-align: right; }
    .sec-scan__steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .sec-scan__steps li {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.55rem; border-radius: 8px;
      font-size: 0.72rem; color: #94a3b8; background: #f8fafc;
    }
    .sec-scan__steps li mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .sec-scan__steps li em { margin-left: auto; font-size: 0.62rem; font-style: normal; }
    .sec-scan__step--active { background: #fdf2f8 !important; color: #be185d !important; font-weight: 600; }
    .sec-scan__step--done { color: #059669 !important; }
    .sec-scan__step--done em { color: #64748b; }
  `,
})
export class SecurityScanDialogComponent {
  readonly SCAN_STEPS = SCAN_STEPS
  private readonly dialogRef = inject(MatDialogRef<SecurityScanDialogComponent>)
  private readonly svc = inject(SecurityCenterService)
  private readonly toast = inject(ToastService)

  readonly stepIndex = signal(0)
  readonly progress = signal(0)
  readonly running = signal(true)
  readonly done = signal(false)
  private timer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.svc.scanning.set(true)
    let step = 0
    this.timer = setInterval(() => {
      step += 1
      this.stepIndex.set(Math.min(step, SCAN_STEPS.length - 1))
      this.progress.set(Math.round((step / (SCAN_STEPS.length - 1)) * 100))
      if (step >= SCAN_STEPS.length - 1) {
        if (this.timer) clearInterval(this.timer)
        this.running.set(false)
        this.done.set(true)
        this.svc.completeScan()
        this.toast.success('Escaneo completado — métricas y hallazgos actualizados')
      }
    }, 700)
  }

  handleCancel = (): void => {
    if (this.timer) clearInterval(this.timer)
    this.svc.scanning.set(false)
    this.dialogRef.close(false)
  }

  handleClose = (): void => {
    this.dialogRef.close(true)
  }
}
