import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { SECURITY_ACCENT, SECURITY_ACCENT_BORDER, SECURITY_ACCENT_LIGHT } from './security.config'
import { SECRET_TYPE_LABELS, type SecretRecord } from './secrets-manager.data'

export interface SecretDetailData {
  secret: SecretRecord
}

@Component({
  selector: 'app-secret-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="sec-det">
      <header class="sec-det__head">
        <div>
          <span class="sec-det__label">Detalle del secreto</span>
          <h2>{{ data.secret.name }}</h2>
          @if (data.secret.description) { <p>{{ data.secret.description }}</p> }
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="sec-det__body">
        <div class="sec-det__badges">
          <span class="sec-det__type">{{ typeLabel(data.secret.type) }}</span>
          <app-status-badge [value]="data.secret.status" />
          @if (data.secret.rotationPolicy) {
            <span class="sec-det__chip">{{ data.secret.rotationPolicy }}</span>
          }
        </div>
        <dl class="sec-det__grid">
          <div><dt>Referencia</dt><dd class="mono">{{ data.secret.reference }}</dd></div>
          <div><dt>Propietario</dt><dd>{{ data.secret.owner }}</dd></div>
          <div><dt>Expira</dt><dd>{{ data.secret.expires }}</dd></div>
          <div><dt>Última rotación</dt><dd>{{ data.secret.lastRotated | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
          @if (data.secret.lastAccess) {
            <div><dt>Último acceso</dt><dd>{{ data.secret.lastAccess | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
          }
          @if (data.secret.accessCount30d != null) {
            <div><dt>Accesos (30d)</dt><dd>{{ data.secret.accessCount30d }}</dd></div>
          }
          <div class="sec-det__full"><dt>Entornos</dt><dd>{{ data.secret.environments.join(', ') }}</dd></div>
        </dl>
        @if (data.secret.tags?.length) {
          <section class="sec-det__block">
            <h3><mat-icon>label</mat-icon> Etiquetas</h3>
            <div class="sec-det__tags">
              @for (tag of data.secret.tags; track tag) { <span>{{ tag }}</span> }
            </div>
          </section>
        }
        <section class="sec-det__block sec-det__block--warn">
          <h3><mat-icon>shield</mat-icon> Política de acceso</h3>
          <p>Solo lectura desde este panel. Los valores reales se obtienen vía Vault con autenticación MFA. Todas las operaciones quedan registradas en auditoría.</p>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-flat-button color="primary" type="button" (click)="handleRotate()">
          <mat-icon>sync</mat-icon> Rotar ahora
        </button>
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-det { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .sec-det__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .sec-det__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .sec-det__head h2 { margin: 0.2rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .sec-det__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.5; max-width: 36rem; }
    .sec-det__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; }
    .sec-det__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .sec-det__type { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; background: ${SECURITY_ACCENT}; color: #fff; }
    .sec-det__chip { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; background: ${SECURITY_ACCENT_LIGHT}; color: ${SECURITY_ACCENT}; border: 1px solid ${SECURITY_ACCENT_BORDER}; }
    .sec-det__grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .sec-det__full { grid-column: 1 / -1; }
    .sec-det__block { padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${SECURITY_ACCENT_BORDER}; background: ${SECURITY_ACCENT_LIGHT}; }
    .sec-det__block h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.4rem; font-size: 0.75rem; font-weight: 700; color: ${SECURITY_ACCENT}; }
    .sec-det__block h3 mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .sec-det__block p { margin: 0; font-size: 0.72rem; color: #475569; line-height: 1.55; }
    .sec-det__block--warn { border-color: #fde68a; background: #fffbeb; }
    .sec-det__block--warn h3 { color: #b45309; }
    .sec-det__tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .sec-det__tags span { padding: 0.12rem 0.45rem; border-radius: 999px; font-size: 0.62rem; font-weight: 600; background: #fff; border: 1px solid #e2e8f0; color: #475569; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.72rem; }
  `,
})
export class SecretDetailDialogComponent {
  readonly data = inject<SecretDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<SecretDetailDialogComponent>)
  private readonly toast = inject(ToastService)

  typeLabel = (t: string): string => SECRET_TYPE_LABELS[t as keyof typeof SECRET_TYPE_LABELS] ?? t

  handleRotate = (): void => {
    this.toast.success(`Rotación iniciada: ${this.data.secret.name}`)
    this.dialogRef.close({ rotated: true, id: this.data.secret.id })
  }
}
