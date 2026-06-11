import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { CloudCatalogCacheService } from '../../core/services/cloud-catalog-cache.service'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import type { CloudProvider } from '../../core/models/api.models'
import type { CloudAccountRow } from './cloud-provider.data'
import { sparkPath } from './cloud-provider.data'

type CloudImageRow = {
  id: string
  name: string
  os?: string
  architecture?: string
  status?: string
}

@Component({
  selector: 'app-cloud-images-catalog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    LoadingStateComponent,
  ],
  template: `
    <section class="cic" aria-labelledby="cic-title">
      <header class="cic__head">
        <div>
          <h3 id="cic-title"><mat-icon>image</mat-icon> Imágenes operativas</h3>
          <p>
            Catálogo en tiempo real de imágenes <strong>available</strong> listas para lanzar.
            @if (account()) { Cuenta: {{ account()!.name }} }
          </p>
        </div>
        <div class="cic__filters">
          @if (accounts().length > 1) {
            <mat-form-field appearance="fill" subscriptSizing="dynamic">
              <mat-label>Cuenta</mat-label>
              <mat-select [formControl]="accountControl">
                @for (a of accounts(); track a.id) {
                  <mat-option [value]="a.id">{{ a.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
          <mat-form-field appearance="fill" subscriptSizing="dynamic">
            <mat-label>Región</mat-label>
            <mat-select [formControl]="regionControl" (selectionChange)="loadImages()">
              @for (r of regions(); track r.id) {
                <mat-option [value]="r.id">{{ r.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </header>

      @if (loading()) {
        <app-loading-state message="Cargando imágenes operativas…" />
      } @else {
        <div class="cic__analytics" aria-label="Distribución de imágenes">
          <article class="cic__stat">
            <span>Disponibles</span>
            <strong>{{ images().length }}</strong>
            <em>Estado available</em>
          </article>
          <article class="cic__stat">
            <span>Linux</span>
            <strong>{{ osCount().linux }}</strong>
            <div class="cic__bar"><span [style.width.%]="osPct().linux"></span></div>
          </article>
          <article class="cic__stat">
            <span>Windows</span>
            <strong>{{ osCount().windows }}</strong>
            <div class="cic__bar cic__bar--win"><span [style.width.%]="osPct().windows"></span></div>
          </article>
          <article class="cic__stat cic__stat--chart">
            <span>Arquitecturas</span>
            <svg viewBox="0 0 120 32" class="cic__spark" aria-hidden="true">
              <path [attr.d]="archSpark()" fill="none" stroke="var(--cloud-accent, #0284c7)" stroke-width="2" />
            </svg>
            <em>x86_64: {{ archCount().x86 }} · arm64: {{ archCount().arm }}</em>
          </article>
        </div>

        <div class="cic__infra" aria-label="Vista previa de infraestructura a lanzar">
          <h4><mat-icon>account_tree</mat-icon> Plantilla de infraestructura</h4>
          <div class="cic__infra-grid">
            <div class="cic__infra-node"><mat-icon>public</mat-icon><span>Región</span><strong>{{ regionControl.value || '—' }}</strong></div>
            <div class="cic__infra-node"><mat-icon>device_hub</mat-icon><span>VPC / Red</span><strong>Auto-asignada</strong></div>
            <div class="cic__infra-node"><mat-icon>dns</mat-icon><span>Compute</span><strong>Tipo configurable</strong></div>
            <div class="cic__infra-node"><mat-icon>storage</mat-icon><span>Disco raíz</span><strong>30 GB gp3</strong></div>
            <div class="cic__infra-node"><mat-icon>security</mat-icon><span>Seguridad</span><strong>SG / firewall</strong></div>
            <div class="cic__infra-node"><mat-icon>monitoring</mat-icon><span>Monitoreo</span><strong>Agente incluido</strong></div>
          </div>
        </div>

        <div class="cic__grid" role="list">
          @for (img of images(); track img.id) {
            <article class="cic__card" role="listitem">
              <div class="cic__card-top">
                <span class="cic__os">{{ osIcon(img) }}</span>
                <span class="cic__badge">Operativa</span>
              </div>
              <h4>{{ img.name }}</h4>
              <p class="cic__meta">{{ img.architecture ?? 'x86_64' }} · {{ img.os ?? 'Linux' }}</p>
              <code class="cic__id" [title]="img.id">{{ shortId(img.id) }}</code>
              <footer>
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  (click)="handleLaunchImage(img.id)"
                  [attr.aria-label]="'Lanzar instancia con ' + img.name"
                >
                  <mat-icon>rocket_launch</mat-icon>
                  Lanzar
                </button>
              </footer>
            </article>
          } @empty {
            <p class="cic__empty">No hay imágenes operativas en esta región. Cambia de región o sincroniza la cuenta.</p>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .cic__head {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem;
      h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.25rem; font-size: 1rem; }
      p { margin: 0; font-size: 0.78rem; color: var(--app-text-muted); }
    }
    .cic__filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .cic__analytics {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.65rem; margin-bottom: 1rem;
    }
    .cic__stat {
      padding: 0.65rem 0.75rem; border-radius: 12px; background: var(--app-elevated);
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      span { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--app-text-muted); }
      strong { display: block; font-size: 1.35rem; font-weight: 800; margin: 0.15rem 0; }
      em { font-size: 0.65rem; color: var(--app-text-muted); font-style: normal; }
    }
    .cic__bar { height: 6px; border-radius: 999px; background: var(--app-card); overflow: hidden; margin-top: 0.35rem; }
    .cic__bar span { display: block; height: 100%; background: var(--cloud-accent, #0284c7); border-radius: 999px; }
    .cic__bar--win span { background: #0078d4; }
    .cic__spark { width: 100%; height: 32px; margin-top: 0.25rem; }
    .cic__infra {
      margin-bottom: 1rem; padding: 0.75rem; border-radius: 12px;
      background: color-mix(in srgb, var(--cloud-accent, #0284c7) 5%, var(--app-elevated));
      border: 1px solid color-mix(in srgb, var(--cloud-accent) 18%, transparent);
      h4 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.65rem; font-size: 0.78rem; }
    }
    .cic__infra-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.45rem; }
    .cic__infra-node {
      padding: 0.45rem 0.55rem; border-radius: 8px; background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      display: grid; grid-template-columns: auto 1fr; gap: 0.1rem 0.4rem; align-items: center;
      mat-icon { grid-row: span 2; color: var(--cloud-accent); font-size: 1rem; width: 1rem; height: 1rem; }
      span { font-size: 0.55rem; text-transform: uppercase; color: var(--app-text-muted); grid-column: 2; }
      strong { font-size: 0.72rem; grid-column: 2; }
    }
    .cic__grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.65rem;
    }
    .cic__card {
      padding: 0.75rem; border-radius: 12px; background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 14%, transparent);
      display: flex; flex-direction: column; gap: 0.25rem;
    }
    .cic__card-top { display: flex; justify-content: space-between; align-items: center; }
    .cic__os { font-size: 1.25rem; }
    .cic__badge {
      font-size: 0.55rem; font-weight: 800; text-transform: uppercase; padding: 0.12rem 0.4rem; border-radius: 4px;
      background: color-mix(in srgb, #22c55e 15%, transparent); color: #15803d;
    }
    .cic__card h4 { margin: 0; font-size: 0.82rem; line-height: 1.3; }
    .cic__meta { margin: 0; font-size: 0.68rem; color: var(--app-text-muted); }
    .cic__id { font-size: 0.6rem; opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cic__card footer { margin-top: auto; padding-top: 0.35rem; }
    .cic__empty { grid-column: 1 / -1; color: #b45309; font-size: 0.85rem; }
  `,
})
export class CloudImagesCatalogComponent {
  readonly accounts = input.required<CloudAccountRow[]>()
  readonly provider = input.required<CloudProvider>()

  readonly launchImage = output<string>()

  private readonly cloudAccounts = inject(CloudAccountsService)
  private readonly catalogCache = inject(CloudCatalogCacheService)

  readonly loading = signal(true)
  readonly images = signal<CloudImageRow[]>([])
  readonly regions = signal<{ id: string; name: string }[]>([])

  readonly accountControl = new FormControl<string>('', { nonNullable: true })
  readonly regionControl = new FormControl<string>('', { nonNullable: true })

  readonly account = computed(() => this.accounts().find((a) => a.id === this.accountControl.value))

  readonly osCount = computed(() => {
    const linux = this.images().filter((i) => !this.isWindows(i)).length
    return { linux, windows: this.images().length - linux }
  })

  readonly osPct = computed(() => {
    const total = Math.max(this.images().length, 1)
    const c = this.osCount()
    return { linux: Math.round((c.linux / total) * 100), windows: Math.round((c.windows / total) * 100) }
  })

  readonly archCount = computed(() => {
    const arm = this.images().filter((i) => (i.architecture ?? '').toLowerCase().includes('arm')).length
    return { x86: this.images().length - arm, arm }
  })

  readonly archSpark = computed(() => {
    const pts = [this.archCount().x86, this.archCount().arm, this.osCount().linux, this.osCount().windows]
    const max = Math.max(...pts, 1)
    const norm = pts.map((p) => Math.round((p / max) * 100))
    return sparkPath(norm.length ? norm : [10, 20, 15, 25])
  })

  constructor() {
    this.accountControl.valueChanges.subscribe(() => this.bootstrapRegions())

    effect(() => {
      const accs = this.accounts()
      if (!accs.length) {
        this.loading.set(false)
        this.images.set([])
        return
      }
      const pick = accs.find((a) => a.hasCredentials) ?? accs[0]
      const current = this.accountControl.value
      if (!current || !accs.find((a) => a.id === current)) {
        this.accountControl.setValue(pick.id)
        return
      }
      this.bootstrapRegions()
    })
  }

  bootstrapRegions = (): void => {
    const id = this.accountControl.value
    if (!id) return
    this.loading.set(true)
    const provider = this.provider()
    this.catalogCache.fetch(`regions:${provider}:${id}`, () => this.cloudAccounts.regions(id)).subscribe({
      next: (r) => {
        this.regions.set(r)
        const acc = this.account()
        const region = acc?.primaryRegion && r.find((x) => x.id === acc.primaryRegion) ? acc.primaryRegion : r[0]?.id ?? ''
        this.regionControl.setValue(region)
        this.loadImages()
      },
      error: () => {
        this.loading.set(false)
        this.images.set([])
      },
    })
  }

  loadImages = (): void => {
    const id = this.accountControl.value
    const region = this.regionControl.value
    if (!id) return
    this.loading.set(true)
    const provider = this.provider()
    const regionKey = region || 'default'
    this.catalogCache
      .fetch(`images:${provider}:${id}:${regionKey}`, () => this.cloudAccounts.images(id, region || undefined))
      .subscribe({
        next: (rows) => {
          const list = (rows as CloudImageRow[]).filter((i) => i.id && (i.status ?? 'available') === 'available')
          this.images.set(list)
          this.loading.set(false)
        },
        error: () => {
          this.images.set([])
          this.loading.set(false)
        },
      })
  }

  handleLaunchImage = (imageId: string): void => {
    this.launchImage.emit(imageId)
  }

  osIcon = (img: CloudImageRow): string => {
    const n = (img.name + (img.os ?? '')).toLowerCase()
    if (n.includes('windows')) return '🪟'
    if (n.includes('ubuntu')) return '🟠'
    if (n.includes('debian')) return '🔴'
    if (n.includes('amazon') || n.includes('al202')) return '🟧'
    return '🐧'
  }

  shortId = (id: string): string => (id.length > 32 ? `${id.slice(0, 28)}…` : id)

  private isWindows = (img: CloudImageRow): boolean =>
    (img.name + (img.os ?? '')).toLowerCase().includes('windows')
}
