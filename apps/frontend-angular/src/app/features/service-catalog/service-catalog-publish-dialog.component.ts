import { Component, computed, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import {
  SERVICE_CATALOG_CATEGORY_LABELS,
  SERVICE_CATALOG_CLOUD_LABELS,
  SERVICE_CATALOG_ENVIRONMENT_LABELS,
  type ServiceCatalogTemplate,
} from './service-catalog.demo'

export interface ServiceCatalogPublishDialogData {
  drafts: ServiceCatalogTemplate[]
}

@Component({
  selector: 'app-service-catalog-publish-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    BrandLogoComponent,
  ],
  template: `
    <div class="sc-pub">
      <header class="sc-pub__head">
        <div class="sc-pub__head-main">
          <span class="sc-pub__eyebrow">Catálogo de servicios</span>
          <h2 mat-dialog-title>Publicar plantillas</h2>
          <p>Haz visibles en el catálogo los borradores listos para lanzarse.</p>
        </div>
        <div class="sc-pub__stats">
          <span class="sc-pub__stat">
            <strong>{{ data.drafts.length }}</strong>
            borrador(es)
          </span>
          <span class="sc-pub__stat sc-pub__stat--sel">
            <strong>{{ selected().size }}</strong>
            seleccionado(s)
          </span>
        </div>
      </header>

      <mat-dialog-content class="sc-pub__body">
        @if (data.drafts.length === 0) {
          <div class="sc-pub__empty">
            <mat-icon>inventory_2</mat-icon>
            <h3>Sin borradores pendientes</h3>
            <p>Crea una plantilla nueva o importa JSON. Se guardará como borrador hasta que la publiques.</p>
          </div>
        } @else {
          <div class="sc-pub__toolbar">
            <mat-form-field appearance="outline" class="sc-pub__search" subscriptSizing="dynamic">
              <mat-label>Buscar borrador</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Nombre, owner, categoría…" />
            </mat-form-field>
            <div class="sc-pub__toolbar-actions">
              <button type="button" class="sc-pub__tool-btn" (click)="handleSelectAll()">
                <mat-icon>done_all</mat-icon>
                Todas
              </button>
              <button type="button" class="sc-pub__tool-btn" [disabled]="selected().size === 0" (click)="handleClearSelection()">
                <mat-icon>clear</mat-icon>
                Limpiar
              </button>
            </div>
          </div>

          <div class="sc-pub__layout">
            <ul class="sc-pub__list" role="list">
              @for (tpl of filteredDrafts(); track tpl.id) {
                <li>
                  <button
                    type="button"
                    class="sc-pub__card"
                    [class.sc-pub__card--on]="selected().has(tpl.id)"
                    [attr.data-cloud]="tpl.cloud"
                    (click)="toggle(tpl.id)"
                  >
                    <span class="sc-pub__check" aria-hidden="true">
                      <mat-icon>{{ selected().has(tpl.id) ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                    </span>
                    <div class="sc-pub__card-logos">
                      <app-brand-logo [logo]="tpl.cloud" size="md" />
                      <span class="sc-pub__card-tech">
                        <app-brand-logo [logo]="tpl.techLogo" size="sm" />
                      </span>
                    </div>
                    <div class="sc-pub__card-main">
                      <div class="sc-pub__card-head">
                        <strong>{{ tpl.name }}</strong>
                        @if (tpl.requiresApproval) {
                          <span class="sc-pub__pill sc-pub__pill--warn">
                            <mat-icon>verified_user</mat-icon>
                            Aprobación
                          </span>
                        }
                        @if (!isReady(tpl)) {
                          <span class="sc-pub__pill sc-pub__pill--info">
                            <mat-icon>info</mat-icon>
                            Revisar
                          </span>
                        }
                      </div>
                      <p class="sc-pub__card-desc">{{ tpl.description || 'Sin descripción' }}</p>
                      <div class="sc-pub__card-meta">
                        <span>{{ categoryLabel(tpl.category) }}</span>
                        <span>{{ cloudLabel(tpl.cloud) }}</span>
                        <span>{{ envLabel(tpl.environment) }}</span>
                        <span class="mono">{{ tpl.version }}</span>
                        <span>{{ tpl.owner }}</span>
                      </div>
                    </div>
                  </button>
                </li>
              } @empty {
                <li class="sc-pub__no-match">No hay borradores que coincidan con «{{ search() }}».</li>
              }
            </ul>

            <aside class="sc-pub__aside" aria-label="Resumen de publicación">
              @if (selectedTemplates().length) {
                <h3>Se publicarán</h3>
                <ul class="sc-pub__aside-list">
                  @for (tpl of selectedTemplates(); track tpl.id) {
                    <li>
                      <app-brand-logo [logo]="tpl.cloud" size="sm" />
                      <span>
                        <strong>{{ tpl.name }}</strong>
                        <span>{{ cloudLabel(tpl.cloud) }} · {{ tpl.version }}</span>
                      </span>
                      <button type="button" class="sc-pub__aside-remove" (click)="toggle(tpl.id); $event.stopPropagation()" aria-label="Quitar selección">
                        <mat-icon>close</mat-icon>
                      </button>
                    </li>
                  }
                </ul>
                @if (selectedWithWarnings().length) {
                  <div class="sc-pub__aside-note">
                    <mat-icon>info</mat-icon>
                    {{ selectedWithWarnings().length }} plantilla(s) requieren revisión antes del lanzamiento.
                  </div>
                }
              } @else {
                <div class="sc-pub__aside-empty">
                  <mat-icon>touch_app</mat-icon>
                  <p>Selecciona uno o más borradores para ver el resumen.</p>
                </div>
              }
            </aside>
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions class="sc-pub__actions">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="selected().size === 0"
          (click)="confirm()"
        >
          <mat-icon>publish</mat-icon>
          Publicar{{ selected().size ? ' (' + selected().size + ')' : '' }}
        </button>
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
    .sc-pub {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }
    .sc-pub__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-shrink: 0;
      padding: 0.9rem 1.15rem 0.75rem;
      background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
      border-bottom: 1px solid #f1f5f9;
    }
    .sc-pub__eyebrow {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sc-pub__head h2 {
      margin: 0.1rem 0 0;
      font-size: 1.05rem;
      font-weight: 700;
    }
    .sc-pub__head p {
      margin: 0.2rem 0 0;
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.45;
    }
    .sc-pub__stats {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      flex-shrink: 0;
    }
    .sc-pub__stat {
      display: flex;
      align-items: baseline;
      gap: 0.3rem;
      padding: 0.3rem 0.55rem;
      border-radius: 8px;
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      background: #f8fafc;
    }
    .sc-pub__stat strong {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0f172a;
    }
    .sc-pub__stat--sel {
      background: rgb(5 150 105 / 0.08);
      color: #059669;
    }
    .sc-pub__stat--sel strong { color: #059669; }

    .sc-pub__body {
      flex: 1;
      min-height: 0;
      padding: 0.75rem 1.15rem !important;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .sc-pub__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem 1rem;
      color: #64748b;
    }
    .sc-pub__empty mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: #cbd5e1;
      margin-bottom: 0.5rem;
    }
    .sc-pub__empty h3 {
      margin: 0 0 0.25rem;
      font-size: 0.9rem;
      color: #334155;
    }
    .sc-pub__empty p {
      margin: 0;
      font-size: 0.72rem;
      max-width: 20rem;
      line-height: 1.5;
    }

    .sc-pub__toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.65rem;
      flex-shrink: 0;
    }
    .sc-pub__search {
      flex: 1;
      min-width: 180px;
      font-size: 0.75rem;
    }
    .sc-pub__toolbar-actions {
      display: flex;
      gap: 0.3rem;
    }
    .sc-pub__tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.32rem 0.55rem;
      border: none;
      border-radius: 8px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.68rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
    }
    .sc-pub__tool-btn:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }
    .sc-pub__tool-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .sc-pub__tool-btn mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }

    .sc-pub__layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 0.75rem;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .sc-pub__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .sc-pub__no-match {
      padding: 1rem;
      font-size: 0.72rem;
      color: #64748b;
      text-align: center;
    }

    .sc-pub__card {
      --sc-accent: #64748b;
      position: relative;
      display: grid;
      grid-template-columns: auto auto 1fr;
      align-items: start;
      gap: 0.55rem;
      width: 100%;
      padding: 0.55rem 0.65rem 0.55rem 0.75rem;
      border: none;
      border-radius: 11px;
      background: #fff;
      text-align: left;
      font: inherit;
      cursor: pointer;
      box-shadow: 0 1px 3px rgb(15 23 42 / 0.05);
      transition: box-shadow 0.15s, background 0.15s;
      overflow: hidden;
    }
    .sc-pub__card[data-cloud='aws'] { --sc-accent: #ff9900; }
    .sc-pub__card[data-cloud='gcp'] { --sc-accent: #4285f4; }
    .sc-pub__card[data-cloud='azure'] { --sc-accent: #0078d4; }
    .sc-pub__card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--sc-accent);
      opacity: 0.7;
    }
    .sc-pub__card:hover { box-shadow: 0 2px 8px rgb(15 23 42 / 0.08); }
    .sc-pub__card--on {
      background: #f8fafc;
      box-shadow: inset 0 0 0 2px var(--sc-accent), 0 2px 8px rgb(15 23 42 / 0.06);
    }
    .sc-pub__check {
      padding-top: 0.35rem;
    }
    .sc-pub__check mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #cbd5e1;
    }
    .sc-pub__card--on .sc-pub__check mat-icon { color: var(--sc-accent); }
    .sc-pub__card-logos {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 10px;
      background: #f8fafc;
      flex-shrink: 0;
    }
    .sc-pub__card-tech {
      position: absolute;
      right: -0.25rem;
      bottom: -0.25rem;
      display: flex;
      padding: 0.12rem;
      border-radius: 6px;
      background: #fff;
      box-shadow: 0 1px 4px rgb(15 23 42 / 0.1);
    }
    .sc-pub__card-main { min-width: 0; }
    .sc-pub__card-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
    }
    .sc-pub__card-head strong {
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .sc-pub__pill {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0.08rem 0.35rem;
      border-radius: 999px;
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .sc-pub__pill mat-icon {
      font-size: 0.7rem;
      width: 0.7rem;
      height: 0.7rem;
    }
    .sc-pub__pill--warn { background: #fef3c7; color: #b45309; }
    .sc-pub__pill--info { background: #e0f2fe; color: #0369a1; }
    .sc-pub__card-desc {
      margin: 0.2rem 0 0.3rem;
      font-size: 0.68rem;
      color: #64748b;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sc-pub__card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      font-size: 0.6rem;
      font-weight: 600;
      color: #94a3b8;
    }
    .sc-pub__card-meta span:not(:last-child)::after {
      content: '·';
      margin-left: 0.35rem;
      color: #cbd5e1;
    }

    .sc-pub__aside {
      padding: 0.55rem 0.6rem;
      border-radius: 11px;
      background: #f8fafc;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .sc-pub__aside h3 {
      margin: 0 0 0.45rem;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .sc-pub__aside-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .sc-pub__aside-list li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.35rem;
      align-items: start;
      padding: 0.35rem 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .sc-pub__aside-list li:last-child { border-bottom: none; }
    .sc-pub__aside-list strong {
      display: block;
      font-size: 0.68rem;
      line-height: 1.3;
    }
    .sc-pub__aside-list li > span > span {
      display: block;
      margin-top: 0.06rem;
      font-size: 0.58rem;
      color: #94a3b8;
    }
    .sc-pub__aside-remove {
      display: flex;
      padding: 0.1rem;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
    }
    .sc-pub__aside-remove:hover { background: #e2e8f0; color: #334155; }
    .sc-pub__aside-remove mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .sc-pub__aside-note {
      display: flex;
      align-items: flex-start;
      gap: 0.3rem;
      margin-top: 0.5rem;
      padding: 0.4rem 0.45rem;
      border-radius: 8px;
      background: #fff;
      font-size: 0.62rem;
      color: #0369a1;
      line-height: 1.4;
    }
    .sc-pub__aside-note mat-icon {
      flex-shrink: 0;
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .sc-pub__aside-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.5rem 0.5rem;
      color: #94a3b8;
    }
    .sc-pub__aside-empty mat-icon {
      font-size: 1.75rem;
      width: 1.75rem;
      height: 1.75rem;
      margin-bottom: 0.35rem;
    }
    .sc-pub__aside-empty p {
      margin: 0;
      font-size: 0.65rem;
      line-height: 1.45;
    }

    .sc-pub__actions {
      display: flex !important;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.35rem;
      padding: 0.7rem 1.15rem !important;
      flex-shrink: 0;
      border-top: 1px solid #e2e8f0;
      background: #fff;
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }

    @media (max-width: 640px) {
      .sc-pub__layout { grid-template-columns: 1fr; }
      .sc-pub__aside { max-height: 10rem; }
      .sc-pub__head { flex-direction: column; }
      .sc-pub__stats { flex-direction: row; }
    }
  `,
})
export class ServiceCatalogPublishDialogComponent {
  readonly data = inject<ServiceCatalogPublishDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<ServiceCatalogPublishDialogComponent, string[]>)

  readonly search = signal('')
  readonly selected = signal<Set<string>>(new Set())

  filteredDrafts = computed(() => {
    const q = this.search().trim().toLowerCase()
    if (!q) return this.data.drafts
    return this.data.drafts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        SERVICE_CATALOG_CATEGORY_LABELS[d.category].toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q),
    )
  })

  selectedTemplates = computed(() =>
    this.data.drafts.filter((d) => this.selected().has(d.id)),
  )

  selectedWithWarnings = computed(() =>
    this.selectedTemplates().filter((t) => !this.isReady(t) || t.requiresApproval),
  )

  categoryLabel = (c: ServiceCatalogTemplate['category']): string =>
    SERVICE_CATALOG_CATEGORY_LABELS[c]
  cloudLabel = (c: ServiceCatalogTemplate['cloud']): string => SERVICE_CATALOG_CLOUD_LABELS[c]
  envLabel = (e: ServiceCatalogTemplate['environment']): string =>
    e ? SERVICE_CATALOG_ENVIRONMENT_LABELS[e] : '—'

  isReady = (tpl: ServiceCatalogTemplate): boolean =>
    !!tpl.name?.trim() && !!tpl.description?.trim() && !!tpl.avgProvision?.trim()

  toggle = (id: string): void => {
    this.selected.update((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  handleSelectAll = (): void => {
    this.selected.set(new Set(this.filteredDrafts().map((d) => d.id)))
  }

  handleClearSelection = (): void => {
    this.selected.set(new Set())
  }

  confirm = (): void => {
    this.dialogRef.close([...this.selected()])
  }
}
