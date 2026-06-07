import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { delay, of } from 'rxjs'
import { ToastService } from '../../core/services/toast.service'
import {
  applySshKeyRotation,
  exportSshRotationCsv,
  exportSshRotationJson,
  exportSshRotationMarkdown,
  exportSshRotationPdf,
  inferPublicKeyAlgorithm,
  isValidSshPublicKey,
  previewSshKeyFingerprint,
} from './infrastructure-vps-ssh-rotation.util'
import type {
  SshKeyRecord,
  SshKeyRotationReport,
  SshRotationApplyResult,
  SshRotationPriority,
} from './infrastructure-vps-ssh-rotation.util'

export interface VpsSshRotationDialogData {
  report: SshKeyRotationReport
  onKeyRotated?: (result: SshRotationApplyResult) => void
}

const priorityLabel: Record<SshRotationPriority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
  none: 'Ninguna',
}

const statusLabel = (status: string): string => {
  if (status === 'legacy') return 'Legacy'
  if (status === 'warn') return 'Atención'
  if (status === 'rotate') return 'Rotar'
  return 'OK'
}

const stepStatusLabel = (status: string): string => {
  if (status === 'ready') return 'Listo'
  if (status === 'blocked') return 'Bloqueado'
  return 'Pendiente'
}

@Component({
  selector: 'app-vps-ssh-rotation-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <div class="vps-op-dialog">
      <header class="vps-op-dialog__head">
        <div>
          <h2 mat-dialog-title>Rotación de claves SSH</h2>
          <p class="vps-op-dialog__sub mono">{{ report().reportId }} · {{ report().method }}</p>
        </div>
        <span class="vps-op-dialog__chip" [attr.data-risk]="report().riskLevel">
          Riesgo {{ report().riskLevel }}
        </span>
      </header>

      <mat-dialog-content>
        <p class="vps-ssh-summary">{{ report().executiveSummary }}</p>

        <div class="vps-op-kpi-row">
          <article><span>Claves total</span><strong>{{ report().keysTotal }}</strong></article>
          <article data-tone="warn"><span>A rotar</span><strong>{{ report().keysToRotate }}</strong></article>
          <article data-tone="crit"><span>Legacy</span><strong>{{ report().legacyKeys }}</strong></article>
          <article data-tone="warn"><span>Atención</span><strong>{{ report().warnKeys }}</strong></article>
          <article><span>Hosts afectados</span><strong>{{ report().affectedHosts }}</strong></article>
          <article><span>Usuarios Unix</span><strong>{{ report().affectedUsers }}</strong></article>
        </div>

        <div class="vps-port-table-wrap">
          <table class="vps-port-table">
            <thead>
              <tr>
                <th>Clave</th>
                <th>Huella</th>
                <th>Algoritmo</th>
                <th>Usuarios</th>
                <th>Último uso</th>
                <th>Estado</th>
                <th>Prioridad</th>
              </tr>
            </thead>
            <tbody>
              @for (k of report().keys; track k.name) {
                <tr
                  [attr.data-risk]="k.rotationPriority === 'critical' ? 'crit' : k.rotationPriority === 'high' || k.rotationPriority === 'medium' ? 'warn' : 'ok'"
                  [class.vps-ssh-row--selected]="selectedKey()?.name === k.name"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Detalle clave ' + k.name"
                  (click)="handleSelectKey(k)"
                  (keydown.enter)="handleSelectKey(k)"
                  (keydown.space)="handleSelectKey(k); $event.preventDefault()"
                >
                  <td>
                    <strong>{{ k.name }}</strong>
                    @if (k.rotateRequired) {
                      <small class="vps-ssh-tag">Rotación</small>
                    }
                    @if (rotatedKeys().has(k.name)) {
                      <small class="vps-ssh-tag vps-ssh-tag--ok">Rotada</small>
                    }
                  </td>
                  <td class="mono">{{ k.fingerprint }}</td>
                  <td class="mono">{{ k.algorithm }}{{ k.keyBits ? '-' + k.keyBits : '' }}</td>
                  <td>{{ k.userCount }}</td>
                  <td>{{ k.lastUsed }}</td>
                  <td>
                    <span class="vps-risk-pill" [attr.data-risk]="k.status === 'legacy' ? 'crit' : k.status === 'warn' || k.status === 'rotate' ? 'warn' : 'ok'">
                      {{ statusLabel(k.status) }}
                    </span>
                  </td>
                  <td>
                    <span class="vps-ssh-priority" [attr.data-priority]="k.rotationPriority">
                      {{ priorityLabel[k.rotationPriority] }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (selectedKey(); as key) {
          <section class="vps-op-section vps-ssh-detail">
            <h3><mat-icon>key</mat-icon> Detalle · {{ key.name }}</h3>
            <div class="vps-ssh-detail__grid">
              <div>
                <span>Antigüedad</span>
                <strong>{{ key.ageDays }} días</strong>
              </div>
              <div>
                <span>Reemplazo</span>
                <strong class="mono">{{ key.replacementName ?? '—' }}</strong>
              </div>
              <div>
                <span>Usuarios Unix</span>
                <strong class="mono">{{ key.unixUsers.join(', ') }}</strong>
              </div>
              <div>
                <span>Notas</span>
                <strong>{{ key.notes }}</strong>
              </div>
            </div>
            @if (key.affectedHosts.length) {
              <div class="vps-port-table-wrap vps-ssh-detail__hosts">
                <table class="vps-port-table">
                  <thead>
                    <tr>
                      <th>Host</th>
                      <th>IP</th>
                      <th>Usuario</th>
                      <th>Entorno</th>
                      <th>Línea authorized_keys</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (h of key.affectedHosts; track h.hostId + h.unixUser) {
                      <tr>
                        <td>{{ h.hostName }}</td>
                        <td class="mono">{{ h.hostIp }}</td>
                        <td class="mono">{{ h.unixUser }}</td>
                        <td>{{ h.environment }}</td>
                        <td class="mono">{{ h.authorizedKeysLine }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            @if (!rotationPanelOpen()) {
              @if (key.rotateRequired || !rotatedKeys().has(key.name)) {
                <div class="vps-ssh-detail__actions">
                  <button
                    mat-stroked-button
                    color="warn"
                    type="button"
                    [disabled]="deploying()"
                    (click)="handleStartRotation(key)"
                  >
                    <mat-icon>sync_lock</mat-icon>
                    Ejecutar rotación
                  </button>
                </div>
              }
            }
          </section>
        }

        @if (rotationPanelOpen() && selectedKey(); as key) {
          <section class="vps-op-section vps-ssh-rotation-flow">
            <h3><mat-icon>warning</mat-icon> Rotación · {{ key.name }}</h3>

            <div class="vps-ssh-warn-banner" role="alert">
              <mat-icon>report</mat-icon>
              <div>
                <strong>Al rotar o modificar esta clave perderás acceso inmediato</strong>
                <span>Hasta que la nueva clave pública quede desplegada en authorized_keys de cada host afectado.</span>
              </div>
            </div>

            <ul class="vps-op-alerts">
              <li data-severity="warn">
                <mat-icon>terminal</mat-icon>
                Sesiones SSH activas con esta identidad quedarán invalidadas al revocar la huella anterior.
              </li>
              <li data-severity="warn">
                <mat-icon>folder_shared</mat-icon>
                Las entradas en authorized_keys ({{ key.affectedHosts.length }} host(s)) se actualizarán o eliminarán según el plan.
              </li>
              <li data-severity="warn">
                <mat-icon>build</mat-icon>
                Pipelines CI/CD y bots (p. ej. {{ key.unixUsers.join(', ') }}) dejarán de conectar hasta el despliegue.
              </li>
            </ul>

            <div class="vps-ssh-upload">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Nueva clave pública</mat-label>
                <textarea
                  matInput
                  rows="3"
                  [ngModel]="newPublicKeyText()"
                  (ngModelChange)="newPublicKeyText.set($event)"
                  placeholder="ssh-ed25519 AAAA… usuario@host"
                  aria-label="Pegar clave pública SSH"
                ></textarea>
                <mat-hint>Formatos aceptados: ssh-ed25519, ssh-rsa</mat-hint>
              </mat-form-field>

              <label class="vps-ssh-file-upload">
                <input
                  type="file"
                  accept=".pub,text/plain"
                  aria-label="Subir archivo de clave pública"
                  (change)="handlePublicKeyFile($event)"
                />
                <mat-icon>upload_file</mat-icon>
                Subir archivo .pub
              </label>

              @if (newPublicKeyText().trim()) {
                @if (newKeyValid()) {
                  <div class="vps-ssh-fingerprint-preview">
                    <mat-icon>fingerprint</mat-icon>
                    <span>Nueva huella (vista previa): <strong class="mono">{{ newFingerprintPreview() }}</strong></span>
                  </div>
                } @else {
                  <p class="vps-ssh-key-error" role="alert">
                    <mat-icon>error_outline</mat-icon>
                    La clave debe comenzar por <code>ssh-ed25519</code> o <code>ssh-rsa</code> seguido del blob Base64.
                  </p>
                }
              }
            </div>

            <mat-checkbox
              [ngModel]="acknowledged()"
              (ngModelChange)="acknowledged.set($event)"
              aria-label="Confirmar comprensión de pérdida de acceso"
            >
              Entiendo que perderé acceso si no despliego la nueva clave en los hosts afectados
            </mat-checkbox>

            <div class="vps-ssh-rotation-actions">
              <button
                mat-flat-button
                color="primary"
                type="button"
                [disabled]="!canDeploy() || deploying()"
                (click)="handleConfirmDeploy(key)"
              >
                @if (deploying()) {
                  Desplegando…
                } @else {
                  Confirmar y desplegar nueva clave
                }
              </button>
              <button
                mat-stroked-button
                color="warn"
                type="button"
                [disabled]="!acknowledged() || deploying()"
                (click)="handleRotateWithoutUpload(key)"
              >
                Rotar sin subir clave
              </button>
              <button mat-button type="button" [disabled]="deploying()" (click)="handleCancelRotation()">
                Cancelar
              </button>
            </div>
          </section>
        }

        <section class="vps-op-section">
          <h3><mat-icon>playlist_play</mat-icon> Plan de rotación · {{ report().plan.estimatedDurationMin }} min</h3>
          <p class="vps-ssh-plan-window">
            <mat-icon>schedule</mat-icon>
            Ventana: {{ report().plan.maintenanceWindow }}
          </p>
          <ol class="vps-ssh-plan-steps">
            @for (s of report().plan.steps; track s.order) {
              <li [attr.data-status]="s.status">
                <header>
                  <span class="vps-ssh-plan-steps__order">{{ s.order }}</span>
                  <div>
                    <strong>{{ s.phase }} · {{ s.action }}</strong>
                    <span>{{ s.detail }}</span>
                  </div>
                  <em>{{ s.durationMin }} min · {{ stepStatusLabel(s.status) }}</em>
                </header>
              </li>
            }
          </ol>
        </section>

        <section class="vps-op-section">
          <h3><mat-icon>history</mat-icon> Línea temporal del análisis</h3>
          <ul class="vps-ssh-timeline">
            @for (e of report().timeline; track e.at + e.label) {
              <li>
                <time class="mono">{{ e.at }}</time>
                <div>
                  <strong>{{ e.label }}</strong>
                  <span>{{ e.actor }}</span>
                </div>
              </li>
            }
          </ul>
        </section>

        <section class="vps-op-section">
          <h3><mat-icon>undo</mat-icon> Rollback</h3>
          <ul>
            @for (r of report().plan.rollbackSteps; track r) {
              <li>{{ r }}</li>
            }
          </ul>
        </section>

        <section class="vps-op-section">
          <h3><mat-icon>shield</mat-icon> Evaluación de riesgo</h3>
          <ul class="vps-ssh-risks">
            @for (r of report().riskAssessment; track r) {
              <li>{{ r }}</li>
            }
          </ul>
        </section>

        <section class="vps-op-section">
          <h3><mat-icon>lightbulb</mat-icon> Recomendaciones</h3>
          <ul>
            @for (r of report().recommendations; track r) {
              <li>{{ r }}</li>
            }
          </ul>
        </section>

        <section class="vps-op-section vps-op-section--muted">
          <h3><mat-icon>policy</mat-icon> Cumplimiento</h3>
          <ul>
            @for (c of report().complianceNotes; track c) {
              <li>{{ c }}</li>
            }
          </ul>
        </section>

        <p class="vps-op-dialog__meta">
          Análisis: {{ report().generatedAt }} · {{ report().durationSec }}s · {{ report().policyVersion }}
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="vps-ssh-actions">
        <button mat-stroked-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" (click)="handleExport('csv')">CSV</button>
        <button mat-stroked-button type="button" (click)="handleExport('json')">JSON</button>
        <button mat-stroked-button type="button" (click)="handleExport('md')">Markdown</button>
        @if (selectedKey(); as key) {
          @if ((key.rotateRequired || !rotatedKeys().has(key.name)) && !rotationPanelOpen()) {
            <button mat-stroked-button color="warn" type="button" (click)="handleStartRotation(key)">
              Ejecutar rotación
            </button>
          }
        }
        <button mat-flat-button color="primary" type="button" (click)="handleExport('pdf')">PDF</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .vps-op-dialog__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .vps-op-dialog__sub {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .vps-op-dialog__chip {
      flex-shrink: 0;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 14%, transparent);
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-op-dialog__chip[data-risk='critical'] {
      background: color-mix(in srgb, #ef4444 18%, transparent);
      color: #b91c1c;
    }
    .vps-op-dialog__chip[data-risk='high'],
    .vps-op-dialog__chip[data-risk='medium'] {
      background: color-mix(in srgb, #f59e0b 16%, transparent);
      color: #92400e;
    }
    .vps-ssh-summary {
      margin: 0 0 0.65rem;
      padding: 0.5rem 0.6rem;
      border-radius: 8px;
      font-size: 0.72rem;
      line-height: 1.45;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--infra-accent, #ff9900) 20%, transparent);
    }
    .vps-op-kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
      gap: 0.4rem;
      margin-bottom: 0.75rem;
    }
    .vps-op-kpi-row article {
      padding: 0.4rem 0.5rem;
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      background: color-mix(in srgb, var(--app-surface) 20%, var(--app-card));
    }
    .vps-op-kpi-row article[data-tone='warn'] strong { color: #b45309; }
    .vps-op-kpi-row article[data-tone='crit'] strong { color: #dc2626; }
    .vps-op-kpi-row span {
      display: block;
      font-size: 0.55rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-op-kpi-row strong {
      display: block;
      margin-top: 0.12rem;
      font-size: 0.85rem;
    }
    .vps-port-table-wrap {
      overflow-x: auto;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      border-radius: 10px;
    }
    .vps-port-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.68rem;
    }
    .vps-port-table th,
    .vps-port-table td {
      padding: 0.4rem 0.45rem;
      text-align: left;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      vertical-align: top;
    }
    .vps-port-table th {
      font-size: 0.58rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .vps-port-table tr[data-risk='warn'] { background: color-mix(in srgb, #f59e0b 5%, transparent); }
    .vps-port-table tr[data-risk='crit'] { background: color-mix(in srgb, #ef4444 7%, transparent); }
    .vps-ssh-row--selected {
      outline: 2px solid color-mix(in srgb, var(--infra-accent, #ff9900) 55%, transparent);
      outline-offset: -2px;
      cursor: pointer;
    }
    .vps-port-table tbody tr[role='button'] { cursor: pointer; }
    .vps-ssh-tag {
      display: inline-block;
      margin-left: 0.35rem;
      padding: 0.08rem 0.3rem;
      border-radius: 999px;
      font-size: 0.55rem;
      font-weight: 700;
      background: color-mix(in srgb, #f59e0b 20%, transparent);
      color: #92400e;
    }
    .vps-ssh-tag--ok {
      background: color-mix(in srgb, #10b981 20%, transparent);
      color: #047857;
    }
    .vps-risk-pill {
      display: inline-block;
      padding: 0.12rem 0.35rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .vps-risk-pill[data-risk='ok'] {
      background: color-mix(in srgb, #10b981 18%, transparent);
      color: #047857;
    }
    .vps-risk-pill[data-risk='warn'] {
      background: color-mix(in srgb, #f59e0b 18%, transparent);
      color: #92400e;
    }
    .vps-risk-pill[data-risk='crit'] {
      background: color-mix(in srgb, #ef4444 18%, transparent);
      color: #b91c1c;
    }
    .vps-ssh-priority {
      font-size: 0.62rem;
      font-weight: 700;
    }
    .vps-ssh-priority[data-priority='critical'] { color: #b91c1c; }
    .vps-ssh-priority[data-priority='high'] { color: #c2410c; }
    .vps-ssh-priority[data-priority='medium'] { color: #b45309; }
    .vps-ssh-priority[data-priority='low'] { color: #047857; }
    .vps-ssh-priority[data-priority='none'] { color: var(--app-text-muted); }
    .vps-op-section {
      margin-top: 0.75rem;
    }
    .vps-op-section h3 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .vps-op-section h3 mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-op-section ul {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }
    .vps-op-section--muted ul { list-style: square; }
    .vps-ssh-detail__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.45rem;
      margin-bottom: 0.5rem;
    }
    .vps-ssh-detail__grid span {
      display: block;
      font-size: 0.55rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-ssh-detail__grid strong {
      display: block;
      margin-top: 0.1rem;
      font-size: 0.68rem;
    }
    .vps-ssh-detail__hosts { margin-top: 0.45rem; }
    .vps-ssh-detail__actions {
      margin-top: 0.55rem;
      display: flex;
      gap: 0.4rem;
    }
    .vps-ssh-detail__actions mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      margin-right: 0.2rem;
    }
    .vps-ssh-warn-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.45rem;
      padding: 0.55rem 0.65rem;
      margin-bottom: 0.55rem;
      border-radius: 8px;
      background: color-mix(in srgb, #ef4444 10%, transparent);
      border: 1px solid color-mix(in srgb, #ef4444 28%, transparent);
      color: #991b1b;
      font-size: 0.68rem;
    }
    .vps-ssh-warn-banner mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      flex-shrink: 0;
    }
    .vps-ssh-warn-banner strong {
      display: block;
      margin-bottom: 0.15rem;
    }
    .vps-ssh-warn-banner span {
      color: #7f1d1d;
      line-height: 1.4;
    }
    .vps-op-alerts {
      list-style: none;
      margin: 0 0 0.65rem;
      padding: 0;
      display: grid;
      gap: 0.35rem;
    }
    .vps-op-alerts li {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      padding: 0.4rem 0.55rem;
      border-radius: 8px;
      font-size: 0.68rem;
      background: color-mix(in srgb, var(--app-text) 4%, transparent);
    }
    .vps-op-alerts li[data-severity='warn'] {
      background: color-mix(in srgb, #f59e0b 12%, transparent);
      color: #92400e;
    }
    .vps-op-alerts mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      flex-shrink: 0;
    }
    .vps-ssh-upload {
      display: grid;
      gap: 0.45rem;
      margin-bottom: 0.55rem;
    }
    .vps-ssh-upload .full { width: 100%; }
    .vps-ssh-file-upload {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.55rem;
      border-radius: 8px;
      border: 1px dashed color-mix(in srgb, var(--app-text) 18%, transparent);
      font-size: 0.68rem;
      cursor: pointer;
      width: fit-content;
    }
    .vps-ssh-file-upload input { display: none; }
    .vps-ssh-file-upload mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-ssh-fingerprint-preview {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.55rem;
      border-radius: 8px;
      font-size: 0.68rem;
      background: color-mix(in srgb, #10b981 10%, transparent);
      border: 1px solid color-mix(in srgb, #10b981 25%, transparent);
      color: #047857;
    }
    .vps-ssh-fingerprint-preview mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-ssh-key-error {
      display: flex;
      align-items: flex-start;
      gap: 0.3rem;
      margin: 0;
      font-size: 0.65rem;
      color: #b91c1c;
    }
    .vps-ssh-key-error mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-ssh-rotation-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-top: 0.55rem;
    }
    .vps-ssh-plan-window {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.45rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }
    .vps-ssh-plan-window mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }
    .vps-ssh-plan-steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.35rem;
    }
    .vps-ssh-plan-steps li {
      border: 1px solid color-mix(in srgb, var(--app-text) 7%, transparent);
      border-radius: 8px;
      padding: 0.45rem 0.55rem;
    }
    .vps-ssh-plan-steps li[data-status='blocked'] {
      border-color: color-mix(in srgb, #ef4444 35%, transparent);
      background: color-mix(in srgb, #ef4444 6%, transparent);
    }
    .vps-ssh-plan-steps header {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.45rem;
      align-items: start;
    }
    .vps-ssh-plan-steps__order {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.35rem;
      height: 1.35rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 700;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 18%, transparent);
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-ssh-plan-steps strong {
      display: block;
      font-size: 0.7rem;
    }
    .vps-ssh-plan-steps span {
      display: block;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .vps-ssh-plan-steps em {
      font-style: normal;
      font-size: 0.6rem;
      color: var(--app-text-muted);
      white-space: nowrap;
    }
    .vps-ssh-timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.35rem;
    }
    .vps-ssh-timeline li {
      display: grid;
      grid-template-columns: 130px 1fr;
      gap: 0.5rem;
      padding: 0.35rem 0;
      border-bottom: 1px dashed color-mix(in srgb, var(--app-text) 8%, transparent);
      font-size: 0.65rem;
    }
    .vps-ssh-timeline time { color: var(--app-text-muted); }
    .vps-ssh-timeline strong { display: block; font-size: 0.68rem; }
    .vps-ssh-timeline span { color: var(--app-text-muted); font-size: 0.62rem; }
    .vps-ssh-risks li { color: var(--app-text); }
    .vps-op-dialog__meta {
      margin: 0.75rem 0 0;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .vps-ssh-actions {
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class VpsSshRotationDialogComponent {
  private readonly dialogData = inject<VpsSshRotationDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  readonly report = signal(this.dialogData.report)
  readonly selectedKey = signal<SshKeyRecord | null>(
    this.dialogData.report.keys.find((k) => k.rotateRequired) ?? this.dialogData.report.keys[0] ?? null,
  )
  readonly rotationPanelOpen = signal(false)
  readonly deploying = signal(false)
  readonly rotatedKeys = signal(new Set<string>())
  readonly newPublicKeyText = signal('')
  readonly acknowledged = signal(false)

  readonly priorityLabel = priorityLabel
  readonly statusLabel = statusLabel
  readonly stepStatusLabel = stepStatusLabel

  readonly newKeyValid = computed(() => isValidSshPublicKey(this.newPublicKeyText()))
  readonly newFingerprintPreview = computed(() =>
    this.newKeyValid() ? previewSshKeyFingerprint(this.newPublicKeyText()) : '',
  )
  readonly canDeploy = computed(() => this.acknowledged() && this.newKeyValid())

  handleSelectKey = (key: SshKeyRecord): void => {
    if (this.deploying()) return
    this.selectedKey.set(key)
    this.handleCancelRotation()
  }

  handleStartRotation = (_key: SshKeyRecord): void => {
    this.rotationPanelOpen.set(true)
    this.newPublicKeyText.set('')
    this.acknowledged.set(false)
  }

  handleCancelRotation = (): void => {
    this.rotationPanelOpen.set(false)
    this.newPublicKeyText.set('')
    this.acknowledged.set(false)
  }

  handlePublicKeyFile = (event: Event): void => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '').trim()
      const line = text.split('\n').find((l) => l.startsWith('ssh-')) ?? text
      this.newPublicKeyText.set(line)
    }
    reader.readAsText(file)
    input.value = ''
  }

  handleConfirmDeploy = (key: SshKeyRecord): void => {
    if (!this.canDeploy()) return
    const fingerprint = previewSshKeyFingerprint(this.newPublicKeyText())
    this.runRotation(key, fingerprint, true)
  }

  handleRotateWithoutUpload = (key: SshKeyRecord): void => {
    if (!this.acknowledged()) return
    this.runRotation(key, key.fingerprint, false)
  }

  private runRotation = (key: SshKeyRecord, fingerprint: string, deployed: boolean): void => {
    this.deploying.set(true)
    of(null)
      .pipe(delay(deployed ? 1400 : 900))
      .subscribe(() => this.finishRotation(key, fingerprint, deployed))
  }

  private finishRotation = (key: SshKeyRecord, fingerprint: string, deployed: boolean): void => {
    const algo = deployed ? inferPublicKeyAlgorithm(this.newPublicKeyText()) : null
    const updated = applySshKeyRotation(this.report(), key.name, {
      newFingerprint: deployed ? fingerprint : undefined,
      newPublicKeyDeployed: deployed,
      newAlgorithm: algo?.algorithm,
      newKeyBits: algo?.keyBits ?? null,
    })
    this.report.set(updated)
    this.rotatedKeys.update((set) => new Set(set).add(key.name))
    this.selectedKey.set(updated.keys.find((k) => k.name === key.name) ?? null)
    this.handleCancelRotation()
    this.deploying.set(false)

    const result: SshRotationApplyResult = {
      keyName: key.name,
      newFingerprint: deployed ? fingerprint : key.fingerprint,
      newPublicKeyDeployed: deployed,
      replacementName: key.replacementName,
    }
    this.dialogData.onKeyRotated?.(result)

    if (deployed) {
      this.toast.success(`Clave ${key.name} rotada · authorized_keys actualizado en ${key.affectedHosts.length} host(s)`)
    } else {
      this.toast.warning(`Rotación de ${key.name} sin nueva clave — puede perder acceso hasta desplegar manualmente`)
    }
  }

  handleExport = (format: 'csv' | 'json' | 'md' | 'pdf'): void => {
    let filename = ''
    if (format === 'csv') filename = exportSshRotationCsv(this.report())
    else if (format === 'json') filename = exportSshRotationJson(this.report())
    else if (format === 'md') filename = exportSshRotationMarkdown(this.report())
    else filename = exportSshRotationPdf(this.report())
    this.toast.success(`Descargado ${filename}`)
  }
}
