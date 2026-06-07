import { DatePipe } from '@angular/common'
import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { TerraformPlanViewerComponent } from '../features/terraform/components/terraform-plan-viewer.component'
import { projectStatusLabel, triggerLabel, type TerraformAutomation, type TerraformProject } from './terraform-projects'
import { complianceTierLabel, stateBackendLabel } from './terraform-create-project.meta'

@Component({
  selector: 'app-terraform-inspector-panel',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, TerraformPlanViewerComponent],
  template: `
    <aside class="insp" aria-label="Inspector de proyecto y plan">
      <div class="insp__scroll">
        @if (activeProject) {
          <div class="insp__project">
            <header>
              <mat-icon>folder_special</mat-icon>
              <div>
                <h4>{{ activeProject.name }}</h4>
                <span [attr.data-status]="activeProject.status">{{ projectStatusLabel(activeProject.status) }}</span>
              </div>
            </header>
            <p class="insp__desc">{{ activeProject.description }}</p>
            <div class="insp__stats">
              <div><strong>{{ activeProject.environments.length }}</strong><span>entornos</span></div>
              <div><strong>{{ activeProject.automationsCount }}</strong><span>auto</span></div>
              <div><strong>{{ activeProject.deploymentsCount }}</strong><span>deploys</span></div>
            </div>
            <dl class="insp__facts">
              <div><dt>State</dt><dd>{{ stateBackendLabel(activeProject.stateBackend) }}</dd></div>
              <div><dt>Cumplimiento</dt><dd>{{ complianceTierLabel(activeProject.complianceTier) }}</dd></div>
            </dl>
            <button mat-stroked-button type="button" class="insp__save" (click)="saveProject.emit()">
              <mat-icon>save</mat-icon> Guardar estado
            </button>
          </div>
        }

        <app-terraform-plan-viewer
          class="insp__plan"
          [planOutput]="planOutput"
          [runId]="runId"
          [resources]="planResources"
        />

        @if (projectAutomations.length) {
          <section class="insp__auto insp__auto--flat">
            <header>
              <h4>Automatizaciones</h4>
              <button type="button" class="insp__link" (click)="viewAutomate.emit()">Ver todas</button>
            </header>
            @for (a of projectAutomations.slice(0, 3); track a.id) {
              <div class="insp__auto-row">
                <mat-icon>{{ a.trigger === 'cron' ? 'schedule' : 'bolt' }}</mat-icon>
                <div>
                  <strong>{{ a.name }}</strong>
                  <span>{{ triggerLabel(a.trigger) }} · {{ a.environment }}</span>
                </div>
                <span class="insp__auto-st" [class.insp__auto-st--off]="!a.enabled">{{ a.enabled ? 'ON' : 'OFF' }}</span>
              </div>
            }
          </section>
        }

        <div class="insp__state">
          <header>
            <mat-icon>storage</mat-icon>
            <h4>State remoto</h4>
          </header>
          <pre class="mono">{{ statePreview }}</pre>
        </div>
      </div>

      <div class="insp__hint">
        <mat-icon>route</mat-icon>
        <p><strong>Pipeline:</strong> guardar → plan → revisar → apply · automatizar con cron o webhook.</p>
      </div>
    </aside>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .insp {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
    .insp__scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      padding: 0.65rem 0.75rem;
    }
    .insp__project {
      margin-bottom: 0.85rem;
      padding-bottom: 0.75rem;
    }
    .insp__project header {
      display: flex;
      gap: 0.45rem;
      align-items: flex-start;
      margin-bottom: 0.35rem;
    }
    .insp__project header mat-icon { color: #844fba; }
    .insp__project h4 { margin: 0; font-size: 0.88rem; }
    .insp__project header span {
      display: block;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .insp__project header span[data-status='healthy'] { color: #15803d; }
    .insp__project header span[data-status='drift'] { color: #b45309; }
    .insp__desc {
      margin: 0 0 0.5rem;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      line-height: 1.4;
    }
    .insp__facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem 0.5rem;
      margin: 0 0 0.5rem;
      font-size: 0.68rem;
    }
    .insp__facts dt {
      margin: 0;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .insp__facts dd {
      margin: 0;
      font-weight: 600;
      text-align: right;
    }
    .insp__stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.35rem;
      margin-bottom: 0.5rem;
    }
    .insp__stats div {
      text-align: center;
      padding: 0.4rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
    }
    .insp__stats strong { display: block; font-size: 0.95rem; }
    .insp__stats span { font-size: 0.58rem; color: var(--app-text-muted); text-transform: uppercase; }
    .insp__save { width: 100%; font-size: 0.72rem; }
    .insp__plan { display: block; margin-bottom: 0.75rem; }
    .insp__auto { margin-bottom: 0.75rem; }
    .insp__auto--flat {
      border: none;
      background: transparent;
      box-shadow: none;
      padding: 0;
      margin-bottom: 0.65rem;
    }
    .insp__auto--flat h4,
    .insp__auto--flat strong,
    .insp__auto--flat span {
      color: #111;
    }
    .insp__auto--flat .insp__link {
      color: #111;
    }
    .insp__auto--flat .insp__auto-row mat-icon {
      color: #111;
    }
    .insp__auto--flat .insp__auto-st {
      color: #111;
    }
    .insp__auto--flat .insp__auto-st--off {
      color: #333;
    }
    .insp__auto header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }
    .insp__auto h4 {
      margin: 0;
      font-size: 0.68rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .insp__link {
      border: none;
      background: none;
      font: inherit;
      font-size: 0.65rem;
      font-weight: 700;
      color: #844fba;
      cursor: pointer;
      text-decoration: underline;
    }
    .insp__auto-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0;
      font-size: 0.72rem;
    }
    .insp__auto-row mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #844fba; }
    .insp__auto-row strong { display: block; font-size: 0.74rem; }
    .insp__auto-row span { display: block; font-size: 0.62rem; color: var(--app-text-muted); }
    .insp__auto-st {
      font-size: 0.58rem;
      font-weight: 800;
      color: #15803d;
    }
    .insp__auto-st--off { color: var(--app-text-muted); }
    .insp__state header {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.35rem;
    }
    .insp__state h4 { margin: 0; font-size: 0.72rem; }
    .insp__state pre {
      margin: 0;
      padding: 0.5rem;
      border-radius: var(--app-radius-md);
      background: #0d1117;
      color: #c9d1d9;
      font-size: 10px;
      line-height: 1.45;
      overflow-x: auto;
      max-height: 120px;
    }
    .insp__hint {
      display: flex;
      gap: 0.4rem;
      padding: 0.55rem 0.75rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      flex-shrink: 0;
    }
    .insp__hint mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #844fba; flex-shrink: 0; }
    .insp__hint p { margin: 0; line-height: 1.35; }
    .mono { font-family: var(--app-font-mono, monospace); }
  `,
})
export class TerraformInspectorPanelComponent {
  @Input() activeProject: TerraformProject | null = null
  @Input() automations: TerraformAutomation[] = []
  @Input() planOutput = ''
  @Input() runId = ''
  @Input() planResources: { type: string; name: string; change: string }[] = []
  @Input() statePreview = ''

  readonly saveProject = output<void>()
  readonly viewAutomate = output<void>()

  readonly projectStatusLabel = projectStatusLabel
  readonly triggerLabel = triggerLabel
  readonly stateBackendLabel = stateBackendLabel
  readonly complianceTierLabel = complianceTierLabel

  get projectAutomations(): TerraformAutomation[] {
    if (!this.activeProject) return []
    return this.automations.filter((a) => a.projectId === this.activeProject!.id)
  }
}
