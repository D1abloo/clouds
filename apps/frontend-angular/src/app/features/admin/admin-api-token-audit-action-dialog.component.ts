import { Component, inject } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import {
  ADMIN_TOKENS_ACCENT,
  ADMIN_TOKENS_ACCENT_BORDER,
  ADMIN_TOKENS_ACCENT_LIGHT,
  adminRelativeTime,
} from './admin.config'
import { enrichAuditEntry, type ApiTokenRow } from './admin-api-tokens.data'

export type ApiTokenAuditActionMode = 'block-ip' | 'copy-endpoint'

export interface AdminApiTokenAuditActionData {
  entry: ApiTokenRow
  mode: ApiTokenAuditActionMode
}

@Component({
  selector: 'app-admin-api-token-audit-action-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <article class="taud-act" [attr.data-mode]="data.mode">
      <header class="taud-act__head">
        <div class="taud-act__icon-wrap">
          <mat-icon>{{ icon }}</mat-icon>
        </div>
        <div class="taud-act__head-text">
          <span class="taud-act__label">{{ labelEyebrow }}</span>
          <h2>{{ title }}</h2>
          <p>{{ subtitle }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>

      <mat-dialog-content class="taud-act__body">
        <section class="taud-act__target">
          <span class="taud-act__method" [attr.data-method]="profile.method">{{ profile.method }}</span>
          <div>
            <strong class="mono">{{ profile.endpoint }}</strong>
            <span>{{ profile.name }} · {{ profile.prefix }}</span>
            <em>{{ profile.owner }} · {{ relativeTime(profile.lastUsed) }}</em>
          </div>
        </section>

        <dl class="taud-act__facts">
          <div><dt>IP origen</dt><dd class="mono">{{ profile.ip ?? '—' }}</dd></div>
          <div><dt>Región</dt><dd>{{ profile.region }}</dd></div>
          <div><dt>HTTP</dt><dd [attr.data-fail]="profile.httpStatus != null && profile.httpStatus >= 400">{{ profile.httpStatus ?? '—' }}</dd></div>
          <div><dt>Latencia</dt><dd>{{ profile.responseMs ?? '—' }} ms</dd></div>
          <div><dt>Llamadas IP (24h)</dt><dd>{{ profile.callsFromIp24h }}</dd></div>
          <div><dt>Nivel amenaza</dt><dd [attr.data-threat]="profile.threatLevel">{{ threatLabel(profile.threatLevel) }}</dd></div>
        </dl>

        @if (data.mode === 'block-ip') {
          <aside class="taud-act__warn taud-act__warn--danger">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>Efecto del bloqueo</strong>
              <p>Todas las peticiones desde <code>{{ profile.ip }}</code> serán rechazadas con HTTP 403. Afectará {{ profile.relatedFromIp }} evento(s) reciente(s) y {{ profile.callsFromIp24h }} llamadas en las últimas 24 h.</p>
            </div>
          </aside>
          <mat-form-field appearance="outline" class="taud-act__field">
            <mat-label>Duración del bloqueo</mat-label>
            <mat-select [formControl]="durationControl">
              @for (d of durations; track d) {
                <mat-option [value]="d">{{ d }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="taud-act__field">
            <mat-label>Motivo</mat-label>
            <mat-select [formControl]="reasonControl">
              @for (r of blockReasons; track r) {
                <mat-option [value]="r">{{ r }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="taud-act__field">
            <mat-label>Notas (opcional)</mat-label>
            <textarea matInput [formControl]="notesControl" rows="2" placeholder="Contexto para auditoría…"></textarea>
          </mat-form-field>
        }

        @if (data.mode === 'copy-endpoint') {
          <section class="taud-act__copy-box">
            <span class="taud-act__copy-label">Línea de petición</span>
            <code class="taud-act__copy-value mono">{{ requestLine }}</code>
            <p>Incluye método y ruta para correlacionar en logs, SIEM o tickets de soporte.</p>
          </section>
          @if (profile.userAgent) {
            <section class="taud-act__copy-box taud-act__copy-box--secondary">
              <span class="taud-act__copy-label">User-Agent</span>
              <code class="taud-act__copy-value mono taud-act__copy-value--sm">{{ profile.userAgent }}</code>
            </section>
          }
        }
      </mat-dialog-content>

      <mat-dialog-actions align="start" class="taud-act__actions">
        <button
          type="button"
          class="page-action-btn"
          [class.page-action-btn--primary]="data.mode === 'copy-endpoint'"
          [class.taud-act__btn-danger]="data.mode === 'block-ip'"
          [disabled]="data.mode === 'block-ip' && reasonControl.invalid"
          (click)="handleConfirm()"
        >
          <mat-icon>{{ icon }}</mat-icon> {{ confirmLabel }}
        </button>
        <button type="button" class="page-action-btn" mat-dialog-close>Cancelar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    :host { display: block; }
    .taud-act { width: 100%; color: #0f172a; padding: 1.1rem 1.3rem 1.2rem; box-sizing: border-box; }
    .taud-act__head { display: grid; grid-template-columns: auto 1fr auto; gap: 0.65rem; align-items: flex-start; padding: 0.8rem 0.95rem; margin-bottom: 0.85rem; border-radius: 12px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: linear-gradient(135deg, ${ADMIN_TOKENS_ACCENT_LIGHT}, #fff); }
    .taud-act[data-mode='block-ip'] .taud-act__head { border-color: #fecaca; background: linear-gradient(135deg, #fef2f2, #fff); }
    .taud-act__icon-wrap { display: flex; align-items: center; justify-content: center; width: 2.2rem; height: 2.2rem; border-radius: 10px; background: #fff; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; color: ${ADMIN_TOKENS_ACCENT}; }
    .taud-act[data-mode='block-ip'] .taud-act__icon-wrap { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
    .taud-act__icon-wrap mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
    .taud-act__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .taud-act__head h2 { margin: 0.15rem 0 0; font-size: 1rem; font-weight: 700; }
    .taud-act__head p { margin: 0.2rem 0 0; font-size: 0.68rem; color: #64748b; line-height: 1.5; max-width: 32rem; }
    .taud-act__body { padding: 0 !important; max-height: min(62vh, 520px); overflow-y: auto; scrollbar-width: thin; }
    .taud-act__target { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.65rem 0.75rem; margin-bottom: 0.75rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; }
    .taud-act__method { display: flex; align-items: center; justify-content: center; min-width: 3rem; padding: 0.25rem 0.4rem; border-radius: 7px; font-size: 0.62rem; font-weight: 800; background: ${ADMIN_TOKENS_ACCENT}; color: #fff; flex-shrink: 0; &[data-method='GET'] { background: #059669; } &[data-method='DELETE'] { background: #dc2626; } }
    .taud-act__target strong { display: block; font-size: 0.76rem; word-break: break-word; }
    .taud-act__target span { display: block; font-size: 0.66rem; color: #64748b; margin-top: 0.15rem; }
    .taud-act__target em { display: block; font-style: normal; font-size: 0.62rem; color: #94a3b8; margin-top: 0.1rem; }
    .taud-act__facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 0.85rem; margin: 0 0 0.75rem; dt { font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; } dd { margin: 0.06rem 0 0; font-size: 0.76rem; font-weight: 600; &[data-fail='true'] { color: #dc2626; } &[data-threat='high'] { color: #dc2626; } &[data-threat='medium'] { color: #d97706; } &[data-threat='low'] { color: #15803d; } } }
    .taud-act__warn { display: flex; gap: 0.5rem; padding: 0.65rem 0.75rem; border-radius: 10px; margin-bottom: 0.65rem; mat-icon { flex-shrink: 0; font-size: 1rem; width: 1rem; height: 1rem; margin-top: 0.05rem; } strong { display: block; font-size: 0.72rem; margin-bottom: 0.2rem; } p { margin: 0; font-size: 0.66rem; line-height: 1.55; color: #475569; code { font-size: 0.62rem; } } }
    .taud-act__warn--danger { background: #fef2f2; border: 1px solid #fecaca; mat-icon { color: #dc2626; } strong { color: #991b1b; } }
    .taud-act__field { width: 100%; margin-bottom: 0.35rem; }
    .taud-act__copy-box { padding: 0.75rem 0.85rem; border-radius: 10px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; margin-bottom: 0.5rem; &--secondary { background: #f8fafc; border-color: #e2e8f0; } }
    .taud-act__copy-label { display: block; font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.35rem; }
    .taud-act__copy-value { display: block; font-size: 0.82rem; padding: 0.45rem 0.55rem; border-radius: 8px; background: #fff; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; margin-bottom: 0.45rem; word-break: break-all; &--sm { font-size: 0.68rem; margin-bottom: 0; } }
    .taud-act__copy-box p { margin: 0; font-size: 0.64rem; color: #64748b; line-height: 1.5; }
    .taud-act__actions { display: flex; flex-wrap: wrap; gap: 0.45rem; padding: 0.85rem 0 0; margin: 0.85rem 0 0; border-top: 1px solid #e2e8f0; min-height: unset; }
    .page-action-btn--primary { background: ${ADMIN_TOKENS_ACCENT}; border-color: #6d28d9; }
    .taud-act__btn-danger { background: #dc2626 !important; border-color: #b91c1c !important; color: #fff !important; &:hover:not(:disabled) { background: #b91c1c !important; } }
    .mono { font-family: ui-monospace, monospace; }
    @media (max-width: 640px) { .taud-act { padding: 1rem; } .taud-act__facts { grid-template-columns: 1fr; } }
  `,
})
export class AdminApiTokenAuditActionDialogComponent {
  readonly data = inject<AdminApiTokenAuditActionData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AdminApiTokenAuditActionDialogComponent>)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)

  relativeTime = adminRelativeTime
  readonly profile = enrichAuditEntry(this.data.entry)

  readonly durations = ['1 hora', '24 horas', '7 días', 'Permanente']
  readonly blockReasons = [
    'Intentos de acceso no autorizado',
    'Rate limit excedido repetidamente',
    'IP sospechosa / escaneo',
    'Política de seguridad',
    'Solicitud del propietario del token',
  ]
  readonly durationControl = new FormControl(this.durations[1], { nonNullable: true })
  readonly reasonControl = new FormControl(this.blockReasons[0], { nonNullable: true, validators: Validators.required })
  readonly notesControl = new FormControl('', { nonNullable: true })

  get requestLine(): string {
    return `${this.profile.method ?? 'GET'} ${this.profile.endpoint ?? ''}`
  }

  get icon(): string {
    return this.data.mode === 'block-ip' ? 'shield' : 'content_copy'
  }

  get labelEyebrow(): string {
    return this.data.mode === 'block-ip' ? 'Auditoría · Bloqueo IP' : 'Auditoría · Portapapeles'
  }

  get title(): string {
    return this.data.mode === 'block-ip' ? 'Bloquear IP de origen' : 'Copiar endpoint de la petición'
  }

  get subtitle(): string {
    return this.data.mode === 'block-ip'
      ? 'Impide nuevas peticiones desde esta dirección IP en el período seleccionado.'
      : 'Copia la línea de petición para correlacionar en logs o tickets.'
  }

  get confirmLabel(): string {
    return this.data.mode === 'block-ip' ? 'Confirmar bloqueo' : 'Copiar al portapapeles'
  }

  threatLabel = (level: string): string => {
    switch (level) {
      case 'high': return 'Alto'
      case 'medium': return 'Medio'
      default: return 'Bajo'
    }
  }

  handleConfirm = (): void => {
    const payload = {
      ...this.profile,
      duration: this.durationControl.value,
      reason: this.reasonControl.value,
      notes: this.notesControl.value,
    }
    if (this.data.mode === 'copy-endpoint') {
      void navigator.clipboard.writeText(this.requestLine).then(
        () => this.toast.success('Endpoint copiado'),
        () => this.toast.info(this.requestLine),
      )
      this.actions.runRowAction('api-tokens', 'copy', payload as unknown as Record<string, unknown>, undefined, 'Copiar endpoint')
      this.dialogRef.close({ action: 'copy-endpoint', id: this.profile.id })
      return
    }
    this.actions.runRowAction('api-tokens', 'block-ip', payload as unknown as Record<string, unknown>, undefined, 'Bloquear IP')
    this.toast.warning(`IP bloqueada: ${this.profile.ip}`)
    this.dialogRef.close({ action: 'block-ip', id: this.profile.id })
  }
}
