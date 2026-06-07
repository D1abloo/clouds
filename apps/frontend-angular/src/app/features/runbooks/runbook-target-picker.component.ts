import { Component, computed, effect, inject, input, output, signal } from '@angular/core'
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatIconModule } from '@angular/material/icon'
import { startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import type { CloudAccount } from '../../core/models/api.models'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import {
  formatRunbookTargetLabel,
  matchInstancesForRunbook,
  providerBrandLogo,
  PROVIDER_ICON,
  PROVIDER_LABELS,
  type RunbookTargetInstance,
} from './runbook-target.util'

@Component({
  selector: 'app-runbook-target-picker',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatIconModule, BrandLogoComponent],
  template: `
    <div class="rb-target">
      @if (accounts().length) {
        <section class="rb-target__clouds" aria-label="Cuentas cloud conectadas">
          <h4 class="rb-target__title">
            <mat-icon>cloud</mat-icon>
            Cuentas cloud ({{ accounts().length }})
          </h4>
          <ul class="rb-target__cloud-list">
            @for (acc of accounts(); track acc.id) {
              <li>
                <button
                  type="button"
                  class="rb-target__cloud-item"
                  [class.rb-target__cloud-item--on]="accountFilter() === acc.id"
                  (click)="selectCloudAccount(acc.id)"
                >
                  <span class="rb-target__cloud-prov" [attr.data-provider]="acc.provider">
                    @if (brandLogo(acc.provider); as logo) {
                      <app-brand-logo [logo]="logo" size="lg" />
                    } @else {
                      <mat-icon>{{ providerIcon(acc.provider) }}</mat-icon>
                    }
                  </span>
                  <span class="rb-target__cloud-body">
                    <strong>{{ acc.name }}</strong>
                    <span>{{ providerLabel(acc.provider) }} · {{ instanceCountForAccount(acc.id) }} instancias</span>
                  </span>
                </button>
              </li>
            }
          </ul>
        </section>
      } @else {
        <p class="rb-target__empty-clouds">
          <mat-icon>cloud_off</mat-icon>
          No hay cuentas cloud conectadas. Añádelas en Nubes → Cuentas.
        </p>
      }

      <section class="rb-target__instances" aria-label="Instancias de destino">
        <h4 class="rb-target__title">
          <mat-icon>dns</mat-icon>
          Instancia de ejecución
          <span class="rb-target__count">({{ instances().length }} disponibles)</span>
        </h4>

        @if (instances().length === 0) {
          <p class="rb-target__empty">
            No hay instancias ni hosts VPS. Conecta una cuenta cloud o registra un VPS.
          </p>
        } @else {
          <div class="rb-target__filters" role="group" aria-label="Filtrar instancias">
            <div class="rb-target__provider-chips">
              @for (p of providerOptions(); track p) {
                <button
                  type="button"
                  class="rb-target__prov-chip"
                  [class.rb-target__prov-chip--on]="providerFilter() === p"
                  (click)="setProviderFilter(p)"
                >
                  @if (brandLogo(p); as logo) {
                    <app-brand-logo [logo]="logo" size="sm" />
                  } @else if (p !== 'all') {
                    <mat-icon>{{ providerIcon(p) }}</mat-icon>
                  }
                  {{ providerLabel(p) }}
                  <span class="rb-target__prov-count">{{ providerCount(p) }}</span>
                </button>
              }
            </div>
            @if (accountFilterOptions().length > 1) {
              <mat-form-field appearance="outline" class="rb-target__account-field">
                <mat-label>Filtrar por cuenta</mat-label>
                <mat-select [value]="accountFilter()" (selectionChange)="setAccountFilter($event.value)">
                  @for (opt of accountFilterOptions(); track opt.id) {
                    <mat-option [value]="opt.id">{{ opt.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
            <label class="rb-target__search">
              <mat-icon>search</mat-icon>
              <input
                type="search"
                [formControl]="instanceSearchControl"
                placeholder="Buscar por nombre, IP, región…"
                aria-label="Buscar instancia"
              />
            </label>
          </div>

          @if (recommendedInstances().length) {
            <div class="rb-target__rec" aria-label="Instancias recomendadas">
              <span class="rb-target__rec-label">
                <mat-icon>recommend</mat-icon>
                Sugeridas para «{{ linkedToHint() }}»
              </span>
              <div class="rb-target__rec-list">
                @for (inst of recommendedInstances(); track inst.id) {
                  <button
                    type="button"
                    class="rb-target__inst-chip"
                    [class.rb-target__inst-chip--on]="instanceControl().value === inst.id"
                    (click)="selectInstance(inst.id)"
                  >
                    {{ inst.name }} · {{ inst.provider }}
                  </button>
                }
              </div>
            </div>
          }

          <ul class="rb-target__inst-list" role="listbox" aria-label="Instancias disponibles">
            @for (inst of filteredInstances(); track inst.id) {
              <li>
                <button
                  type="button"
                  role="option"
                  class="rb-target__inst-item"
                  [class.rb-target__inst-item--on]="instanceControl().value === inst.id"
                  [attr.aria-selected]="instanceControl().value === inst.id"
                  (click)="selectInstance(inst.id)"
                >
                  <span class="rb-target__inst-prov" [attr.data-provider]="inst.provider">
                    @if (brandLogo(inst.provider); as logo) {
                      <app-brand-logo [logo]="logo" size="lg" />
                    } @else {
                      <mat-icon>{{ providerIcon(inst.provider) }}</mat-icon>
                    }
                  </span>
                  <span class="rb-target__inst-body">
                    <strong>{{ inst.name }}</strong>
                    <span>
                      {{ providerLabel(inst.provider) }}
                      @if (inst.accountName) { · {{ inst.accountName }} }
                      @if (inst.region) { · {{ inst.region }} }
                    </span>
                    @if (inst.publicIp || inst.privateIp || inst.hostAddress) {
                      <code class="mono">{{ inst.publicIp ?? inst.privateIp ?? inst.hostAddress }}</code>
                    }
                  </span>
                  <span class="rb-target__inst-status" [attr.data-status]="inst.status">
                    {{ inst.status ?? '—' }}
                  </span>
                </button>
              </li>
            } @empty {
              <li class="rb-target__list-empty">Ninguna instancia coincide con los filtros</li>
            }
          </ul>

          @if (instanceControl().invalid && instanceControl().touched) {
            <p class="rb-target__error" role="alert">Selecciona una instancia para continuar</p>
          }
        }
      </section>
    </div>
  `,
  styles: `
    .rb-target {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .rb-target__title {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0 0 0.45rem;
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .rb-target__title mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #844fba;
    }
    .rb-target__count {
      font-weight: 600;
      text-transform: none;
      letter-spacing: 0;
      color: #94a3b8;
    }
    .rb-target__cloud-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.4rem;
    }
    .rb-target__cloud-item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.45rem;
      align-items: center;
      width: 100%;
      padding: 0.45rem 0.55rem;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      border-radius: 10px;
      background: var(--app-elevated, #fff);
      text-align: left;
      font: inherit;
      color: #111;
      cursor: pointer;
    }
    .rb-target__cloud-item:hover {
      border-color: color-mix(in srgb, #844fba 35%, transparent);
    }
    .rb-target__cloud-item--on {
      border-color: #844fba;
      background: color-mix(in srgb, #844fba 8%, transparent);
      box-shadow: inset 3px 0 0 #844fba;
    }
    .rb-target__cloud-prov {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 8px;
      background: #fff;
      border: 1px solid color-mix(in srgb, #111 8%, transparent);
      flex-shrink: 0;
    }
    .rb-target__cloud-prov mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: #64748b;
    }
    .rb-target__cloud-prov ::ng-deep .brand-logo {
      width: 1.35rem;
      height: 1.35rem;
    }
    .rb-target__cloud-body strong {
      display: block;
      font-size: 0.74rem;
    }
    .rb-target__cloud-body > span {
      display: block;
      font-size: 0.62rem;
      color: #64748b;
    }
    .rb-target__empty-clouds,
    .rb-target__empty {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      margin: 0;
      padding: 0.55rem 0.65rem;
      border-radius: 10px;
      background: color-mix(in srgb, #f59e0b 8%, transparent);
      border: 1px solid color-mix(in srgb, #f59e0b 22%, transparent);
      font-size: 0.72rem;
      color: #92400e;
      line-height: 1.45;
    }
    .rb-target__empty-clouds mat-icon,
    .rb-target__empty mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
    }
    .rb-target__filters {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      margin-bottom: 0.45rem;
    }
    .rb-target__provider-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }
    .rb-target__prov-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.22rem 0.5rem;
      border: 1px solid color-mix(in srgb, #111 12%, transparent);
      border-radius: 999px;
      background: var(--app-elevated, #fff);
      font: inherit;
      font-size: 0.65rem;
      font-weight: 700;
      color: #333;
      cursor: pointer;
    }
    .rb-target__prov-chip mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .rb-target__prov-chip--on {
      border-color: #844fba;
      background: color-mix(in srgb, #844fba 10%, transparent);
      color: #844fba;
    }
    .rb-target__prov-count {
      opacity: 0.7;
    }
    .rb-target__account-field {
      width: 100%;
      margin: 0;
    }
    .rb-target__search {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.55rem;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      background: var(--app-elevated, #fff);
    }
    .rb-target__search mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #64748b;
    }
    .rb-target__search input {
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.78rem;
      width: 100%;
      min-width: 0;
      color: #111;
    }
    .rb-target__search input:focus {
      outline: none;
    }
    .rb-target__rec {
      margin-bottom: 0.45rem;
      padding: 0.45rem 0.55rem;
      border-radius: 10px;
      background: color-mix(in srgb, #844fba 6%, transparent);
      border: 1px solid color-mix(in srgb, #844fba 18%, transparent);
    }
    .rb-target__rec-label {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.65rem;
      font-weight: 700;
      color: #844fba;
    }
    .rb-target__rec-label mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .rb-target__rec-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.35rem;
    }
    .rb-target__inst-chip {
      padding: 0.2rem 0.5rem;
      border: 1px solid color-mix(in srgb, #844fba 30%, transparent);
      border-radius: 8px;
      background: #fff;
      font: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      color: #844fba;
      cursor: pointer;
    }
    .rb-target__inst-chip--on {
      background: color-mix(in srgb, #844fba 14%, transparent);
    }
    .rb-target__inst-list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid color-mix(in srgb, #111 8%, transparent);
      border-radius: 10px;
      scrollbar-width: thin;
    }
    .rb-target__inst-item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.45rem;
      align-items: center;
      width: 100%;
      padding: 0.45rem 0.55rem;
      border: none;
      border-bottom: 1px solid color-mix(in srgb, #111 5%, transparent);
      background: transparent;
      text-align: left;
      font: inherit;
      color: #111;
      cursor: pointer;
    }
    .rb-target__inst-item:last-child {
      border-bottom: none;
    }
    .rb-target__inst-item:hover {
      background: color-mix(in srgb, #111 3%, transparent);
    }
    .rb-target__inst-item--on {
      background: color-mix(in srgb, #844fba 8%, transparent);
      box-shadow: inset 3px 0 0 #844fba;
    }
    .rb-target__inst-prov {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 8px;
      background: #fff;
      border: 1px solid color-mix(in srgb, #111 8%, transparent);
      flex-shrink: 0;
    }
    .rb-target__inst-prov[data-provider='VPS'] {
      background: color-mix(in srgb, #844fba 10%, #fff);
      border-color: color-mix(in srgb, #844fba 25%, transparent);
    }
    .rb-target__inst-prov[data-provider='VPS'] mat-icon {
      color: #844fba;
    }
    .rb-target__inst-prov mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #64748b;
    }
    .rb-target__inst-prov ::ng-deep .brand-logo {
      width: 1.35rem;
      height: 1.35rem;
    }
    .rb-target__prov-chip ::ng-deep .brand-logo {
      width: 0.9rem;
      height: 0.9rem;
    }
    .rb-target__inst-body {
      min-width: 0;
    }
    .rb-target__inst-body strong {
      display: block;
      font-size: 0.76rem;
    }
    .rb-target__inst-body > span {
      display: block;
      font-size: 0.62rem;
      color: #64748b;
    }
    .rb-target__inst-body code {
      display: block;
      margin-top: 0.1rem;
      font-size: 0.62rem;
      color: #475569;
    }
    .rb-target__inst-status {
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
    }
    .rb-target__inst-status[data-status='running'],
    .rb-target__inst-status[data-status='connected'] {
      color: #15803d;
    }
    .rb-target__list-empty {
      padding: 0.75rem;
      text-align: center;
      font-size: 0.72rem;
      color: #64748b;
    }
    .rb-target__error {
      margin: 0.35rem 0 0;
      font-size: 0.72rem;
      font-weight: 600;
      color: #dc2626;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
  `,
})
export class RunbookTargetPickerComponent {
  private readonly fb = inject(FormBuilder)

  readonly instanceControl = input.required<FormControl<string>>()
  readonly instances = input.required<RunbookTargetInstance[]>()
  readonly accounts = input.required<CloudAccount[]>()
  readonly linkedToHint = input('')

  readonly targetChange = output<RunbookTargetInstance | null>()

  readonly instanceSearchControl = this.fb.nonNullable.control('')
  readonly providerFilter = signal<string>('all')
  readonly accountFilter = signal<string>('all')

  private readonly instanceSearchTerm = toSignal(
    this.instanceSearchControl.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  )

  readonly providerOptions = computed(() => {
    const providers = [...new Set(this.instances().map((i) => String(i.provider)))]
    return ['all', ...providers.sort()]
  })

  readonly recommendedInstances = computed(() => {
    const hint = this.linkedToHint().trim()
    if (!hint) return []
    return matchInstancesForRunbook(this.instances(), hint).slice(0, 4)
  })

  readonly accountFilterOptions = computed(() => {
    const prov = this.providerFilter()
    const base = this.instances().filter((i) => {
      if (prov !== 'all' && String(i.provider) !== prov) return false
      return Boolean(i.cloudAccountId)
    })
    const ids = [...new Set(base.map((i) => i.cloudAccountId).filter(Boolean))] as string[]
    const opts = ids.map((id) => {
      const inst = base.find((i) => i.cloudAccountId === id)
      const acc = this.accounts().find((a) => a.id === id)
      return { id, label: inst?.accountName ?? acc?.name ?? id }
    })
    return [{ id: 'all', label: 'Todas las cuentas' }, ...opts]
  })

  readonly filteredInstances = computed(() => {
    const prov = this.providerFilter()
    const acc = this.accountFilter()
    const term = (this.instanceSearchTerm() ?? '').toLowerCase()
    return this.instances().filter((i) => {
      if (prov !== 'all' && String(i.provider) !== prov) return false
      if (acc !== 'all' && i.cloudAccountId !== acc) return false
      if (!term) return true
      const hay = [
        i.name,
        i.provider,
        i.region,
        i.accountName,
        i.publicIp,
        i.privateIp,
        i.hostAddress,
        i.instanceType,
        i.os,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(term)
    })
  })

  constructor() {
    effect(() => {
      const hint = this.linkedToHint()
      if (!hint.trim()) return
      const current = this.instanceControl().value
      if (this.instances().some((i) => i.id === current)) return
      const rec = matchInstancesForRunbook(this.instances(), hint)
      if (rec[0]) this.selectInstance(rec[0].id, false)
    })
  }

  instanceCountForAccount = (accountId: string): number =>
    this.instances().filter((i) => i.cloudAccountId === accountId).length

  providerLabel = (p: string): string => (p === 'all' ? 'Todos' : PROVIDER_LABELS[p] ?? p)

  providerIcon = (p: string): string => (p === 'all' ? 'layers' : PROVIDER_ICON[p] ?? 'dns')

  brandLogo = (p: string): ReturnType<typeof providerBrandLogo> =>
    p === 'all' ? null : providerBrandLogo(p)

  providerCount = (p: string): number => {
    if (p === 'all') return this.instances().length
    return this.instances().filter((i) => String(i.provider) === p).length
  }

  setProviderFilter = (p: string): void => {
    this.providerFilter.set(p)
    this.accountFilter.set('all')
  }

  setAccountFilter = (id: string): void => {
    this.accountFilter.set(id)
  }

  selectCloudAccount = (accountId: string): void => {
    this.accountFilter.set(accountId)
    const first = this.instances().find((i) => i.cloudAccountId === accountId)
    if (first) this.selectInstance(first.id)
  }

  selectInstance = (id: string, emit = true): void => {
    this.instanceControl().setValue(id)
    this.instanceControl().markAsTouched()
    const inst = this.instances().find((i) => i.id === id) ?? null
    if (emit) this.targetChange.emit(inst)
  }
}
