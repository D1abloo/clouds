import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import {
  ADMIN_TOKENS_ACCENT,
  ADMIN_TOKENS_ACCENT_BORDER,
  ADMIN_TOKENS_ACCENT_LIGHT,
  adminRelativeTime,
  adminScopeLabel,
} from './admin.config'
import { enrichTokenProfile, type ApiTokenRow } from './admin-api-tokens.demo'

export type ApiTokenActionMode = 'rotate' | 'revoke' | 'copy'

export interface AdminApiTokenActionData {
  token: ApiTokenRow
  mode: ApiTokenActionMode
}

@Component({
  selector: 'app-admin-api-token-action-dialog',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  template: `
    <article class="tact" [attr.data-mode]="data.mode">
      <header class="tact__head">
        <div class="tact__icon-wrap">
          <mat-icon>{{ icon }}</mat-icon>
        </div>
        <div class="tact__head-text">
          <span class="tact__label">{{ labelEyebrow }}</span>
          <h2>{{ title }}</h2>
          <p>{{ subtitle }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>

      <mat-dialog-content class="tact__body">
        <section class="tact__target">
          <span class="tact__target-icon"><mat-icon>vpn_key</mat-icon></span>
          <div>
            <strong>{{ profile.name }}</strong>
            <span class="mono">{{ profile.prefix }}</span>
            <em>{{ profile.owner }} · {{ scopeLabel(profile.scope) }}</em>
          </div>
        </section>

        <dl class="tact__facts">
          <div><dt>Entorno</dt><dd>{{ profile.environment ?? '—' }}</dd></div>
          <div><dt>Último uso</dt><dd>{{ relativeTime(profile.lastUsed) }}</dd></div>
          <div><dt>Llamadas (24h)</dt><dd>{{ profile.calls24h ?? '—' }}</dd></div>
          <div><dt>Política rotación</dt><dd>{{ profile.rotationPolicy }}</dd></div>
          @if (profile.daysUntilExpiry != null) {
            <div><dt>Expira en</dt><dd [class.tact__warn]="profile.daysUntilExpiry <= 14">{{ profile.daysUntilExpiry }} días</dd></div>
          }
          <div><dt>Rate limit</dt><dd>{{ profile.rateLimit }}</dd></div>
        </dl>

        @if (data.mode === 'rotate') {
          <aside class="tact__warn tact__warn--info">
            <mat-icon>info</mat-icon>
            <div>
              <strong>Qué ocurre al rotar</strong>
              <p>Se genera un nuevo secreto y el actual deja de funcionar en ~5 minutos. Actualiza Jenkins, Terraform o scripts que usen este token antes de confirmar.</p>
            </div>
          </aside>
          <label class="tact__toggle">
            <mat-slide-toggle [formControl]="notifyControl" aria-label="Notificar propietario" />
            <div><strong>Notificar al propietario</strong><span>Email a {{ profile.owner }} con el nuevo prefijo</span></div>
          </label>
          <label class="tact__toggle">
            <mat-slide-toggle [formControl]="graceControl" aria-label="Ventana de gracia" />
            <div><strong>Ventana de gracia 24h</strong><span>El token anterior sigue válido 24 h para migración</span></div>
          </label>
        }

        @if (data.mode === 'copy') {
          <section class="tact__copy-box">
            <span class="tact__copy-label">Prefijo identificable (secreto completo no se muestra)</span>
            <code class="tact__copy-value mono">{{ profile.prefix }}</code>
            <p>Solo se copia el prefijo para identificar el token en logs y auditoría. El valor completo solo se muestra una vez al crear el token.</p>
          </section>
        }

        @if (data.mode === 'revoke') {
          <aside class="tact__warn tact__warn--danger">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>Efecto inmediato</strong>
              <p>Todas las llamadas API con este token fallarán con HTTP 401. Integraciones activas ({{ profile.lastEndpoints.length }} endpoints recientes) dejarán de funcionar al instante.</p>
            </div>
          </aside>
          @if (profile.lastEndpoints.length) {
            <section class="tact__endpoints">
              <h3>Endpoints afectados recientemente</h3>
              <ul>
                @for (ep of profile.lastEndpoints; track ep) {
                  <li><mat-icon>link</mat-icon><code>{{ ep }}</code></li>
                }
              </ul>
            </section>
          }
          <mat-form-field appearance="outline" class="tact__field">
            <mat-label>Motivo de revocación</mat-label>
            <mat-select [formControl]="reasonControl">
              @for (r of revokeReasons; track r) {
                <mat-option [value]="r">{{ r }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="tact__field">
            <mat-label>Notas (opcional)</mat-label>
            <textarea matInput [formControl]="notesControl" rows="2" placeholder="Contexto para auditoría…"></textarea>
          </mat-form-field>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="start" class="tact__actions">
        <button
          type="button"
          class="page-action-btn"
          [class.page-action-btn--primary]="data.mode !== 'revoke'"
          [class.tact__btn-danger]="data.mode === 'revoke'"
          [disabled]="data.mode === 'revoke' && reasonControl.invalid"
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
    .tact { width: 100%; color: #0f172a; padding: 1.1rem 1.3rem 1.2rem; box-sizing: border-box; }
    .tact__head { display: grid; grid-template-columns: auto 1fr auto; gap: 0.65rem; align-items: flex-start; padding: 0.8rem 0.95rem; margin-bottom: 0.85rem; border-radius: 12px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: linear-gradient(135deg, ${ADMIN_TOKENS_ACCENT_LIGHT}, #fff); }
    .tact[data-mode='revoke'] .tact__head { border-color: #fecaca; background: linear-gradient(135deg, #fef2f2, #fff); }
    .tact__icon-wrap { display: flex; align-items: center; justify-content: center; width: 2.2rem; height: 2.2rem; border-radius: 10px; background: #fff; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; color: ${ADMIN_TOKENS_ACCENT}; }
    .tact[data-mode='revoke'] .tact__icon-wrap { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
    .tact__icon-wrap mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
    .tact__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .tact__head h2 { margin: 0.15rem 0 0; font-size: 1rem; font-weight: 700; }
    .tact__head p { margin: 0.2rem 0 0; font-size: 0.68rem; color: #64748b; line-height: 1.5; max-width: 32rem; }
    .tact__body { padding: 0 !important; max-height: min(62vh, 520px); overflow-y: auto; scrollbar-width: thin; }
    .tact__target { display: flex; gap: 0.65rem; align-items: center; padding: 0.65rem 0.75rem; margin-bottom: 0.75rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; }
    .tact__target-icon { display: flex; align-items: center; justify-content: center; width: 2.2rem; height: 2.2rem; border-radius: 9px; background: ${ADMIN_TOKENS_ACCENT}; color: #fff; flex-shrink: 0; mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; } }
    .tact__target strong { display: block; font-size: 0.82rem; }
    .tact__target span { display: block; font-size: 0.68rem; color: ${ADMIN_TOKENS_ACCENT}; margin-top: 0.1rem; }
    .tact__target em { display: block; font-style: normal; font-size: 0.62rem; color: #94a3b8; margin-top: 0.12rem; }
    .tact__facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 0.85rem; margin: 0 0 0.75rem; dt { font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; } dd { margin: 0.06rem 0 0; font-size: 0.76rem; font-weight: 600; } .tact__warn { color: #d97706; } }
    .tact__warn { display: flex; gap: 0.5rem; padding: 0.65rem 0.75rem; border-radius: 10px; margin-bottom: 0.65rem; mat-icon { flex-shrink: 0; font-size: 1rem; width: 1rem; height: 1rem; margin-top: 0.05rem; } strong { display: block; font-size: 0.72rem; margin-bottom: 0.2rem; } p { margin: 0; font-size: 0.66rem; line-height: 1.55; color: #475569; } }
    .tact__warn--info { background: ${ADMIN_TOKENS_ACCENT_LIGHT}; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; mat-icon { color: ${ADMIN_TOKENS_ACCENT}; } }
    .tact__warn--danger { background: #fef2f2; border: 1px solid #fecaca; mat-icon { color: #dc2626; } strong { color: #991b1b; } }
    .tact__toggle { display: flex; align-items: flex-start; gap: 0.6rem; margin-bottom: 0.45rem; padding: 0.55rem 0.65rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; strong { display: block; font-size: 0.72rem; } span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.08rem; line-height: 1.45; } }
    .tact__copy-box { padding: 0.75rem 0.85rem; border-radius: 10px; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; background: ${ADMIN_TOKENS_ACCENT_LIGHT}; margin-bottom: 0.5rem; }
    .tact__copy-label { display: block; font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; margin-bottom: 0.35rem; }
    .tact__copy-value { display: block; font-size: 0.82rem; padding: 0.45rem 0.55rem; border-radius: 8px; background: #fff; border: 1px solid ${ADMIN_TOKENS_ACCENT_BORDER}; margin-bottom: 0.45rem; word-break: break-all; }
    .tact__copy-box p { margin: 0; font-size: 0.64rem; color: #64748b; line-height: 1.5; }
    .tact__endpoints { margin-bottom: 0.65rem; h3 { margin: 0 0 0.35rem; font-size: 0.68rem; font-weight: 700; color: #475569; } ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; } li { display: flex; align-items: center; gap: 0.32rem; font-size: 0.66rem; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: #94a3b8; } code { font-size: 0.64rem; } } }
    .tact__field { width: 100%; margin-bottom: 0.35rem; }
    .tact__actions { display: flex; flex-wrap: wrap; gap: 0.45rem; padding: 0.85rem 0 0; margin: 0.85rem 0 0; border-top: 1px solid #e2e8f0; min-height: unset; }
    .page-action-btn--primary { background: ${ADMIN_TOKENS_ACCENT}; border-color: #6d28d9; }
    .tact__btn-danger { background: #dc2626 !important; border-color: #b91c1c !important; color: #fff !important; &:hover:not(:disabled) { background: #b91c1c !important; } }
    .mono { font-family: ui-monospace, monospace; }
    @media (max-width: 640px) { .tact { padding: 1rem; } .tact__facts { grid-template-columns: 1fr; } }
  `,
})
export class AdminApiTokenActionDialogComponent {
  readonly data = inject<AdminApiTokenActionData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AdminApiTokenActionDialogComponent>)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)

  relativeTime = adminRelativeTime
  scopeLabel = adminScopeLabel
  readonly profile = enrichTokenProfile(this.data.token)

  readonly revokeReasons = [
    'Rotación programada',
    'Compromiso de seguridad',
    'Fin de integración',
    'Cambio de alcances',
    'Offboarding de servicio',
  ]
  readonly reasonControl = new FormControl(this.revokeReasons[0], { nonNullable: true, validators: Validators.required })
  readonly notesControl = new FormControl('', { nonNullable: true })
  readonly notifyControl = new FormControl(true, { nonNullable: true })
  readonly graceControl = new FormControl(false, { nonNullable: true })

  get icon(): string {
    switch (this.data.mode) {
      case 'rotate': return 'autorenew'
      case 'revoke': return 'block'
      case 'copy': return 'content_copy'
    }
  }

  get labelEyebrow(): string {
    switch (this.data.mode) {
      case 'rotate': return 'Tokens · Rotación'
      case 'revoke': return 'Tokens · Revocación'
      case 'copy': return 'Tokens · Portapapeles'
    }
  }

  get title(): string {
    switch (this.data.mode) {
      case 'rotate': return 'Rotar token API'
      case 'revoke': return 'Revocar token API'
      case 'copy': return 'Copiar prefijo del token'
    }
  }

  get subtitle(): string {
    switch (this.data.mode) {
      case 'rotate': return 'Emite un nuevo secreto y depreca el actual con opción de ventana de gracia.'
      case 'revoke': return 'Invalida el token de forma permanente. Las integraciones dejarán de autenticarse.'
      case 'copy': return 'Copia el identificador parcial del token para correlacionar en logs y auditoría.'
    }
  }

  get confirmLabel(): string {
    switch (this.data.mode) {
      case 'rotate': return 'Confirmar rotación'
      case 'revoke': return 'Confirmar revocación'
      case 'copy': return 'Copiar al portapapeles'
    }
  }

  handleConfirm = (): void => {
    const actionId = this.data.mode === 'copy' ? 'copy' : this.data.mode
    const payload = {
      ...this.profile,
      reason: this.reasonControl.value,
      notes: this.notesControl.value,
      notify: this.notifyControl.value,
      gracePeriod: this.graceControl.value,
    }
    if (this.data.mode === 'copy') {
      void navigator.clipboard.writeText(this.profile.prefix).then(
        () => this.toast.success(`Prefijo copiado: ${this.profile.prefix}`),
        () => this.toast.info(this.profile.prefix),
      )
      this.actions.runRowAction('api-tokens', 'copy', payload as unknown as Record<string, unknown>, undefined, 'Copiar prefijo')
      this.dialogRef.close({ action: 'copy', id: this.profile.id })
      return
    }
    this.actions.runRowAction('api-tokens', actionId, payload as unknown as Record<string, unknown>, undefined, this.confirmLabel)
    if (this.data.mode === 'rotate') {
      this.toast.success(`Rotación iniciada: ${this.profile.name}`)
    } else {
      this.toast.warning(`Token revocado: ${this.profile.name}`)
    }
    this.dialogRef.close({ action: actionId, id: this.profile.id })
  }
}
