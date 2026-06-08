import { DatePipe } from '@angular/common'
import { Component, inject, Input, output } from '@angular/core'
import type { CloudProvider } from '../core/models/api.models'
import type { TerraformWorkspaceItem } from '../core/stores/terraform-run.store'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { IntegrationConnectionService } from '../core/services/integration-connection.service'
import { StatusBadgeComponent } from '../shared/components/status-badge/status-badge.component'
import { TerraformEditorComponent } from './terraform-editor/terraform-editor.component'
import { TerraformPlanViewerComponent } from '../features/terraform/components/terraform-plan-viewer.component'
import {
  TERRAFORM_HUB_TABS,
  projectStatusLabel,
  triggerLabel,
  type TerraformAutomation,
  type TerraformDeploymentRecord,
  type TerraformHubTabId,
  type TerraformProject,
} from './terraform-projects'
import { complianceTierLabel, stateBackendLabel } from './terraform-create-project.meta'
import { TerraformLaunchStudioComponent } from './terraform-launch-studio.component'
import type { TerraformLaunchDetail } from './terraform-launches.demo'

@Component({
  selector: 'app-terraform-workspace-hub',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    StatusBadgeComponent,
    TerraformEditorComponent,
    TerraformPlanViewerComponent,
    TerraformLaunchStudioComponent,
  ],
  template: `
    <div class="hub">
      <nav class="hub__tabs" aria-label="Secciones del proyecto">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            class="hub__tab"
            [class.hub__tab--active]="activeTab === tab.id"
            (click)="tabChange.emit(tab.id)"
          >
            <mat-icon>{{ tab.icon }}</mat-icon>
            {{ tab.label }}
          </button>
        }
      </nav>

      <div class="hub__panel">
        @if (activeTab === 'deploy') {
          <div class="hub-deploy">
            @if (!providerConnected) {
              <div class="hub-deploy__alert" role="alert">
                <mat-icon>link_off</mat-icon>
                <span>Conecta una cuenta cloud para ejecutar init / plan / apply.</span>
                <button type="button" class="hub-deploy__link" (click)="handleConnectCloud()">
                  Conectar cuenta cloud
                </button>
              </div>
            }

            <div class="hub-deploy__top">
            <header class="hub-deploy__hero">
              <div class="hub-deploy__hero-main">
                <span class="hub-deploy__provider" [attr.data-provider]="workspaceProvider">
                  {{ workspaceProvider }}
                </span>
                <div class="hub-deploy__hero-copy">
                  <span class="hub-deploy__eyebrow">Workspace activo</span>
                  <strong class="mono hub-deploy__ws-name">{{ workspaceName }}</strong>
                  @if (activeProject) {
                    <span class="hub-deploy__proj-line">
                      {{ activeProject.name }}
                      · {{ stateBackendLabel(activeProject.stateBackend) }}
                    </span>
                  }
                </div>
              </div>
              <div class="hub-deploy__hero-side">
                <span class="hub-deploy__ws-status" [attr.data-status]="workspaceStatus">
                  {{ workspaceStatusLabel(workspaceStatus) }}
                </span>
                @if (busy) {
                  <span class="hub-deploy__busy"><mat-icon>sync</mat-icon> Ejecutando</span>
                }
                @if (activeRunId) {
                  <span class="hub-deploy__run mono">run {{ activeRunId }}</span>
                }
              </div>
            </header>

            <nav class="hub-deploy__pipeline" aria-label="Pipeline Terraform">
              @for (step of deployPipeline(); track step.id; let i = $index) {
                @if (i > 0) {
                  <span class="hub-deploy__pipe" [class.hub-deploy__pipe--done]="step.status === 'done'" aria-hidden="true"></span>
                }
                <button
                  type="button"
                  class="hub-deploy__step"
                  [attr.data-status]="step.status"
                  [disabled]="step.disabled"
                  (click)="handleDeployStep(step.id)"
                >
                  <span class="hub-deploy__step-icon"><mat-icon>{{ step.icon }}</mat-icon></span>
                  <span class="hub-deploy__step-body">
                    <strong>{{ step.label }}</strong>
                    <span>{{ step.hint }}</span>
                  </span>
                  @if (step.status === 'done') {
                    <mat-icon class="hub-deploy__step-check">check_circle</mat-icon>
                  }
                </button>
              }
              <button
                type="button"
                class="hub-deploy__step hub-deploy__step--danger"
                [disabled]="actionsDisabled"
                (click)="toggleDestroy.emit()"
              >
                <span class="hub-deploy__step-icon"><mat-icon>delete_forever</mat-icon></span>
                <span class="hub-deploy__step-body">
                  <strong>destroy</strong>
                  <span>Destruir infraestructura</span>
                </span>
              </button>
            </nav>

            @if (showDestroyConfirm) {
              <div class="hub-deploy__destroy-bar">
                <mat-icon>warning</mat-icon>
                <label for="hub-destroy-input">Confirma escribiendo DESTROY</label>
                <input
                  id="hub-destroy-input"
                  class="mono"
                  [value]="destroyConfirm"
                  (input)="destroyConfirmChange.emit($any($event.target).value)"
                />
                <button mat-flat-button color="warn" type="button" [disabled]="destroyConfirm !== 'DESTROY'" (click)="runDestroy.emit()">
                  Confirmar destroy
                </button>
              </div>
            }

            @if (hasPlan && planResources.length) {
              <div class="hub-deploy__plan-strip">
                <header>
                  <mat-icon>difference</mat-icon>
                  <div>
                    <strong>Vista previa del plan</strong>
                    <span>Cambios detectados antes del apply</span>
                  </div>
                </header>
                <ul class="hub-deploy__plan-chips">
                  @for (res of planResources.slice(0, 6); track res.name + res.change) {
                    <li [attr.data-change]="res.change">
                      <span class="mono">{{ res.type }}</span>
                      <span>{{ res.name }}</span>
                      <span class="hub-deploy__plan-op">{{ planChangeLabel(res.change) }}</span>
                    </li>
                  }
                </ul>
              </div>
            }
            </div>

            <div class="hub-deploy__main">
            <div class="hub-deploy__workspace" [class.hub-deploy__workspace--with-plan]="hasPlan && planOutput">
              <section class="hub-deploy__editor-zone">
                <header class="hub-deploy__zone-head">
                  <mat-icon>code</mat-icon>
                  <div>
                    <strong>Editor HCL</strong>
                    <span>Define módulos y recursos del workspace</span>
                  </div>
                  <span class="hub-deploy__dirty">{{ editorHcl.length ? 'Sin guardar' : 'Vacío' }}</span>
                </header>
                <div class="hub-deploy__editor">
                  <app-terraform-editor [value]="editorHcl" (valueChange)="editorChange.emit($event)" />
                </div>
              </section>
              @if (hasPlan && planOutput) {
                <aside class="hub-deploy__plan-zone" aria-label="Salida del plan">
                  <header class="hub-deploy__zone-head">
                    <mat-icon>playlist_add_check</mat-icon>
                    <div>
                      <strong>Plan Terraform</strong>
                      <span>Revisa antes de aplicar</span>
                    </div>
                  </header>
                  <div class="hub-deploy__plan-view">
                    <app-terraform-plan-viewer
                      [planOutput]="planOutput"
                      [runId]="activeRunId"
                      [resources]="planResources"
                    />
                  </div>
                </aside>
              }
            </div>

            <div class="hub-deploy__resize" (mousedown)="resizeTerminal.emit($event)" role="separator" aria-label="Redimensionar terminal"></div>
            <div class="hub-deploy__terminal" [style.height.px]="terminalHeight">
              <header>
                <span class="hub-deploy__term-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                <mat-icon>terminal</mat-icon>
                <span>Salida en vivo</span>
                <span class="hub-deploy__term-meta">{{ terminalLines.length }} líneas</span>
                <button mat-button type="button" (click)="clearTerminal.emit()">Limpiar</button>
              </header>
              <div class="hub-deploy__term-scroll">
                @for (line of terminalLines; track $index) {
                  <div class="tf-line" [class]="lineClass(line)">{{ line }}</div>
                }
                @if (terminalLines.length === 0) {
                  <div class="hub-deploy__term-empty">
                    <mat-icon>info</mat-icon>
                    <p>Ejecuta <strong>init</strong> y <strong>plan</strong> para ver logs del proveedor y del state remoto.</p>
                    <p class="mono">cloudops-terraform $ terraform workspace select {{ workspaceName }}</p>
                  </div>
                }
              </div>
            </div>
            </div>
          </div>
        }

        @if (activeTab === 'launches') {
          <app-terraform-launch-studio
            [launches]="launchDetails"
            [selectedLaunchId]="selectedLaunchId"
            [selectedLaunch]="selectedLaunch"
            (launchSelect)="launchSelect.emit($event)"
            (openLaunch)="openLaunch.emit()"
          />
        }

        @if (activeTab === 'project') {
          @if (!activeProject) {
            <p class="hub-empty">Selecciona un proyecto en el panel izquierdo.</p>
          } @else {
            <div class="hub-project hub-feature--flat">
              <header class="hub-project__head">
                <div>
                  <h3>{{ activeProject.name }}</h3>
                  <p>{{ activeProject.description }}</p>
                </div>
                <span class="hub-project__status" [attr.data-status]="activeProject.status">
                  {{ projectStatusLabel(activeProject.status) }}
                </span>
              </header>
              <div class="hub-project__meta">
                <div><span>Guardado</span><strong>{{ activeProject.savedAt | date: 'dd MMM yyyy, HH:mm' }}</strong></div>
                <div><span>Último deploy</span><strong>{{ activeProject.lastDeploy | date: 'dd MMM, HH:mm' }}</strong></div>
                <div><span>State</span><strong>{{ stateBackendLabel(activeProject.stateBackend) }}</strong></div>
                <div><span>Cumplimiento</span><strong>{{ complianceTierLabel(activeProject.complianceTier) }}</strong></div>
                <div><span>Automatizaciones</span><strong>{{ activeProject.automationsCount }}</strong></div>
                <div><span>Despliegues</span><strong>{{ activeProject.deploymentsCount }}</strong></div>
              </div>
              <div class="hub-project__tags">
                @for (tag of activeProject.tags; track tag) {
                  <span class="hub-tag">{{ tag }}</span>
                }
              </div>
              <section>
                <h4>Entornos</h4>
                <div class="hub-env-grid">
                  @for (env of activeProject.environments; track env.id) {
                    <button
                      type="button"
                      class="hub-env-card"
                      (click)="environmentSelect.emit(env.workspaceId)"
                      [attr.aria-label]="'Abrir workspace ' + env.workspace"
                    >
                      <span class="hub-env-card__lbl">{{ env.label }}</span>
                      <span class="mono hub-env-card__ws">{{ env.workspace }}</span>
                      <app-status-badge [value]="env.status" />
                    </button>
                  }
                </div>
              </section>
              <div class="hub-project__actions">
                <button mat-flat-button color="primary" type="button" (click)="saveProject.emit()">
                  <mat-icon>save</mat-icon> Guardar proyecto
                </button>
                <button mat-stroked-button type="button" (click)="tabChange.emit('deploy')">
                  <mat-icon>rocket_launch</mat-icon> Ir a desplegar
                </button>
                <button mat-stroked-button type="button" (click)="tabChange.emit('automate')">
                  <mat-icon>schedule</mat-icon> Automatizar
                </button>
              </div>
            </div>
          }
        }

        @if (activeTab === 'automate') {
          <div class="hub-auto hub-feature--flat">
            <header class="hub-auto__head">
              <div>
                <h3>Automatización</h3>
                <p>Planes y applies programados, webhooks y disparadores Git.</p>
              </div>
              <button mat-flat-button color="primary" type="button" (click)="createAutomation.emit()">
                <mat-icon>add</mat-icon> Nueva regla
              </button>
            </header>
            <div class="hub-auto__list">
              @for (auto of automations; track auto.id) {
                <article class="hub-auto-card" [class.hub-auto-card--off]="!auto.enabled">
                  <div class="hub-auto-card__main">
                    <mat-icon>{{ autoIcon(auto.trigger) }}</mat-icon>
                    <div>
                      <strong>{{ auto.name }}</strong>
                      <span>{{ auto.projectName }} · {{ auto.environment }}</span>
                      <span class="hub-auto-card__meta">
                        {{ triggerLabel(auto.trigger) }}
                        @if (auto.schedule) { · {{ auto.schedule }} }
                        · {{ auto.action }}
                      </span>
                    </div>
                  </div>
                  <div class="hub-auto-card__side">
                    <mat-slide-toggle
                      [checked]="auto.enabled"
                      (change)="toggleAutomation.emit(auto.id)"
                      aria-label="Activar automatización"
                    />
                    <app-status-badge [value]="auto.status" />
                    @if (auto.nextRun) {
                      <span class="hub-auto-card__next">Próximo: {{ auto.nextRun }}</span>
                    }
                  </div>
                </article>
              }
            </div>
          </div>
        }

        @if (activeTab === 'history') {
          <div class="hub-history hub-feature--flat">
            <header class="hub-history__head">
              <h3>Historial de despliegues</h3>
              <p>Auditoría de planes, applies y quién los disparó.</p>
            </header>
            <ul class="hub-history__feed">
              @for (dep of deployments; track dep.id) {
                <li>
                  <button type="button" class="hub-history__item" (click)="deploymentSelect.emit(dep)">
                    <app-status-badge [value]="dep.status" />
                    <div class="hub-history__body">
                      <strong>{{ dep.projectName }}</strong>
                      <span>{{ dep.action }} → {{ dep.environment }} · {{ dep.changesSummary }}</span>
                      <span class="hub-history__meta">
                        {{ dep.triggeredBy }} · {{ dep.duration }} · {{ dep.createdAt | date: 'dd MMM, HH:mm' }}
                      </span>
                    </div>
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </li>
              }
            </ul>
          </div>
        }

        @if (activeTab === 'modules') {
          @if (!activeProject) {
            <p class="hub-empty">Selecciona un proyecto para ver sus módulos.</p>
          } @else {
            <div class="hub-modules hub-feature--flat">
              <header>
                <h3>Módulos Terraform</h3>
                <p>Dependencias declaradas en el proyecto activo.</p>
              </header>
              <div class="hub-modules__body">
                <table class="hub-modules__table">
                  <thead>
                    <tr>
                      <th scope="col">Módulo</th>
                      <th scope="col">Origen</th>
                      <th scope="col">Versión</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (mod of activeProject.modules; track mod.name) {
                      <tr>
                        <td><strong>{{ mod.name }}</strong></td>
                        <td class="mono">{{ mod.source }}</td>
                        <td class="mono">{{ mod.version }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
                @if (planOutput) {
                  <div class="hub-modules__plan">
                    <app-terraform-plan-viewer
                      [planOutput]="planOutput"
                      [runId]="activeRunId"
                      [resources]="planResources"
                    />
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 0;
      min-width: 0;
    }
    .hub {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: transparent;
      border: none;
      box-shadow: none;
    }
    .hub__tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      padding: 0.35rem 0 0.5rem;
      flex-shrink: 0;
      border: none;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
    }
    .hub__tab {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.7rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: transparent;
      font: inherit;
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--app-text-muted);
      cursor: pointer;
    }
    .hub__tab mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .hub__tab--active {
      background: color-mix(in srgb, #844fba 14%, transparent);
      color: #844fba;
    }
    .hub__panel {
      flex: 1;
      min-height: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .hub__panel > .hub-deploy,
    .hub__panel > .hub-project,
    .hub__panel > .hub-auto,
    .hub__panel > .hub-history,
    .hub__panel > .hub-modules,
    .hub__panel > app-terraform-launch-studio {
      flex: 1;
      min-height: 0;
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .hub__panel > app-terraform-launch-studio {
      min-width: 0;
    }
    .hub-empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 1.5rem;
      color: var(--app-text-muted);
      font-size: 0.85rem;
      text-align: center;
    }
    .hub-deploy {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      gap: 0.45rem;
      padding: 0.1rem 0 0;
      height: 100%;
    }
    .hub-deploy__top {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      flex-shrink: 0;
      max-height: 42%;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    .hub-deploy__main {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      gap: 0.35rem;
    }
    .hub-deploy__alert {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.55rem 0.75rem;
      font-size: 0.76rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, #f59e0b 12%, var(--app-elevated));
      flex-shrink: 0;
    }
    .hub-deploy__link {
      margin-left: auto;
      padding: 0;
      border: none;
      background: transparent;
      font-weight: 700;
      color: #844fba;
      cursor: pointer;
      text-decoration: underline;
    }
    .hub-deploy__hero {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 0.85rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      flex-shrink: 0;
    }
    .hub-deploy__hero-main {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      min-width: 0;
    }
    .hub-deploy__provider {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 2.5rem;
      padding: 0.35rem 0.45rem;
      border-radius: 8px;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      background: var(--app-surface);
      color: var(--app-text-muted);
      flex-shrink: 0;
    }
    .hub-deploy__provider[data-provider='AWS'] {
      color: #c2410c;
      background: color-mix(in srgb, #ff9900 14%, var(--app-surface));
    }
    .hub-deploy__provider[data-provider='GCP'] {
      color: #1d4ed8;
      background: color-mix(in srgb, #4285f4 14%, var(--app-surface));
    }
    .hub-deploy__provider[data-provider='AZURE'] {
      color: #0369a1;
      background: color-mix(in srgb, #0078d4 14%, var(--app-surface));
    }
    .hub-deploy__eyebrow {
      display: block;
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--app-text-muted);
      margin-bottom: 0.12rem;
    }
    .hub-deploy__ws-name {
      display: block;
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.2;
    }
    .hub-deploy__proj-line {
      display: block;
      margin-top: 0.2rem;
      font-size: 0.7rem;
      color: var(--app-text-muted);
    }
    .hub-deploy__hero-side {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }
    .hub-deploy__ws-status {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: var(--app-surface);
      color: var(--app-text-muted);
    }
    .hub-deploy__ws-status[data-status='planned'] { color: #7c3aed; background: color-mix(in srgb, #844fba 14%, transparent); }
    .hub-deploy__ws-status[data-status='applied'] { color: #15803d; background: color-mix(in srgb, #22c55e 14%, transparent); }
    .hub-deploy__ws-status[data-status='applying'],
    .hub-deploy__ws-status[data-status='planning'] { color: #844fba; background: color-mix(in srgb, #844fba 14%, transparent); }
    .hub-deploy__ws-status[data-status='error'] { color: #b91c1c; background: color-mix(in srgb, #ef4444 14%, transparent); }
    .hub-deploy__busy {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.68rem;
      font-weight: 700;
      color: #844fba;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, #844fba 12%, transparent);
    }
    .hub-deploy__busy mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
      animation: hub-deploy-spin 1.2s linear infinite;
    }
    @keyframes hub-deploy-spin {
      to { transform: rotate(360deg); }
    }
    .hub-deploy__run {
      font-size: 0.62rem;
      color: var(--app-text-muted);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: var(--app-surface);
    }
    .hub-deploy__kpis {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      flex-shrink: 0;
    }
    .hub-deploy__kpi {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.55rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }
    .hub-deploy__kpi mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: #844fba;
    }
    .hub-deploy__kpi strong {
      color: var(--app-text);
      font-weight: 700;
    }
    .hub-deploy__kpi-mark {
      font-weight: 800;
      font-size: 0.75rem;
      width: 1rem;
      text-align: center;
    }
    .hub-deploy__kpi--add .hub-deploy__kpi-mark { color: #22c55e; }
    .hub-deploy__kpi--mod .hub-deploy__kpi-mark { color: #eab308; }
    .hub-deploy__kpi--del .hub-deploy__kpi-mark { color: #ef4444; }
    .hub-deploy__pipeline {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
      gap: 0.25rem;
      flex-shrink: 0;
    }
    .hub-deploy__pipe {
      width: 12px;
      align-self: center;
      height: 2px;
      background: color-mix(in srgb, var(--app-text-muted) 25%, transparent);
      flex-shrink: 0;
    }
    .hub-deploy__pipe--done {
      background: #844fba;
    }
    .hub-deploy__step {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.6rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      font: inherit;
      color: inherit;
      cursor: pointer;
      text-align: left;
      min-width: 0;
      transition: background 0.15s ease;
    }
    .hub-deploy__step:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .hub-deploy__step:not(:disabled):hover {
      background: color-mix(in srgb, #844fba 10%, var(--app-elevated));
    }
    .hub-deploy__step[data-status='active'] {
      background: color-mix(in srgb, #844fba 14%, var(--app-elevated));
      outline: 1px solid color-mix(in srgb, #844fba 35%, transparent);
    }
    .hub-deploy__step[data-status='done'] .hub-deploy__step-icon mat-icon {
      color: #22c55e;
    }
    .hub-deploy__step--danger .hub-deploy__step-icon mat-icon {
      color: #b91c1c;
    }
    .hub-deploy__step-icon mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #844fba;
    }
    .hub-deploy__step-body {
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
      min-width: 0;
    }
    .hub-deploy__step-body strong {
      font-size: 0.74rem;
      text-transform: capitalize;
    }
    .hub-deploy__step-body span {
      font-size: 0.6rem;
      color: var(--app-text-muted);
    }
    .hub-deploy__step-check {
      font-size: 1rem !important;
      width: 1rem !important;
      height: 1rem !important;
      color: #22c55e !important;
    }
    .hub-deploy__destroy-bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.55rem 0.75rem;
      font-size: 0.76rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, #dc2626 10%, var(--app-elevated));
      flex-shrink: 0;
    }
    .hub-deploy__destroy-bar input {
      flex: 1;
      min-width: 100px;
      padding: 0.35rem 0.5rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: var(--app-surface);
      font: inherit;
    }
    .hub-deploy__plan-strip {
      padding: 0.55rem 0.75rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, #844fba 6%, var(--app-elevated));
      flex-shrink: 0;
    }
    .hub-deploy__plan-strip header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.45rem;
    }
    .hub-deploy__plan-strip header mat-icon { color: #844fba; }
    .hub-deploy__plan-strip header strong {
      display: block;
      font-size: 0.74rem;
    }
    .hub-deploy__plan-strip header span {
      display: block;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .hub-deploy__plan-chips {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .hub-deploy__plan-chips li {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.45rem;
      border-radius: 6px;
      background: var(--app-surface);
      font-size: 0.65rem;
    }
    .hub-deploy__plan-chips li[data-change='create'] .hub-deploy__plan-op { color: #22c55e; }
    .hub-deploy__plan-chips li[data-change='update'] .hub-deploy__plan-op { color: #eab308; }
    .hub-deploy__plan-chips li[data-change='delete'] .hub-deploy__plan-op { color: #ef4444; }
    .hub-deploy__plan-op {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.58rem;
    }
    .hub-deploy__workspace {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      gap: 0.5rem;
      overflow: hidden;
    }
    @media (min-width: 1100px) {
      .hub-deploy__workspace--with-plan {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(300px, 1fr);
        min-height: 0;
      }
    }
    @media (min-width: 1440px) {
      .hub-deploy__workspace--with-plan {
        grid-template-columns: minmax(0, 1.35fr) minmax(340px, 1fr);
      }
    }
    .hub-deploy__editor-zone,
    .hub-deploy__plan-zone {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
    }
    .hub-deploy__zone-head {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 0.65rem;
      flex-shrink: 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
    }
    .hub-deploy__zone-head mat-icon {
      color: #844fba;
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .hub-deploy__zone-head strong {
      display: block;
      font-size: 0.72rem;
    }
    .hub-deploy__zone-head span {
      display: block;
      font-size: 0.6rem;
      color: var(--app-text-muted);
    }
    .hub-deploy__zone-head div {
      flex: 1;
      min-width: 0;
    }
    .hub-deploy__dirty {
      font-size: 0.58rem;
      font-weight: 600;
      color: var(--app-text-muted);
      text-transform: uppercase;
    }
    .hub-deploy__editor {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .hub-deploy__editor app-terraform-editor {
      display: block;
      height: 100%;
      min-height: 0;
    }
    .hub-deploy__plan-view {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 0.35rem 0.5rem;
      overscroll-behavior: contain;
    }
    .hub-deploy__resize {
      height: 6px;
      cursor: row-resize;
      background: color-mix(in srgb, var(--app-text-muted) 10%, transparent);
      border-radius: 3px;
      flex-shrink: 0;
    }
    .hub-deploy__terminal {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: #0d1117;
      color: #c9d1d9;
      overflow: hidden;
      border-radius: var(--app-radius-md);
    }
    .hub-deploy__terminal header {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.65rem;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #8b949e;
      background: #161b22;
      flex-shrink: 0;
    }
    .hub-deploy__term-dots {
      display: inline-flex;
      gap: 4px;
    }
    .hub-deploy__term-dots i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #484f58;
      display: block;
    }
    .hub-deploy__term-dots i:nth-child(1) { background: #ff5f57; }
    .hub-deploy__term-dots i:nth-child(2) { background: #febc2e; }
    .hub-deploy__term-dots i:nth-child(3) { background: #28c840; }
    .hub-deploy__term-meta {
      margin-left: auto;
      margin-right: 0.35rem;
      font-size: 0.6rem;
      color: #6e7681;
      text-transform: none;
    }
    .hub-deploy__terminal header button {
      color: #8b949e;
      min-height: 28px;
      font-size: 0.62rem;
    }
    .hub-deploy__term-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 0.55rem 0.7rem;
      font-family: var(--app-font-mono, monospace);
      font-size: 12px;
      line-height: 1.6;
      scrollbar-width: thin;
    }
    .hub-deploy__term-empty {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      color: #6e7681;
      font-size: 0.72rem;
      line-height: 1.45;
    }
    .hub-deploy__term-empty mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #484f58;
    }
    .hub-deploy__term-empty p { margin: 0; }
    .hub-deploy__term-empty strong { color: #8b949e; }
    .tf-line--add { color: #3fb950; }
    .tf-line--del { color: #f85149; }
    .tf-line--mod { color: #d29922; }
    .tf-line--info { color: #8b949e; }
    .hub-project__head {
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .hub-project__head h3 { margin: 0 0 0.35rem; font-size: 1.1rem; }
    .hub-project__head p { margin: 0; font-size: 0.82rem; color: var(--app-text-muted); line-height: 1.45; }
    .hub-project__status {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      background: var(--app-elevated);
      height: fit-content;
    }
    .hub-feature--flat .hub-project__status {
      background: transparent;
      border: none;
      color: #111;
      padding: 0;
    }
    .hub-project__status[data-status='healthy'] { color: #15803d; background: color-mix(in srgb, #22c55e 14%, transparent); }
    .hub-project__status[data-status='drift'] { color: #b45309; background: color-mix(in srgb, #f59e0b 14%, transparent); }
    .hub-project__status[data-status='syncing'] { color: #844fba; background: color-mix(in srgb, #844fba 14%, transparent); }
    .hub-project__meta {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.5rem;
      margin-bottom: 0.85rem;
    }
    .hub-project__meta div {
      padding: 0.55rem 0;
      border: none;
      border-radius: 0;
      background: transparent;
    }
    .hub-feature--flat .hub-project__meta div {
      background: transparent;
      border: none;
    }
    .hub-project__meta span { display: block; font-size: 0.62rem; text-transform: uppercase; }
    .hub-project__meta strong { display: block; font-size: 0.8rem; margin-top: 0.15rem; }
    .hub-project__tags { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1rem; }
    .hub-tag {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.12rem 0.45rem;
      border-radius: 4px;
      background: color-mix(in srgb, #844fba 10%, var(--app-elevated));
      color: #844fba;
    }
    .hub-feature--flat .hub-tag {
      background: transparent;
      border: none;
      color: #111;
      padding: 0.12rem 0;
    }
    .hub-project h4 {
      margin: 0 0 0.5rem;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .hub-feature--flat .hub-project h4 {
      color: #111;
    }
    .hub-env-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .hub-env-card {
      padding: 0.65rem 0.75rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      border: none;
      font: inherit;
      color: inherit;
      text-align: left;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s ease;
    }
    .hub-feature--flat .hub-env-card {
      padding: 0.65rem 0;
      background: transparent;
      border-radius: 0;
    }
    .hub-env-card:hover,
    .hub-env-card:focus-visible {
      background: color-mix(in srgb, #844fba 12%, var(--app-elevated));
      outline: none;
    }
    .hub-feature--flat .hub-env-card:hover,
    .hub-feature--flat .hub-env-card:focus-visible {
      background: color-mix(in srgb, #111 5%, transparent);
    }
    .hub-env-card__lbl { font-size: 0.72rem; font-weight: 700; text-transform: capitalize; }
    .hub-env-card__ws { font-size: 0.65rem; color: var(--app-text-muted); }
    .hub-project__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .hub-auto, .hub-history, .hub-modules, .hub-project {
      padding: 0.65rem 0.15rem 0.35rem;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .hub-feature--flat {
      background: transparent;
      border: none;
      outline: none;
      box-shadow: none;
      color: #111;
    }
    .hub-feature--flat h3,
    .hub-feature--flat h4,
    .hub-feature--flat strong {
      color: #111;
    }
    .hub-feature--flat p,
    .hub-feature--flat span,
    .hub-feature--flat li,
    .hub-feature--flat td,
    .hub-feature--flat th,
    .hub-feature--flat label {
      color: #111;
    }
    .hub-feature--flat .hub-auto__head p,
    .hub-feature--flat .hub-history__head p,
    .hub-feature--flat .hub-modules p,
    .hub-feature--flat .hub-project__head p,
    .hub-feature--flat .hub-auto-card__meta,
    .hub-feature--flat .hub-auto-card__next,
    .hub-feature--flat .hub-history__body span,
    .hub-feature--flat .hub-history__meta,
    .hub-feature--flat .hub-project__meta span,
    .hub-feature--flat .hub-env-card__ws {
      color: #333;
    }
    .hub-project {
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    .hub-auto__head, .hub-history__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.75rem;
      flex-shrink: 0;
    }
    .hub-modules > header {
      flex-shrink: 0;
      margin-bottom: 0.75rem;
    }
    .hub-auto__list {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      padding-right: 0.15rem;
    }
    .hub-history__feed {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      padding-right: 0.15rem;
    }
    .hub-modules__body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      padding-right: 0.15rem;
    }
    .hub-auto__head h3, .hub-history__head h3, .hub-modules h3 { margin: 0 0 0.25rem; font-size: 1rem; }
    .hub-auto__head p, .hub-history__head p, .hub-modules p { margin: 0; font-size: 0.78rem; }
    .hub-auto-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border: none;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
    }
    .hub-auto-card--off { opacity: 0.65; }
    .hub-auto-card__main {
      display: flex;
      gap: 0.55rem;
      align-items: flex-start;
      min-width: 0;
    }
    .hub-feature--flat .hub-auto-card__main mat-icon { color: #111; flex-shrink: 0; }
    .hub-auto-card__main mat-icon { color: #844fba; flex-shrink: 0; }
    .hub-auto-card__main strong { display: block; font-size: 0.82rem; }
    .hub-auto-card__main span { display: block; font-size: 0.72rem; }
    .hub-auto-card__meta { font-size: 0.65rem !important; }
    .hub-auto-card__side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
      flex-shrink: 0;
    }
    .hub-auto-card__next { font-size: 0.62rem; color: var(--app-text-muted); }
    .hub-history__feed {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .hub-history__item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.65rem 0;
      border: none;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      font: inherit;
      text-align: left;
      color: inherit;
      cursor: pointer;
    }
    .hub-feature--flat .hub-history__item:hover {
      background: color-mix(in srgb, #111 4%, transparent);
    }
    .hub-history__item:hover { background: color-mix(in srgb, #844fba 8%, var(--app-elevated)); }
    .hub-history__body { flex: 1; min-width: 0; }
    .hub-history__body strong { display: block; font-size: 0.82rem; }
    .hub-history__body span { display: block; font-size: 0.72rem; color: var(--app-text-muted); }
    .hub-history__meta { font-size: 0.65rem !important; }
    .hub-modules__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
      margin-bottom: 0.75rem;
    }
    .hub-modules__table th {
      text-align: left;
      font-size: 0.62rem;
      text-transform: uppercase;
      padding: 0.4rem 0.5rem;
      border: none;
      background: transparent;
    }
    .hub-feature--flat .hub-modules__table {
      border: none;
    }
    .hub-feature--flat .hub-modules__table th,
    .hub-feature--flat .hub-modules__table td {
      border: none;
      background: transparent;
      color: #111;
    }
    .hub-modules__table td { padding: 0.45rem 0.5rem; }
    .hub-modules__plan {
      margin-top: 0.5rem;
      min-height: 200px;
    }
    .mono { font-family: var(--app-font-mono, monospace); }
  `,
})
export class TerraformWorkspaceHubComponent {
  private readonly connections = inject(IntegrationConnectionService)

  @Input() activeTab: TerraformHubTabId = 'deploy'
  @Input() activeProject: TerraformProject | null = null
  @Input() automations: TerraformAutomation[] = []
  @Input() deployments: TerraformDeploymentRecord[] = []
  @Input() workspaceName = ''
  @Input() workspaceProvider: CloudProvider = 'AWS'
  @Input() workspaceStatus: TerraformWorkspaceItem['status'] = 'idle'
  @Input() editorHcl = ''
  @Input() terminalLines: string[] = []
  @Input() terminalHeight = 200
  @Input() busy = false
  @Input() hasPlan = false
  @Input() actionsDisabled = false
  @Input() providerConnected = true
  @Input() showDestroyConfirm = false
  @Input() destroyConfirm = ''
  @Input() planOutput = ''
  @Input() activeRunId = ''
  @Input() planResources: { type: string; name: string; change: string }[] = []
  @Input() lineClassFn: (line: string) => string = () => 'tf-line--info'
  @Input() launchDetails: TerraformLaunchDetail[] = []
  @Input() selectedLaunchId: string | null = null
  @Input() selectedLaunch: TerraformLaunchDetail | null = null

  readonly tabChange = output<TerraformHubTabId>()
  readonly launchSelect = output<string>()
  readonly openLaunch = output<void>()
  readonly runInit = output<void>()
  readonly runPlan = output<void>()
  readonly runApply = output<void>()
  readonly toggleDestroy = output<void>()
  readonly runDestroy = output<void>()
  readonly editorChange = output<string>()
  readonly resizeTerminal = output<MouseEvent>()
  readonly clearTerminal = output<void>()
  readonly destroyConfirmChange = output<string>()
  readonly saveProject = output<void>()
  readonly environmentSelect = output<string>()
  readonly createAutomation = output<void>()
  readonly toggleAutomation = output<string>()
  readonly deploymentSelect = output<TerraformDeploymentRecord>()

  readonly tabs = TERRAFORM_HUB_TABS
  readonly projectStatusLabel = projectStatusLabel
  readonly triggerLabel = triggerLabel
  readonly stateBackendLabel = stateBackendLabel
  readonly complianceTierLabel = complianceTierLabel

  handleConnectCloud = (): void => {
    this.connections.openCloudProvider(this.workspaceProvider).subscribe()
  }

  lineClass = (line: string): string => this.lineClassFn(line)

  planChangeLabel = (change: string): string => {
    if (change === 'create') return 'crear'
    if (change === 'update') return 'modificar'
    if (change === 'delete') return 'destruir'
    return change
  }

  workspaceStatusLabel = (status: TerraformWorkspaceItem['status']): string => {
    const map: Record<TerraformWorkspaceItem['status'], string> = {
      idle: 'Inactivo',
      planning: 'Planificando',
      planned: 'Plan listo',
      applying: 'Aplicando',
      applied: 'Aplicado',
      error: 'Error',
    }
    return map[status] ?? status
  }

  deployPipeline = (): {
    id: string
    label: string
    hint: string
    icon: string
    status: 'pending' | 'active' | 'done'
    disabled: boolean
  }[] => {
    const busy = this.busy
    const hasPlan = this.hasPlan
    const ws = this.workspaceStatus
    const hasOutput = this.terminalLines.length > 0

    const initDone = hasOutput || ws !== 'idle'
    const planDone = hasPlan || ws === 'planned' || ws === 'applying' || ws === 'applied'
    const applyDone = ws === 'applied'

    const initStatus = busy && !initDone ? 'active' : initDone ? 'done' : 'pending'
    const planStatus = busy && initDone && !planDone ? 'active' : planDone ? 'done' : 'pending'
    const applyStatus =
      busy && planDone && !applyDone ? 'active' : applyDone ? 'done' : 'pending'

    return [
      {
        id: 'init',
        label: 'init',
        hint: 'Providers y backend',
        icon: 'download',
        status: initStatus,
        disabled: this.actionsDisabled,
      },
      {
        id: 'plan',
        label: 'plan',
        hint: 'Diff de recursos',
        icon: 'difference',
        status: planStatus,
        disabled: this.actionsDisabled,
      },
      {
        id: 'apply',
        label: 'apply',
        hint: 'Aplicar cambios',
        icon: 'play_circle',
        status: applyStatus,
        disabled: this.actionsDisabled || !hasPlan,
      },
    ]
  }

  handleDeployStep = (id: string): void => {
    if (id === 'init') this.runInit.emit()
    if (id === 'plan') this.runPlan.emit()
    if (id === 'apply') this.runApply.emit()
  }

  autoIcon = (trigger: string): string => {
    if (trigger === 'cron') return 'schedule'
    if (trigger === 'webhook') return 'webhook'
    if (trigger === 'git-push') return 'commit'
    return 'touch_app'
  }
}
