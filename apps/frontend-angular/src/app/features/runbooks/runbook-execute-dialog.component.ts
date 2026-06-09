import { Component, inject, computed, effect } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import type { CloudAccount } from '../../core/models/api.models'
import {
  RUNBOOK_CATEGORY_LABELS,
  RUNBOOK_TRIGGER_LABELS,
  type Runbook,
  type RunbookCategory,
} from './runbooks.types'
import {
  formatRunbookTargetLabel,
  matchInstancesForRunbook,
  type RunbookTargetInstance,
} from './runbook-target.util'
import { RunbookTargetPickerComponent } from './runbook-target-picker.component'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { providerBrandLogo } from './runbook-target.util'

export interface RunbookExecuteDialogData {
  runbooks: Runbook[]
  instances: RunbookTargetInstance[]
  accounts: CloudAccount[]
  preselectedId?: string
  preselectedInstanceId?: string
}

export interface RunbookExecuteDialogResult {
  runbookId: string
  instanceId: string
  target: string
  provider: string
  accountName?: string
  dryRun: boolean
  notifyOnComplete: boolean
  note?: string
}

const CATEGORY_META: Record<RunbookCategory, { icon: string; color: string }> = {
  infra: { icon: 'dns', color: '#38bdf8' },
  app: { icon: 'web', color: '#844fba' },
  db: { icon: 'storage', color: '#f59e0b' },
  security: { icon: 'shield', color: '#ef4444' },
  k8s: { icon: 'hub', color: '#22c55e' },
}

const STEP_TYPE_ICON: Record<string, string> = {
  command: 'terminal',
  check: 'fact_check',
  approval: 'verified_user',
  notify: 'campaign',
}

const resolveDefaultInstanceId = (
  data: RunbookExecuteDialogData,
): string => {
  if (data.preselectedInstanceId) return data.preselectedInstanceId
  const preselectedRb = data.runbooks.find((r) => r.id === data.preselectedId)
  if (preselectedRb?.linkedTo) {
    const rec = matchInstancesForRunbook(data.instances, preselectedRb.linkedTo)
    if (rec[0]) return rec[0].id
  }
  return data.instances[0]?.id ?? ''
}

@Component({
  selector: 'app-runbook-execute-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    RunbookTargetPickerComponent,
    BrandLogoComponent,
  ],
  template: `
    <div class="rb-exec" [formGroup]="form">
      <header class="rb-exec__header">
        <span class="rb-exec__glyph" aria-hidden="true">
          <mat-icon>play_circle</mat-icon>
        </span>
        <div>
          <h2 mat-dialog-title>Ejecutar runbook</h2>
          <p>Selecciona el procedimiento, revisa los pasos y elige la instancia cloud o VPS donde se ejecutará.</p>
        </div>
      </header>

      <div class="rb-exec__shell">
        <aside class="rb-exec__picker" aria-label="Seleccionar runbook">
            <label class="rb-exec__search">
              <mat-icon>search</mat-icon>
              <input
                type="search"
                [formControl]="searchControl"
                placeholder="Buscar runbook…"
                aria-label="Buscar runbook"
              />
            </label>
            <ul class="rb-exec__list" role="listbox" aria-label="Runbooks disponibles">
              @for (rb of filteredRunbooks(); track rb.id) {
                <li>
                  <button
                    type="button"
                    role="option"
                    class="rb-exec__item"
                    [class.rb-exec__item--on]="selectedId() === rb.id"
                    [attr.aria-selected]="selectedId() === rb.id"
                    (click)="selectRunbook(rb.id)"
                  >
                    <span class="rb-exec__item-icon" [style.color]="categoryMeta[rb.category].color">
                      <mat-icon>{{ categoryMeta[rb.category].icon }}</mat-icon>
                    </span>
                    <span class="rb-exec__item-body">
                      <strong>{{ rb.name }}</strong>
                      <span>{{ categoryLabels[rb.category] }} · {{ rb.steps.length }} pasos</span>
                    </span>
                    <span class="rb-exec__item-rate">{{ rb.successRate }}%</span>
                  </button>
                </li>
              } @empty {
                <li class="rb-exec__empty">Sin coincidencias</li>
              }
            </ul>
        </aside>

        <mat-dialog-content class="rb-exec__body">
          <main class="rb-exec__main">
            @if (selected(); as rb) {
              <section class="rb-exec__summary">
                <div class="rb-exec__summary-head">
                  <h3>{{ rb.name }}</h3>
                  @if (rb.requiresApproval) {
                    <span class="rb-exec__warn">
                      <mat-icon>verified_user</mat-icon>
                      Requiere aprobación
                    </span>
                  }
                </div>
                <p>{{ rb.description }}</p>
                <dl class="rb-exec__stats">
                  <div>
                    <dt>Duración est.</dt>
                    <dd>{{ rb.avgDuration }}</dd>
                  </div>
                  <div>
                    <dt>Éxito histórico</dt>
                    <dd>{{ rb.successRate }}%</dd>
                  </div>
                  <div>
                    <dt>Última ejecución</dt>
                    <dd>{{ rb.lastRunLabel }}</dd>
                  </div>
                  <div>
                    <dt>Disparador</dt>
                    <dd>{{ triggerLabels[rb.trigger] }}</dd>
                  </div>
                  <div>
                    <dt>Propietario</dt>
                    <dd>{{ rb.owner }}</dd>
                  </div>
                  <div>
                    <dt>Vinculado por defecto</dt>
                    <dd class="mono">{{ rb.linkedTo }}</dd>
                  </div>
                </dl>
                <div class="rb-exec__tags">
                  @for (tag of rb.tags; track tag) {
                    <span>{{ tag }}</span>
                  }
                </div>
              </section>

              <section class="rb-exec__steps" aria-label="Pasos a ejecutar">
                <h4>Pasos del procedimiento ({{ rb.steps.length }})</h4>
                <ol class="rb-exec__timeline">
                  @for (step of rb.steps; track step.order) {
                    <li>
                      <span class="rb-exec__step-icon" [attr.data-type]="step.type">
                        <mat-icon>{{ stepTypeIcon(step.type) }}</mat-icon>
                      </span>
                      <div class="rb-exec__step-body">
                        <strong>{{ step.title }}</strong>
                        @if (step.command) {
                          <code class="mono">{{ step.command }}</code>
                        }
                      </div>
                    </li>
                  }
                </ol>
              </section>

              <section class="rb-exec__config">
                <app-runbook-target-picker
                  [instanceControl]="form.controls.instanceId"
                  [instances]="data.instances"
                  [accounts]="data.accounts"
                  [linkedToHint]="rb.linkedTo"
                />
                <mat-form-field appearance="outline" class="rb-exec__field">
                  <mat-label>Nota de ejecución (opcional)</mat-label>
                  <textarea matInput formControlName="note" rows="2" placeholder="Ticket INC-1234, ventana de mantenimiento…"></textarea>
                </mat-form-field>
                <div class="rb-exec__toggles">
                  <mat-slide-toggle formControlName="dryRun" color="primary">
                    Simulación (dry-run) — no aplica cambios
                  </mat-slide-toggle>
                  <mat-slide-toggle formControlName="notifyOnComplete">
                    Notificar al finalizar (#ops-demo)
                  </mat-slide-toggle>
                </div>
              </section>
            } @else {
              <p class="rb-exec__no-select">Selecciona un runbook de la lista.</p>
            }
          </main>
        </mat-dialog-content>
      </div>

      <mat-dialog-actions class="rb-exec__footer" align="end">
        <div class="rb-exec__footer-meta">
          @if (selected(); as rb) {
            <span>
              <mat-icon>schedule</mat-icon>
              {{ form.controls.dryRun.value ? 'Simulación' : rb.avgDuration }} · {{ rb.steps.length }} pasos
            </span>
            @if (selectedInstance(); as inst) {
              <span class="rb-exec__footer-target">
                @if (instanceBrandLogo(inst.provider); as logo) {
                  <app-brand-logo [logo]="logo" size="sm" />
                } @else {
                  <mat-icon>dns</mat-icon>
                }
                {{ inst.name }} · {{ inst.provider }}
              </span>
            }
          }
        </div>
        <div class="rb-exec__footer-actions">
          <button mat-button type="button" mat-dialog-close>Cancelar</button>
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="form.invalid || !selected() || (data.instances.length > 0 && !selectedInstance())"
            (click)="confirm()"
          >
            <mat-icon>{{ form.controls.dryRun.value ? 'science' : 'play_arrow' }}</mat-icon>
            {{ form.controls.dryRun.value ? 'Simular' : 'Ejecutar ahora' }}
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .rb-exec {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-height: min(96vh, 920px);
      min-height: min(88vh, 700px);
      color: #111;
    }
    .rb-exec__header {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      flex-shrink: 0;
      padding: 1rem 1.15rem 0.75rem;
      border-bottom: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, #22c55e 6%, #fff) 0%,
        #fff 100%
      );
    }
    .rb-exec__header h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
    }
    .rb-exec__header p {
      margin: 0.2rem 0 0;
      font-size: 0.78rem;
      color: #64748b;
      max-width: 28rem;
    }
    .rb-exec__glyph {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 12px;
      background: color-mix(in srgb, #22c55e 16%, transparent);
      color: #15803d;
    }
    .rb-exec__shell {
      display: grid;
      grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .rb-exec__body {
      flex: 1;
      min-height: 0;
      margin: 0 !important;
      padding: 1rem 1.15rem 1rem 0.85rem !important;
      overflow-y: auto;
      max-height: none !important;
      scrollbar-width: thin;
    }
    .rb-exec__picker {
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 0.85rem 0.65rem 0.85rem 0.85rem;
      border-right: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: color-mix(in srgb, #111 2%, #fff);
    }
    .rb-exec__search {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.55rem;
      margin-bottom: 0.5rem;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      background: var(--app-elevated, #fff);
      flex-shrink: 0;
    }
    .rb-exec__search mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #64748b;
    }
    .rb-exec__search input {
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.78rem;
      width: 100%;
      min-width: 0;
      color: #111;
    }
    .rb-exec__search input:focus {
      outline: none;
    }
    .rb-exec__list {
      list-style: none;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      flex: 1;
      scrollbar-width: thin;
    }
    .rb-exec__item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.4rem;
      align-items: center;
      width: 100%;
      padding: 0.5rem 0.45rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      text-align: left;
      font: inherit;
      color: #111;
      cursor: pointer;
    }
    .rb-exec__item:hover {
      background: color-mix(in srgb, #111 4%, transparent);
    }
    .rb-exec__item--on {
      background: color-mix(in srgb, #844fba 10%, transparent);
      box-shadow: inset 3px 0 0 #844fba;
    }
    .rb-exec__item-icon mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .rb-exec__item-body {
      min-width: 0;
    }
    .rb-exec__item-body strong {
      display: block;
      font-size: 0.76rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rb-exec__item-body span {
      display: block;
      font-size: 0.62rem;
      color: #64748b;
    }
    .rb-exec__item-rate {
      font-size: 0.65rem;
      font-weight: 800;
      color: #15803d;
    }
    .rb-exec__empty {
      padding: 0.75rem;
      font-size: 0.75rem;
      color: #64748b;
    }
    .rb-exec__main {
      min-height: min-content;
      padding-right: 0.15rem;
    }
    .rb-exec__summary {
      margin-bottom: 0.85rem;
    }
    .rb-exec__summary-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .rb-exec__summary h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }
    .rb-exec__summary > p {
      margin: 0.35rem 0 0.65rem;
      font-size: 0.78rem;
      line-height: 1.5;
      color: #333;
    }
    .rb-exec__warn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.65rem;
      font-weight: 700;
      color: #b45309;
      padding: 0.2rem 0.45rem;
      border-radius: 6px;
      background: color-mix(in srgb, #f59e0b 14%, transparent);
    }
    .rb-exec__warn mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .rb-exec__stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.45rem 0.65rem;
      margin: 0 0 0.55rem;
      font-size: 0.7rem;
    }
    .rb-exec__stats dt {
      color: #64748b;
      font-weight: 600;
    }
    .rb-exec__stats dd {
      margin: 0;
      font-weight: 650;
      color: #111;
    }
    .rb-exec__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }
    .rb-exec__tags span {
      font-size: 0.62rem;
      padding: 0.12rem 0.4rem;
      border-radius: 6px;
      background: color-mix(in srgb, #111 5%, transparent);
      color: #333;
    }
    .rb-exec__steps h4,
    .rb-exec__config h4 {
      margin: 0 0 0.45rem;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .rb-exec__steps {
      margin-bottom: 0.85rem;
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      background: color-mix(in srgb, #111 3%, transparent);
      border: 1px solid color-mix(in srgb, #111 7%, transparent);
      max-height: none;
    }
    .rb-exec__timeline {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .rb-exec__timeline li {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid color-mix(in srgb, #111 5%, transparent);
    }
    .rb-exec__timeline li:last-child {
      border-bottom: none;
    }
    .rb-exec__step-icon {
      display: grid;
      place-items: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 8px;
      background: color-mix(in srgb, #844fba 12%, transparent);
      color: #844fba;
    }
    .rb-exec__step-icon[data-type='check'] {
      background: color-mix(in srgb, #38bdf8 14%, transparent);
      color: #0284c7;
    }
    .rb-exec__step-icon[data-type='approval'] {
      background: color-mix(in srgb, #f59e0b 14%, transparent);
      color: #b45309;
    }
    .rb-exec__step-icon[data-type='notify'] {
      background: color-mix(in srgb, #22c55e 14%, transparent);
      color: #15803d;
    }
    .rb-exec__step-icon mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .rb-exec__step-body strong {
      display: block;
      font-size: 0.76rem;
    }
    .rb-exec__step-body code {
      display: block;
      margin-top: 0.15rem;
      font-size: 0.65rem;
      color: #64748b;
      word-break: break-all;
    }
    .rb-exec__config {
      padding-top: 0.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .rb-exec__field {
      width: 100%;
    }
    .rb-exec__footer-target {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-left: 0.5rem;
      font-size: 0.68rem;
      color: #844fba;
      font-weight: 700;
    }
    .rb-exec__footer-target mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .rb-exec__toggles {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      margin-top: 0.35rem;
    }
    .rb-exec__no-select {
      padding: 2rem 1rem;
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
    }
    .rb-exec__footer {
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      flex-shrink: 0;
      padding: 0.65rem 1.15rem !important;
      border-top: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: #fff;
    }
    .rb-exec__footer-meta span {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.72rem;
      color: #64748b;
      font-weight: 600;
    }
    .rb-exec__footer-meta mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .rb-exec__footer-actions {
      display: flex;
      gap: 0.35rem;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
    @media (max-width: 800px) {
      .rb-exec__shell {
        grid-template-columns: 1fr;
      }
      .rb-exec__picker {
        border-right: none;
        border-bottom: 1px solid color-mix(in srgb, #111 8%, transparent);
        max-height: 200px;
      }
      .rb-exec__stats {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class RunbookExecuteDialogComponent {
  readonly data = inject<RunbookExecuteDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<RunbookExecuteDialogComponent, RunbookExecuteDialogResult>)
  private readonly fb = inject(FormBuilder)

  readonly categoryLabels = RUNBOOK_CATEGORY_LABELS
  readonly triggerLabels = RUNBOOK_TRIGGER_LABELS
  readonly categoryMeta = CATEGORY_META

  readonly searchControl = this.fb.nonNullable.control('')

  readonly form = this.fb.nonNullable.group({
    runbookId: [this.data.preselectedId ?? this.data.runbooks[0]?.id ?? '', Validators.required],
    instanceId: [
      resolveDefaultInstanceId(this.data),
      this.data.instances.length ? Validators.required : [],
    ],
    dryRun: [false],
    notifyOnComplete: [true],
    note: [''],
  })

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(startWith('')), {
    initialValue: '',
  })

  private readonly runbookId = toSignal(
    this.form.controls.runbookId.valueChanges.pipe(startWith(this.form.controls.runbookId.value)),
    { initialValue: this.form.controls.runbookId.value },
  )

  private readonly instanceId = toSignal(
    this.form.controls.instanceId.valueChanges.pipe(startWith(this.form.controls.instanceId.value)),
    { initialValue: this.form.controls.instanceId.value },
  )

  readonly selectedId = computed(() => this.runbookId() ?? '')

  readonly filteredRunbooks = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.data.runbooks.filter((rb) => {
      if (!term) return true
      const hay = [rb.name, rb.description, rb.linkedTo, rb.owner, ...rb.tags].join(' ').toLowerCase()
      return hay.includes(term)
    })
  })

  readonly selected = computed(() => {
    const id = this.selectedId()
    return this.data.runbooks.find((rb) => rb.id === id) ?? null
  })

  readonly selectedInstance = computed(() => {
    const id = this.instanceId()
    return this.data.instances.find((i) => i.id === id) ?? null
  })

  constructor() {
    effect(() => {
      const rb = this.selected()
      if (!rb) return
      const currentId = this.form.controls.instanceId.value
      const stillValid = this.data.instances.some((i) => i.id === currentId)
      if (stillValid) return
      const rec = matchInstancesForRunbook(this.data.instances, rb.linkedTo)
      const next = rec[0]?.id ?? this.data.instances[0]?.id
      if (next) {
        this.form.controls.instanceId.setValue(next, { emitEvent: false })
      }
    })
  }

  stepTypeIcon = (type: string): string => STEP_TYPE_ICON[type] ?? 'chevron_right'

  instanceBrandLogo = (provider: string) => providerBrandLogo(provider)

  selectRunbook = (id: string): void => {
    this.form.controls.runbookId.setValue(id)
    const rb = this.data.runbooks.find((r) => r.id === id)
    if (!rb) return
    const rec = matchInstancesForRunbook(this.data.instances, rb.linkedTo)
    if (rec[0]) {
      this.form.controls.instanceId.setValue(rec[0].id)
    }
  }

  confirm = (): void => {
    this.form.markAllAsTouched()
    if (this.form.invalid) return
    const rb = this.selected()
    const inst = this.selectedInstance()
    if (this.data.instances.length && !inst) return
    const v = this.form.getRawValue()
    const note = v.note.trim()
    this.dialogRef.close({
      runbookId: v.runbookId,
      instanceId: v.instanceId,
      target: inst ? formatRunbookTargetLabel(inst) : rb?.linkedTo ?? '—',
      provider: inst ? String(inst.provider) : '—',
      accountName: inst?.accountName,
      dryRun: v.dryRun,
      notifyOnComplete: v.notifyOnComplete,
      note: note || undefined,
    })
  }

}
