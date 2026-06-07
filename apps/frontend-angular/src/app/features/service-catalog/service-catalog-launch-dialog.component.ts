import { Component, computed, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { CLOUD_FULL_LABELS } from './service-catalog.config'
import {
  SERVICE_CATALOG_CATEGORY_LABELS,
  SERVICE_CATALOG_CLOUD_LABELS,
  SERVICE_CATALOG_ENVIRONMENT_LABELS,
  SERVICE_CATALOG_STATUS_LABELS,
  type ServiceCatalogEnvironment,
  type ServiceCatalogLaunch,
  type ServiceCatalogTemplate,
} from './service-catalog.demo'
import { ENVIRONMENT_OPTIONS } from './service-catalog.config'
import {
  simulateLaunchOutput,
  type ServiceCatalogLaunchOptions,
} from './service-catalog.util'
import { ApprovalsService } from '../approvals/approvals.service'
import { needsApprovalBeforeLaunch } from '../approvals/approvals.util'
import { APPROVAL_ENV_LABELS } from '../approvals/approvals.config'

export interface ServiceCatalogLaunchDialogData {
  template: ServiceCatalogTemplate
}

export interface ServiceCatalogLaunchDialogResult {
  launch?: ServiceCatalogLaunch
  approvalSubmitted?: boolean
  approvalId?: string
  approvedSubject?: string
}

const STEPS = [
  { id: 'validate', icon: 'fact_check', label: 'Validar plantilla y permisos' },
  { id: 'params', icon: 'tune', label: 'Resolver parámetros del entorno' },
  { id: 'provision', icon: 'cloud_sync', label: 'Aprovisionar recursos cloud' },
  { id: 'verify', icon: 'verified', label: 'Verificar estado y registrar lanzamiento' },
] as const

@Component({
  selector: 'app-service-catalog-launch-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    BrandLogoComponent,
  ],
  template: `
    <div class="sc-launch" [formGroup]="form" [attr.data-cloud]="tpl.cloud">
      <header class="sc-launch__head">
        <div class="sc-launch__head-main">
          <div class="sc-launch__head-row">
            <span class="sc-launch__eyebrow">Lanzar plantilla</span>
            <span class="sc-launch__status" [attr.data-status]="tpl.status">{{ statusLabel(tpl.status) }}</span>
          </div>
          <h2 mat-dialog-title>{{ tpl.name }}</h2>
          <div class="sc-launch__meta">
            <span class="sc-launch__meta-chip">
              <app-brand-logo [logo]="tpl.cloud" size="sm" />
              {{ cloudLabel(tpl.cloud) }}
            </span>
            <span class="sc-launch__meta-chip">
              <app-brand-logo [logo]="tpl.techLogo" size="sm" />
              {{ categoryLabel(tpl.category) }}
            </span>
            <span class="sc-launch__meta-chip mono">{{ tpl.version }}</span>
            <span class="sc-launch__meta-id mono">{{ tpl.id }}</span>
          </div>
        </div>
        <div class="sc-launch__head-hero">
          <app-brand-logo [logo]="tpl.cloud" size="xl" />
          <span class="sc-launch__head-tech">
            <app-brand-logo [logo]="tpl.techLogo" size="lg" />
          </span>
        </div>
      </header>

      <mat-dialog-content class="sc-launch__body">
        <div class="sc-launch__layout">
          <section class="sc-launch__config">
            <h3><mat-icon>tune</mat-icon> Configuración del lanzamiento</h3>

            <div class="sc-launch__block">
              <p class="sc-launch__label">Entorno de despliegue</p>
              <div class="sc-launch__envs" role="radiogroup">
                @for (env of environments; track env) {
                  <button
                    type="button"
                    class="sc-launch__env"
                    [class.sc-launch__env--on]="form.get('environment')?.value === env"
                    (click)="form.patchValue({ environment: env })"
                  >
                    {{ envLabel(env) }}
                  </button>
                }
              </div>
            </div>

            <div class="sc-launch__block">
              <div class="sc-launch__block-head">
                <p class="sc-launch__label">Parámetros</p>
                <button type="button" class="sc-launch__link-btn" (click)="handleResetParameters()">
                  <mat-icon>restart_alt</mat-icon>
                  Restaurar defaults
                </button>
              </div>
              @if (tpl.parameters) {
                <details class="sc-launch__defaults">
                  <summary>Ver parámetros por defecto de la plantilla</summary>
                  <pre class="mono">{{ tpl.parameters }}</pre>
                </details>
              }
              <div class="sc-launch__terminal-input">
                <div class="sc-launch__terminal-bar">
                  <span></span><span></span><span></span>
                  <span class="mono">override.env</span>
                </div>
                <textarea
                  class="sc-launch__code mono"
                  rows="5"
                  formControlName="parameters"
                  placeholder="KEY=value&#10;Una variable por línea"
                ></textarea>
              </div>
              <p class="sc-launch__hint">Override opcional · vacío usa los valores de la plantilla</p>
            </div>

            <mat-form-field appearance="outline" class="sc-launch__full">
              <mat-label>Nota de ejecución</mat-label>
              <input matInput formControlName="note" placeholder="Ticket JIRA, motivo, referencia de cambio…" />
              <mat-hint>Quedará registrada en el historial de lanzamientos</mat-hint>
            </mat-form-field>

            <div class="sc-launch__toggles">
              <div class="sc-launch__toggle-card">
                <mat-slide-toggle formControlName="dryRun">Dry-run (solo validar)</mat-slide-toggle>
                <span>No crea recursos · simula plan y validaciones</span>
              </div>
              <div class="sc-launch__toggle-card">
                <mat-slide-toggle formControlName="notifyOnComplete">Notificar al completar</mat-slide-toggle>
                <span>Email al equipo propietario al finalizar</span>
              </div>
            </div>

            @if (warnings().length) {
              <ul class="sc-launch__warnings">
                @for (w of warnings(); track w) {
                  <li><mat-icon>warning</mat-icon>{{ w }}</li>
                }
              </ul>
            }

            @if (requiresApprovalSubmit()) {
              <div class="sc-launch__approval-notice">
                <mat-icon>verified_user</mat-icon>
                <div>
                  <strong>Se enviará a Aprobaciones</strong>
                  <p>Esta plantilla no se ejecutará ahora. Un revisor debe autorizar la acción siguiente:</p>
                  <p class="sc-launch__approval-subject">{{ approvalSubjectPreview() }}</p>
                  <span class="sc-launch__approval-hint">Aparecerá en Aprobaciones → Pendientes con tu usuario como solicitante.</span>
                </div>
              </div>
            }

            <div class="sc-launch__pipeline">
              <h4>Pipeline de ejecución</h4>
              <ol>
                @for (step of steps; track step.id; let i = $index) {
                  <li>
                    <span class="sc-launch__step-num">{{ i + 1 }}</span>
                    <mat-icon>{{ step.icon }}</mat-icon>
                    <span>{{ step.label }}</span>
                  </li>
                }
              </ol>
            </div>
          </section>

          <aside class="sc-launch__aside">
            <div class="sc-launch__info-card">
              <h3><mat-icon>info</mat-icon> Plantilla</h3>
              <p class="sc-launch__desc">{{ tpl.description }}</p>
              <div class="sc-launch__kpis">
                <div class="sc-launch__kpi">
                  <span>Tiempo est.</span>
                  <strong>{{ tpl.avgProvision }}</strong>
                </div>
                <div class="sc-launch__kpi">
                  <span>Coste est.</span>
                  <strong>{{ tpl.estimatedCost || '—' }}</strong>
                </div>
                <div class="sc-launch__kpi">
                  <span>Éxito 30d</span>
                  <strong>{{ tpl.successRate ?? 100 }}%</strong>
                </div>
                <div class="sc-launch__kpi">
                  <span>Lanzamientos</span>
                  <strong>{{ tpl.launches30d }}</strong>
                </div>
              </div>
              <ul class="sc-launch__gov">
                <li><mat-icon>groups</mat-icon><span>Owner</span><strong>{{ tpl.owner }}</strong></li>
                @if (tpl.contactEmail) {
                  <li><mat-icon>mail</mat-icon><span>Contacto</span><strong>{{ tpl.contactEmail }}</strong></li>
                }
                <li>
                  <mat-icon>{{ tpl.requiresApproval ? 'verified_user' : 'lock_open' }}</mat-icon>
                  <span>Aprobación</span>
                  <strong>{{ tpl.requiresApproval ? 'Requerida' : 'No requerida' }}</strong>
                </li>
              </ul>
            </div>

            @if (tpl.resourcesCreated?.length) {
              <div class="sc-launch__resources">
                <h4>Recursos que se crearán</h4>
                <ul>
                  @for (r of tpl.resourcesCreated!; track r) {
                    <li><mat-icon>inventory_2</mat-icon>{{ r }}</li>
                  }
                </ul>
              </div>
            }

            @if (tpl.provisionSteps?.length) {
              <div class="sc-launch__steps-ref">
                <h4>Pasos de la plantilla</h4>
                <ol>
                  @for (step of tpl.provisionSteps!; track step; let i = $index) {
                    <li><span>{{ i + 1 }}</span>{{ step }}</li>
                  }
                </ol>
              </div>
            }

            <div class="sc-launch__preview">
              <div class="sc-launch__preview-head">
                <h4><mat-icon>terminal</mat-icon> Salida simulada</h4>
                <span class="sc-launch__preview-mode">
                  {{ form.get('dryRun')?.value ? 'Dry-run' : 'Provisionado' }} · {{ envLabel(form.get('environment')?.value) }}
                </span>
              </div>
              <div class="sc-launch__terminal">
                <div class="sc-launch__terminal-bar sc-launch__terminal-bar--dark">
                  <span></span><span></span><span></span>
                  <span class="mono">launch.log</span>
                </div>
                <pre class="sc-launch__code sc-launch__code--out mono">{{ previewOutput() }}</pre>
              </div>
            </div>
          </aside>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="sc-launch__actions">
        <div class="sc-launch__actions-meta">
          <span>{{ cloudFullLabel(tpl.cloud) }}</span>
          <span>·</span>
          <span>{{ envLabel(form.get('environment')?.value) }}</span>
          @if (form.get('dryRun')?.value) {
            <span class="sc-launch__actions-badge">Modo validación</span>
          }
        </div>
        <div class="sc-launch__actions-btns">
          <button mat-button type="button" mat-dialog-close [disabled]="running()">Cancelar</button>
          <button mat-flat-button color="primary" type="button" [disabled]="running() || !canLaunch()" (click)="handleLaunch()">
            <mat-icon>{{ launchButtonIcon() }}</mat-icon>
            {{ launchButtonLabel() }}
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      font-size: 0.8125rem;
      color: #0f172a;
    }
    .sc-launch {
      --sc-accent: #64748b;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }
    .sc-launch[data-cloud='aws'] { --sc-accent: #ff9900; }
    .sc-launch[data-cloud='gcp'] { --sc-accent: #4285f4; }
    .sc-launch[data-cloud='azure'] { --sc-accent: #0078d4; }

    .sc-launch__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-shrink: 0;
      padding: 0.9rem 1.15rem 0.75rem;
      background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
      border-bottom: 1px solid #f1f5f9;
      position: relative;
    }
    .sc-launch__head::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--sc-accent), transparent 65%);
      opacity: 0.5;
    }
    .sc-launch__head-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.12rem;
    }
    .sc-launch__eyebrow {
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sc-launch__head h2 {
      margin: 0 0 0.4rem;
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .sc-launch__status {
      font-size: 0.56rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.18rem 0.45rem;
      border-radius: 999px;
      background: rgb(5 150 105 / 0.1);
      color: #059669;
    }
    .sc-launch__status[data-status='draft'] { background: #f1f5f9; color: #64748b; }
    .sc-launch__status[data-status='deprecated'] { background: rgb(185 28 28 / 0.08); color: #b91c1c; }
    .sc-launch__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.28rem;
    }
    .sc-launch__meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.22rem;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 650;
      background: #f1f5f9;
      color: #475569;
    }
    .sc-launch__meta-id {
      background: none;
      color: #94a3b8;
      padding: 0;
    }
    .sc-launch__head-hero {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 4.5rem;
      height: 4.5rem;
      border-radius: 14px;
      background: #f8fafc;
      flex-shrink: 0;
    }
    .sc-launch__head-tech {
      position: absolute;
      right: -0.28rem;
      bottom: -0.28rem;
      display: flex;
      padding: 0.2rem;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 2px 8px rgb(15 23 42 / 0.1);
    }

    .sc-launch__body {
      flex: 1;
      min-height: 0;
      padding: 0.75rem 1.15rem 1rem !important;
      overflow-x: hidden;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
    }
    .sc-launch__layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 0.85rem;
      align-items: start;
    }
    .sc-launch__config {
      min-width: 0;
    }
    .sc-launch__config > h3,
    .sc-launch__info-card h3 {
      display: flex;
      align-items: center;
      gap: 0.32rem;
      margin: 0 0 0.55rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #1e293b;
    }
    .sc-launch__config > h3 mat-icon,
    .sc-launch__info-card h3 mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: var(--sc-accent);
    }
    .sc-launch__block { margin-bottom: 0.65rem; }
    .sc-launch__block-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .sc-launch__label {
      margin: 0 0 0.28rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .sc-launch__link-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.15rem 0.35rem;
      border: none;
      border-radius: 6px;
      background: transparent;
      font: inherit;
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .sc-launch__link-btn:hover { background: #f1f5f9; color: #334155; }
    .sc-launch__link-btn mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .sc-launch__envs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.28rem;
    }
    .sc-launch__env {
      padding: 0.28rem 0.55rem;
      border: none;
      border-radius: 999px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.68rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: background 0.12s, color 0.12s;
    }
    .sc-launch__env--on {
      background: var(--sc-accent);
      color: #fff;
    }
    .sc-launch__defaults {
      margin-bottom: 0.35rem;
      font-size: 0.65rem;
      color: #64748b;
    }
    .sc-launch__defaults summary {
      cursor: pointer;
      font-weight: 600;
      color: #475569;
    }
    .sc-launch__defaults pre {
      margin: 0.35rem 0 0;
      padding: 0.4rem 0.5rem;
      border-radius: 8px;
      background: #f8fafc;
      font-size: 0.62rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .sc-launch__terminal-input,
    .sc-launch__terminal {
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgb(15 23 42 / 0.08);
    }
    .sc-launch__terminal-bar {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.35rem 0.5rem;
      background: #e2e8f0;
    }
    .sc-launch__terminal-bar--dark { background: #1e293b; }
    .sc-launch__terminal-bar span:nth-child(1),
    .sc-launch__terminal-bar span:nth-child(2),
    .sc-launch__terminal-bar span:nth-child(3) {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background: #94a3b8;
    }
    .sc-launch__terminal-bar--dark span:nth-child(1) { background: #ef4444; }
    .sc-launch__terminal-bar--dark span:nth-child(2) { background: #eab308; }
    .sc-launch__terminal-bar--dark span:nth-child(3) { background: #22c55e; }
    .sc-launch__terminal-bar span:last-child {
      margin-left: auto;
      font-size: 0.58rem;
      color: #64748b;
    }
    .sc-launch__terminal-bar--dark span:last-child { color: #94a3b8; }
    .sc-launch__code {
      display: block;
      width: 100%;
      margin: 0;
      padding: 0.55rem 0.65rem;
      border: none;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.68rem;
      line-height: 1.5;
      resize: vertical;
      box-sizing: border-box;
      min-height: 5.5rem;
    }
    .sc-launch__code--out {
      min-height: 7rem;
      white-space: pre-wrap;
    }
    .sc-launch__hint {
      margin: 0.28rem 0 0;
      font-size: 0.62rem;
      color: #94a3b8;
    }
    .sc-launch__full { width: 100%; }
    .sc-launch__toggles {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.5rem;
    }
    .sc-launch__toggle-card {
      padding: 0.4rem 0.5rem;
      border-radius: 9px;
      background: #f8fafc;
      box-shadow: inset 0 0 0 1px #eef2f6;
    }
    .sc-launch__toggle-card span {
      display: block;
      margin-top: 0.15rem;
      font-size: 0.62rem;
      color: #94a3b8;
      padding-left: 2.75rem;
    }
    .sc-launch__warnings {
      list-style: none;
      margin: 0 0 0.55rem;
      padding: 0.45rem 0.5rem;
      border-radius: 9px;
      background: #fffbeb;
    }
    .sc-launch__warnings li {
      display: flex;
      align-items: flex-start;
      gap: 0.28rem;
      font-size: 0.68rem;
      color: #b45309;
      line-height: 1.4;
      padding: 0.12rem 0;
    }
    .sc-launch__warnings mat-icon {
      flex-shrink: 0;
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .sc-launch__approval-notice {
      display: flex;
      gap: 0.45rem;
      margin-bottom: 0.55rem;
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: #eff6ff;
      color: #1e40af;
    }
    .sc-launch__approval-notice mat-icon {
      flex-shrink: 0;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .sc-launch__approval-notice strong {
      display: block;
      font-size: 0.72rem;
      margin-bottom: 0.2rem;
    }
    .sc-launch__approval-notice p {
      margin: 0 0 0.25rem;
      font-size: 0.68rem;
      line-height: 1.45;
      color: #334155;
    }
    .sc-launch__approval-subject {
      font-weight: 700;
      color: #0f172a !important;
    }
    .sc-launch__approval-hint {
      display: block;
      font-size: 0.62rem;
      color: #64748b;
    }
    .sc-launch__pipeline h4 {
      margin: 0 0 0.35rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }
    .sc-launch__pipeline ol {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .sc-launch__pipeline li {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.22rem 0;
      font-size: 0.68rem;
      color: #475569;
    }
    .sc-launch__step-num {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.1rem;
      height: 1.1rem;
      border-radius: 999px;
      font-size: 0.55rem;
      font-weight: 700;
      background: var(--sc-accent);
      color: #fff;
    }
    .sc-launch__pipeline mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
      color: #94a3b8;
    }

    .sc-launch__aside {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      min-width: 0;
    }
    .sc-launch__info-card {
      padding: 0.55rem 0.6rem;
      border-radius: 11px;
      background: #f8fafc;
      box-shadow: inset 0 0 0 1px #eef2f6;
    }
    .sc-launch__desc {
      margin: 0 0 0.45rem;
      font-size: 0.68rem;
      color: #64748b;
      line-height: 1.5;
    }
    .sc-launch__kpis {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.3rem;
      margin-bottom: 0.45rem;
    }
    .sc-launch__kpi {
      padding: 0.35rem 0.4rem;
      border-radius: 8px;
      background: #fff;
    }
    .sc-launch__kpi span {
      display: block;
      font-size: 0.52rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #94a3b8;
    }
    .sc-launch__kpi strong {
      display: block;
      margin-top: 0.06rem;
      font-size: 0.74rem;
      color: #0f172a;
    }
    .sc-launch__gov {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.65rem;
    }
    .sc-launch__gov li {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.2rem 0.35rem;
      padding: 0.22rem 0;
      border-top: 1px solid #eef2f6;
    }
    .sc-launch__gov mat-icon {
      grid-row: span 2;
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
      color: var(--sc-accent);
    }
    .sc-launch__gov span { color: #94a3b8; font-size: 0.55rem; text-transform: uppercase; }
    .sc-launch__gov strong { color: #334155; font-weight: 600; word-break: break-word; }

    .sc-launch__resources h4,
    .sc-launch__steps-ref h4,
    .sc-launch__preview-head h4 {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      margin: 0 0 0.3rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .sc-launch__resources h4 mat-icon,
    .sc-launch__preview-head h4 mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .sc-launch__resources ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .sc-launch__resources li {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      padding: 0.18rem 0;
      font-size: 0.65rem;
      color: #334155;
    }
    .sc-launch__resources mat-icon {
      font-size: 0.8rem;
      width: 0.8rem;
      height: 0.8rem;
      color: #059669;
    }
    .sc-launch__steps-ref ol {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.64rem;
      color: #475569;
    }
    .sc-launch__steps-ref li {
      display: flex;
      gap: 0.35rem;
      padding: 0.15rem 0;
    }
    .sc-launch__steps-ref li span {
      flex-shrink: 0;
      font-weight: 700;
      color: var(--sc-accent);
    }
    .sc-launch__preview-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem;
      margin-bottom: 0.28rem;
    }
    .sc-launch__preview-mode {
      font-size: 0.58rem;
      font-weight: 600;
      color: #64748b;
    }

    .sc-launch__actions {
      display: flex !important;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.7rem 1.15rem !important;
      flex-shrink: 0;
      border-top: 1px solid #e2e8f0;
      background: #fff;
    }
    .sc-launch__actions-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.65rem;
      color: #64748b;
    }
    .sc-launch__actions-badge {
      padding: 0.12rem 0.38rem;
      border-radius: 999px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 650;
    }
    .sc-launch__actions-btns {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-left: auto;
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }

    @media (max-width: 760px) {
      .sc-launch__layout { grid-template-columns: 1fr; }
      .sc-launch__head { flex-direction: column; align-items: flex-start; }
      .sc-launch__head-hero { align-self: center; }
    }
  `,
})
export class ServiceCatalogLaunchDialogComponent {
  readonly data = inject<ServiceCatalogLaunchDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(
    MatDialogRef<ServiceCatalogLaunchDialogComponent, ServiceCatalogLaunchDialogResult>,
  )
  private readonly fb = inject(FormBuilder)
  private readonly approvals = inject(ApprovalsService)

  readonly tpl = this.data.template
  readonly environments = ENVIRONMENT_OPTIONS
  readonly steps = STEPS
  readonly running = signal(false)

  readonly form = this.fb.nonNullable.group({
    environment: [this.tpl.environment ?? ('staging' as ServiceCatalogEnvironment)],
    parameters: [this.tpl.parameters ?? ''],
    note: [''],
    dryRun: [false],
    notifyOnComplete: [true],
  })

  categoryLabel = (c: ServiceCatalogTemplate['category']): string => SERVICE_CATALOG_CATEGORY_LABELS[c]
  cloudLabel = (c: ServiceCatalogTemplate['cloud']): string => SERVICE_CATALOG_CLOUD_LABELS[c]
  cloudFullLabel = (c: ServiceCatalogTemplate['cloud']): string => CLOUD_FULL_LABELS[c]
  statusLabel = (s: ServiceCatalogTemplate['status']): string => SERVICE_CATALOG_STATUS_LABELS[s]
  envLabel = (e: ServiceCatalogEnvironment | null | undefined): string =>
    e ? SERVICE_CATALOG_ENVIRONMENT_LABELS[e] : '—'

  warnings = computed((): string[] => {
    const w: string[] = []
    if (this.tpl.status === 'draft') w.push('La plantilla está en borrador — publícala antes de lanzar.')
    if (this.tpl.status === 'deprecated') w.push('Plantilla obsoleta — no recomendada para nuevos despliegues.')
    if (this.tpl.requiresApproval && !this.form.get('dryRun')?.value) {
      w.push('Requiere aprobación previa en entornos sensibles.')
    }
    if (this.form.get('environment')?.value === 'production' && !this.form.get('dryRun')?.value) {
      w.push('Entorno producción — considera dry-run primero.')
    }
    return w
  })

  canLaunch = (): boolean => {
    if (this.tpl.status === 'draft' && !this.form.get('dryRun')?.value) return false
    if (this.tpl.status === 'deprecated' && !this.form.get('dryRun')?.value) return false
    return true
  }

  requiresApprovalSubmit = computed((): boolean => {
    const opts = this.form.getRawValue() as ServiceCatalogLaunchOptions
    return needsApprovalBeforeLaunch(this.tpl, opts)
  })

  approvalSubjectPreview = computed((): string => {
    const env = this.form.get('environment')?.value as ServiceCatalogEnvironment
    const envLabel = env ? APPROVAL_ENV_LABELS[env] : '—'
    return `Lanzar plantilla «${this.tpl.name}» (${this.tpl.version}) en ${envLabel}`
  })

  launchButtonLabel = computed((): string => {
    if (this.running()) return 'Enviando…'
    if (this.form.get('dryRun')?.value) return 'Validar'
    if (this.requiresApprovalSubmit()) return 'Solicitar aprobación'
    return 'Lanzar ahora'
  })

  launchButtonIcon = computed((): string => {
    if (this.running()) return 'hourglass_top'
    if (this.form.get('dryRun')?.value) return 'science'
    if (this.requiresApprovalSubmit()) return 'send'
    return 'rocket_launch'
  })

  previewOutput = (): string => simulateLaunchOutput(this.tpl, this.form.getRawValue() as ServiceCatalogLaunchOptions).output

  handleResetParameters = (): void => {
    this.form.patchValue({ parameters: this.tpl.parameters ?? '' })
  }

  handleLaunch = (): void => {
    if (!this.canLaunch()) return
    this.running.set(true)
    const opts = this.form.getRawValue() as ServiceCatalogLaunchOptions

    if (needsApprovalBeforeLaunch(this.tpl, opts)) {
      setTimeout(() => {
        this.running.set(false)
        const request = this.approvals.submitServiceCatalogLaunch(this.tpl, opts)
        this.dialogRef.close({
          approvalSubmitted: true,
          approvalId: request.id,
          approvedSubject: request.approvedSubject,
        })
      }, 650)
      return
    }

    const result = simulateLaunchOutput(this.tpl, opts)
    setTimeout(() => {
      this.running.set(false)
      const launch: ServiceCatalogLaunch = {
        id: `launch-${Date.now()}`,
        templateId: this.tpl.id,
        templateName: this.tpl.name,
        user: 'ops@cloudops.local',
        cloud: this.tpl.cloud,
        category: this.tpl.category,
        launchedAt: new Date().toISOString(),
        duration: result.duration,
        status: result.status,
        environment: opts.environment,
        parameters: opts.parameters || this.tpl.parameters,
        resourceId: result.resourceId,
        output: result.output,
        triggeredBy: 'manual',
        templateVersion: this.tpl.version,
        errorMessage: result.errorMessage,
        progress: result.status === 'running' ? 45 : undefined,
      }
      this.dialogRef.close({ launch })
    }, opts.dryRun ? 400 : 1400)
  }
}
