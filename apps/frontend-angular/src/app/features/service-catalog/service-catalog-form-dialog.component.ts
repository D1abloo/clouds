import { Component, computed, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import {
  SERVICE_CATALOG_CATEGORY_LABELS,
  SERVICE_CATALOG_CLOUD_LABELS,
  SERVICE_CATALOG_ENVIRONMENT_LABELS,
  type ServiceCatalogCategory,
  type ServiceCatalogCloud,
  type ServiceCatalogEnvironment,
  type ServiceCatalogTemplate,
} from './service-catalog.types'
import {
  CATEGORY_HINTS,
  CATEGORY_OPTIONS,
  CATEGORY_PARAM_TEMPLATES,
  CATEGORY_PROVISION_STEPS,
  CATEGORY_DESCRIPTION_TEMPLATES,
  CATEGORY_NAME_SUGGESTIONS,
  CATEGORY_RESOURCE_SUGGESTIONS,
  CATEGORY_TECH_LOGO,
  CLOUD_FULL_LABELS,
  CLOUD_OPTIONS,
  CONTACT_PRESETS,
  COST_PRESETS,
  ENVIRONMENT_OPTIONS,
  OWNER_ICONS,
  OWNER_PRESETS,
  PROVISION_TIME_PRESETS,
  TAG_PRESETS,
  VERSION_PRESETS,
} from './service-catalog.config'
import {
  buildTemplateFromForm,
  mergeTemplateFromForm,
  parseTags,
  parseLines,
  templateToFormValue,
  type ServiceCatalogFormValue,
} from './service-catalog.util'

export type ServiceCatalogFormDialogMode = 'create' | 'edit'

export interface ServiceCatalogFormDialogData {
  mode: ServiceCatalogFormDialogMode
  template?: ServiceCatalogTemplate
}

type FormStep = 'scope' | 'identity' | 'provision' | 'policy'

const STEPS: { id: FormStep; num: string; label: string; icon: string }[] = [
  { id: 'scope', num: '1', label: 'Alcance', icon: 'cloud' },
  { id: 'identity', num: '2', label: 'Identidad', icon: 'badge' },
  { id: 'provision', num: '3', label: 'Aprovisionamiento', icon: 'settings' },
  { id: 'policy', num: '4', label: 'Política', icon: 'policy' },
]

@Component({
  selector: 'app-service-catalog-form-dialog',
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
    <div class="sc-form" [formGroup]="form" [attr.data-cloud]="selectedCloud()">
      <header class="sc-form__head">
        <div class="sc-form__head-main">
          <span class="sc-form__eyebrow">{{ data.mode === 'create' ? 'Catálogo de servicios' : 'Edición de plantilla' }}</span>
          <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Nueva plantilla' : 'Editar plantilla' }}</h2>
        </div>
        <div class="sc-form__head-strip" aria-label="Proveedor seleccionado">
          <app-brand-logo [logo]="selectedCloud()" size="lg" />
          <span class="sc-form__head-tech">
            <app-brand-logo [logo]="categoryTechLogo(selectedCategory())" size="md" />
          </span>
          <span class="sc-form__head-cloud-name">{{ cloudFullLabel(selectedCloud()) }}</span>
        </div>
      </header>

      <div class="sc-form__steps" aria-label="Progreso del formulario">
        @for (s of steps; track s.id; let i = $index) {
          <button
            type="button"
            class="sc-form__step"
            [class.sc-form__step--on]="activeStep() === s.id"
            [class.sc-form__step--done]="stepDone(s.id)"
            (click)="goToStep(s.id)"
          >
            <span class="sc-form__step-num">{{ stepDone(s.id) && activeStep() !== s.id ? '✓' : s.num }}</span>
            <span class="sc-form__step-label">{{ s.label }}</span>
          </button>
        }
      </div>

      <mat-dialog-content class="sc-form__layout">
        <div class="sc-form__main">
          @if (activeStep() === 'scope') {
            <section class="sc-form__panel">
              <header class="sc-form__panel-head">
                <mat-icon>cloud</mat-icon>
                <div>
                  <h3>Alcance</h3>
                  <p>Proveedor, categoría y entorno por defecto</p>
                </div>
              </header>
              <p class="sc-form__label">Proveedor cloud</p>
              <div class="sc-form__clouds" role="radiogroup">
                @for (cloud of clouds; track cloud) {
                  <button
                    type="button"
                    class="sc-form__pick"
                    [class.sc-form__pick--on]="selectedCloud() === cloud"
                    (click)="selectCloud(cloud)"
                  >
                    <app-brand-logo [logo]="cloud" size="lg" />
                    <strong>{{ cloudLabel(cloud) }}</strong>
                  </button>
                }
              </div>
              <p class="sc-form__label">Categoría</p>
              <div class="sc-form__cats">
                @for (cat of categories; track cat) {
                  <button
                    type="button"
                    class="sc-form__cat"
                    [class.sc-form__cat--on]="selectedCategory() === cat"
                    (click)="selectCategory(cat)"
                  >
                    <app-brand-logo [logo]="categoryTechLogo(cat)" size="md" />
                    <span class="sc-form__cat-copy">
                      <strong>{{ categoryLabel(cat) }}</strong>
                      <span>{{ categoryHint(cat) }}</span>
                    </span>
                  </button>
                }
              </div>
              <p class="sc-form__label">Entorno por defecto</p>
              <div class="sc-form__envs">
                @for (env of environments; track env) {
                  <button
                    type="button"
                    class="sc-form__env"
                    [class.sc-form__env--on]="form.get('environment')?.value === env"
                    (click)="form.patchValue({ environment: env })"
                  >
                    {{ envLabel(env) }}
                  </button>
                }
              </div>
            </section>
          }

          @if (activeStep() === 'identity') {
            <section class="sc-form__panel sc-form__fields sc-form__identity">
              <header class="sc-form__panel-head">
                <mat-icon>badge</mat-icon>
                <div>
                  <h3>Identidad</h3>
                  <p>Nombre visible en catálogo, descripción operativa y metadatos de gobierno</p>
                </div>
                <button type="button" class="sc-form__suggest-btn" (click)="applyIdentitySuggestions()">
                  <mat-icon>auto_fix_high</mat-icon>
                  Generar identidad
                </button>
              </header>

              <div class="sc-form__context">
                <app-brand-logo [logo]="selectedCloud()" size="sm" />
                <app-brand-logo [logo]="categoryTechLogo(selectedCategory())" size="sm" />
                <span>{{ cloudLabel(selectedCloud()) }} · {{ categoryLabel(selectedCategory()) }} · {{ envLabel(form.get('environment')?.value) }}</span>
              </div>

              <div class="sc-form__identity-progress">
                <div class="sc-form__identity-progress-bar">
                  <span [style.width.%]="identityProgress().pct"></span>
                </div>
                <span class="sc-form__identity-progress-label">
                  {{ identityProgress().done }}/{{ identityProgress().total }} campos completados
                </span>
              </div>

              <div class="sc-form__identity-grid">
                <div class="sc-form__block">
                  <h4 class="sc-form__block-title">Datos básicos</h4>
                  <mat-form-field appearance="outline" class="sc-form__full">
                    <mat-label>Nombre de la plantilla</mat-label>
                    <input matInput formControlName="name" placeholder="ej. AWS web tier (t3.medium)" maxlength="80" />
                    <mat-hint align="end">{{ nameLength() }}/80</mat-hint>
                  </mat-form-field>
                  @if (form.get('name')?.value) {
                    <p class="sc-form__slug mono">
                      <mat-icon>link</mat-icon>
                      {{ nameSlug() }}
                    </p>
                  }
                  <mat-form-field appearance="outline" class="sc-form__full">
                    <mat-label>Descripción operativa</mat-label>
                    <textarea matInput rows="4" formControlName="description" maxlength="500"></textarea>
                    <mat-hint align="end">{{ descLength() }}/500</mat-hint>
                  </mat-form-field>
                  <button type="button" class="sc-form__desc-btn" (click)="applyDescriptionTemplate()">
                    <mat-icon>description</mat-icon>
                    Usar plantilla {{ categoryLabel(selectedCategory()) }}
                  </button>
                </div>

                <div class="sc-form__identity-side">
                  <div class="sc-form__check-card">
                    <h4>Checklist identidad</h4>
                    <ul>
                      <li [class.sc-form__check--ok]="!!form.get('name')?.value?.trim()">
                        <mat-icon>{{ form.get('name')?.value?.trim() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                        Nombre definido
                      </li>
                      <li [class.sc-form__check--ok]="!!form.get('description')?.value?.trim()">
                        <mat-icon>{{ form.get('description')?.value?.trim() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                        Descripción operativa
                      </li>
                      <li [class.sc-form__check--ok]="!!form.get('owner')?.value?.trim()">
                        <mat-icon>{{ form.get('owner')?.value?.trim() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                        Propietario asignado
                      </li>
                      <li [class.sc-form__check--ok]="previewTags().length > 0">
                        <mat-icon>{{ previewTags().length ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                        Etiquetas (recomendado)
                      </li>
                      <li [class.sc-form__check--ok]="!!form.get('contactEmail')?.value?.trim()">
                        <mat-icon>{{ form.get('contactEmail')?.value?.trim() ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                        Contacto del equipo
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div class="sc-form__block">
                <h4 class="sc-form__block-title">Versión y contacto</h4>
                <div class="sc-form__identity-row">
                  <div>
                    <p class="sc-form__label">Versión</p>
                    <div class="sc-form__presets">
                      @for (v of versionPresets; track v) {
                        <button
                          type="button"
                          class="sc-form__preset"
                          [class.sc-form__preset--on]="form.get('version')?.value === v"
                          (click)="form.patchValue({ version: v })"
                        >
                          {{ v }}
                        </button>
                      }
                    </div>
                    <mat-form-field appearance="outline" class="sc-form__full">
                      <mat-label>Versión semántica</mat-label>
                      <input matInput formControlName="version" class="mono" />
                    </mat-form-field>
                  </div>
                  <div>
                    <p class="sc-form__label">Contacto del equipo</p>
                    <div class="sc-form__presets sc-form__presets--stack">
                      @for (email of contactPresets; track email) {
                        <button
                          type="button"
                          class="sc-form__preset sc-form__preset--email"
                          [class.sc-form__preset--on]="form.get('contactEmail')?.value === email"
                          (click)="form.patchValue({ contactEmail: email })"
                        >
                          <mat-icon>mail</mat-icon>
                          {{ email }}
                        </button>
                      }
                    </div>
                    <mat-form-field appearance="outline" class="sc-form__full">
                      <mat-label>Email de contacto</mat-label>
                      <input matInput formControlName="contactEmail" placeholder="equipo@empresa.com" type="email" />
                    </mat-form-field>
                  </div>
                </div>
              </div>

              <div class="sc-form__block">
                <h4 class="sc-form__block-title">Propietario</h4>
                <p class="sc-form__hint">Equipo responsable del ciclo de vida, revisiones y deprecación</p>
                <div class="sc-form__owner-grid">
                  @for (o of ownerPresets; track o) {
                    <button
                      type="button"
                      class="sc-form__owner-card"
                      [class.sc-form__owner-card--on]="form.get('owner')?.value === o"
                      (click)="form.patchValue({ owner: o })"
                    >
                      <mat-icon>{{ ownerIcon(o) }}</mat-icon>
                      <span>{{ o }}</span>
                    </button>
                  }
                </div>
                <mat-form-field appearance="outline" class="sc-form__full">
                  <mat-label>Otro propietario</mat-label>
                  <input matInput formControlName="owner" placeholder="nombre-del-equipo" />
                </mat-form-field>
              </div>

              <div class="sc-form__block">
                <h4 class="sc-form__block-title">Etiquetas</h4>
                <p class="sc-form__hint">Clic para añadir o quitar · también puedes editarlas en el campo</p>
                <div class="sc-form__presets">
                  @for (tag of tagPresets; track tag) {
                    <button
                      type="button"
                      class="sc-form__preset"
                      [class.sc-form__preset--on]="hasTag(tag)"
                      (click)="handleToggleTag(tag)"
                    >
                      {{ tag }}
                    </button>
                  }
                </div>
                <mat-form-field appearance="outline" class="sc-form__full">
                  <mat-label>Etiquetas</mat-label>
                  <input matInput formControlName="tags" placeholder="web, prod, api" />
                </mat-form-field>
                @if (previewTags().length) {
                  <div class="sc-form__tag-preview">
                    @for (tag of previewTags(); track tag) {
                      <button type="button" class="sc-form__tag-chip" (click)="handleToggleTag(tag)">
                        {{ tag }}
                        <mat-icon>close</mat-icon>
                      </button>
                    }
                  </div>
                }
              </div>
            </section>
          }

          @if (activeStep() === 'provision') {
            <section class="sc-form__panel sc-form__fields">
              <header class="sc-form__panel-head">
                <mat-icon>settings</mat-icon>
                <div>
                  <h3>Aprovisionamiento</h3>
                  <p>Tiempos, coste, parámetros técnicos y recursos que crea la plantilla</p>
                </div>
                <button type="button" class="sc-form__suggest-btn" (click)="applyCategorySuggestions()">
                  <mat-icon>auto_fix_high</mat-icon>
                  Sugerencias {{ categoryLabel(selectedCategory()) }}
                </button>
              </header>

              <div class="sc-form__block">
                <h4 class="sc-form__block-title">Tiempos y coste</h4>
                <p class="sc-form__label">Duración estimada</p>
                <div class="sc-form__presets">
                  @for (t of provisionTimePresets; track t) {
                    <button
                      type="button"
                      class="sc-form__preset"
                      [class.sc-form__preset--on]="form.get('avgProvision')?.value === t"
                      (click)="form.patchValue({ avgProvision: t })"
                    >
                      {{ t }}
                    </button>
                  }
                </div>
                <p class="sc-form__label">Coste mensual estimado</p>
                <div class="sc-form__presets">
                  @for (c of costPresets; track c) {
                    <button
                      type="button"
                      class="sc-form__preset"
                      [class.sc-form__preset--on]="form.get('estimatedCost')?.value === c"
                      (click)="form.patchValue({ estimatedCost: c })"
                    >
                      {{ c }}
                    </button>
                  }
                </div>
                <div class="sc-form__row">
                  <mat-form-field appearance="outline">
                    <mat-label>Tiempo de aprovisionado</mat-label>
                    <input matInput formControlName="avgProvision" placeholder="10 min" />
                    <mat-hint>Desde el lanzamiento hasta recurso listo</mat-hint>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Coste estimado</mat-label>
                    <input matInput formControlName="estimatedCost" placeholder="~$120/mes" />
                    <mat-hint>Referencia para FinOps y aprobaciones</mat-hint>
                  </mat-form-field>
                </div>
              </div>

              <div class="sc-form__block">
                <h4 class="sc-form__block-title">Parámetros por defecto</h4>
                <p class="sc-form__hint">Variables KEY=value aplicadas en cada lanzamiento si no se sobrescriben</p>
                <div class="sc-form__code-wrap">
                  <textarea
                    class="sc-form__code mono"
                    rows="5"
                    formControlName="parameters"
                    placeholder="INSTANCE_TYPE=t3.medium&#10;MIN_SIZE=2"
                  ></textarea>
                </div>
              </div>

              <div class="sc-form__block">
                <h4 class="sc-form__block-title">Recursos creados</h4>
                <p class="sc-form__hint">Un recurso por línea · clic para añadir sugerencias</p>
                <div class="sc-form__presets sc-form__presets--wrap">
                  @for (r of resourceSuggestions(); track r) {
                    <button type="button" class="sc-form__preset sc-form__preset--add" (click)="handleAddResource(r)">
                      <mat-icon>add</mat-icon>
                      {{ r }}
                    </button>
                  }
                </div>
                <mat-form-field appearance="outline" class="sc-form__full">
                  <mat-label>Recursos (uno por línea)</mat-label>
                  <textarea matInput rows="4" formControlName="resourcesCreated"></textarea>
                </mat-form-field>
              </div>

              <div class="sc-form__block">
                <h4 class="sc-form__block-title">Pasos de aprovisionamiento</h4>
                <p class="sc-form__hint">Secuencia operativa que verá el usuario en el detalle y en el lanzamiento</p>
                <mat-form-field appearance="outline" class="sc-form__full">
                  <mat-label>Pasos (uno por línea)</mat-label>
                  <textarea matInput rows="4" formControlName="provisionSteps"></textarea>
                </mat-form-field>
              </div>

              <div class="sc-form__block">
                <h4 class="sc-form__block-title">Documentación</h4>
                <mat-form-field appearance="outline" class="sc-form__full">
                  <mat-label>URL documentación</mat-label>
                  <input matInput formControlName="documentationUrl" placeholder="https://wiki…/plantilla" />
                  <mat-hint>Runbook, wiki interna o README del módulo</mat-hint>
                </mat-form-field>
              </div>
            </section>
          }

          @if (activeStep() === 'policy') {
            <section class="sc-form__panel sc-form__fields">
              <header class="sc-form__panel-head">
                <mat-icon>policy</mat-icon>
                <div>
                  <h3>Política</h3>
                  <p>Aprobaciones, visibilidad y resumen final</p>
                </div>
              </header>
              <div class="sc-form__toggles">
                <mat-slide-toggle formControlName="requiresApproval">Requiere aprobación para lanzar</mat-slide-toggle>
                @if (data.mode === 'create') {
                  <mat-slide-toggle formControlName="publishNow">Publicar al guardar (visible en catálogo)</mat-slide-toggle>
                }
              </div>
              <div class="sc-form__review">
                <h3>Resumen</h3>
                <ul>
                  <li><strong>{{ form.get('name')?.value || 'Sin nombre' }}</strong></li>
                  <li>{{ cloudLabel(selectedCloud()) }} · {{ categoryLabel(selectedCategory()) }} · {{ envLabel(form.get('environment')?.value) }}</li>
                  <li>{{ form.get('version')?.value }} · {{ form.get('owner')?.value }} · {{ form.get('avgProvision')?.value }}</li>
                  @if (form.get('estimatedCost')?.value) {
                    <li>Coste: {{ form.get('estimatedCost')?.value }}</li>
                  }
                  @if (linesFrom(form.get('resourcesCreated')?.value ?? '').length) {
                    <li>{{ linesFrom(form.get('resourcesCreated')?.value ?? '').length }} recurso(s) definidos</li>
                  }
                  @if (linesFrom(form.get('provisionSteps')?.value ?? '').length) {
                    <li>{{ linesFrom(form.get('provisionSteps')?.value ?? '').length }} pasos de aprovisionamiento</li>
                  }
                  @if (form.get('requiresApproval')?.value) {
                    <li>Requiere aprobación antes del lanzamiento</li>
                  }
                </ul>
              </div>
            </section>
          }
        </div>

        <aside class="sc-form__aside">
          <div class="sc-form__aside-card">
            <div class="sc-form__aside-hero">
            <app-brand-logo [logo]="selectedCloud()" size="xl" />
            <span class="sc-form__aside-tech">
              <app-brand-logo [logo]="categoryTechLogo(selectedCategory())" size="md" />
            </span>
          </div>
          <p class="sc-form__aside-provider">{{ cloudFullLabel(selectedCloud()) }}</p>
          <span class="sc-form__aside-label">Vista previa</span>
          <strong class="sc-form__aside-name">{{ form.get('name')?.value || 'Sin nombre' }}</strong>
          <p class="sc-form__aside-desc">{{ form.get('description')?.value || 'Descripción de la plantilla…' }}</p>
          <div class="sc-form__aside-chips">
            <span class="sc-form__chip">{{ cloudLabel(selectedCloud()) }}</span>
            <span class="sc-form__chip">{{ categoryLabel(selectedCategory()) }}</span>
            <span class="sc-form__chip">{{ envLabel(form.get('environment')?.value) }}</span>
          </div>
          @if (previewTags().length) {
            <div class="sc-form__aside-tags">
              @for (tag of previewTags(); track tag) {
                <span class="sc-form__tag">{{ tag }}</span>
              }
            </div>
          }
          <ul class="sc-form__aside-rows">
            <li><span>Versión</span><strong class="mono">{{ form.get('version')?.value }}</strong></li>
            <li><span>Provisionado</span><strong>{{ form.get('avgProvision')?.value }}</strong></li>
            <li><span>Coste est.</span><strong>{{ form.get('estimatedCost')?.value || '—' }}</strong></li>
            <li><span>Propietario</span><strong>{{ form.get('owner')?.value }}</strong></li>
            @if (form.get('contactEmail')?.value) {
              <li><span>Contacto</span><strong>{{ form.get('contactEmail')?.value }}</strong></li>
            }
            <li><span>Aprobación</span><strong>{{ form.get('requiresApproval')?.value ? 'Requerida' : 'No' }}</strong></li>
          </ul>
          <ul class="sc-form__checklist">
            <li [class.sc-form__check--ok]="!!form.get('name')?.value">
              <mat-icon>{{ form.get('name')?.value ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              Nombre definido
            </li>
            <li [class.sc-form__check--ok]="!!form.get('description')?.value">
              <mat-icon>{{ form.get('description')?.value ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              Descripción
            </li>
            <li [class.sc-form__check--ok]="!!form.get('avgProvision')?.value">
              <mat-icon>{{ form.get('avgProvision')?.value ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              Tiempo de provisionado
            </li>
            <li [class.sc-form__check--ok]="form.valid">
              <mat-icon>{{ form.valid ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
              Listo para guardar
            </li>
          </ul>
          </div>
        </aside>
      </mat-dialog-content>

      <mat-dialog-actions class="sc-form__actions">
        <div class="sc-form__nav">
          @if (stepIndex() > 0) {
            <button type="button" mat-stroked-button (click)="prevStep()">
              <mat-icon>chevron_left</mat-icon>
              Anterior
            </button>
          }
          @if (stepIndex() < steps.length - 1) {
            <button type="button" mat-stroked-button (click)="nextStep()">
              Siguiente
              <mat-icon>chevron_right</mat-icon>
            </button>
          }
        </div>
        <div class="sc-form__actions-right">
          <button mat-button type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button color="primary" type="button" [disabled]="!form.valid" (click)="handleSave()">
            <mat-icon>{{ data.mode === 'create' ? 'add' : 'save' }}</mat-icon>
            {{ data.mode === 'create' ? 'Crear plantilla' : 'Guardar' }}
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
    }
    .sc-form {
      --sc-accent: #64748b;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      color: #0f172a;
    }
    .sc-form[data-cloud='aws'] { --sc-accent: #ff9900; }
    .sc-form[data-cloud='gcp'] { --sc-accent: #4285f4; }
    .sc-form[data-cloud='azure'] { --sc-accent: #0078d4; }
    .sc-form__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1.15rem 0.75rem;
      background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
      border-bottom: 1px solid #f1f5f9;
      position: relative;
      flex-shrink: 0;
    }
    .sc-form__head::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--sc-accent), transparent 70%);
      opacity: 0.55;
    }
    .sc-form__head-main { min-width: 0; }
    .sc-form__eyebrow {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sc-form__head h2 {
      margin: 0.12rem 0 0;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.015em;
    }
    .sc-form__head-strip {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-shrink: 0;
      padding: 0.45rem 0.65rem;
      border-radius: 11px;
      background: #fff;
      box-shadow: inset 0 0 0 1px #e2e8f0;
    }
    .sc-form__head-tech {
      display: flex;
      padding: 0.18rem;
      border-radius: 7px;
      background: #f8fafc;
    }
    .sc-form__head-cloud-name {
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      max-width: 9rem;
      line-height: 1.3;
    }
    .sc-form__steps {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      flex-shrink: 0;
      background: #fafbfc;
      border-bottom: 1px solid #f1f5f9;
    }
    .sc-form__step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      padding: 0.55rem 0.35rem;
      border: none;
      border-right: 1px solid #f1f5f9;
      background: transparent;
      font: inherit;
      cursor: pointer;
      transition: background 0.15s;
    }
    .sc-form__step:last-child { border-right: none; }
    .sc-form__step:hover { background: rgb(255 255 255 / 0.7); }
    .sc-form__step-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.35rem;
      height: 1.35rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 700;
      background: #e2e8f0;
      color: #64748b;
      transition: background 0.15s, color 0.15s;
    }
    .sc-form__step-label {
      font-size: 0.62rem;
      font-weight: 600;
      color: #94a3b8;
      text-align: center;
    }
    .sc-form__step--on { background: #fff; }
    .sc-form__step--on .sc-form__step-num {
      background: var(--sc-accent);
      color: #fff;
    }
    .sc-form__step--on .sc-form__step-label { color: #0f172a; }
    .sc-form__step--done:not(.sc-form__step--on) .sc-form__step-num {
      background: #334155;
      color: #fff;
    }
    .sc-form__step--done:not(.sc-form__step--on) .sc-form__step-label { color: #475569; }
    .sc-form__layout {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 240px;
      gap: 0;
      flex: 1;
      min-height: 0;
      max-height: none;
      padding: 0 !important;
      overflow: hidden;
    }
    .sc-form__main {
      padding: 0.75rem 1rem;
      overflow-y: auto;
      scrollbar-width: thin;
      background: #fff;
      min-height: 0;
    }
    .sc-form__panel {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .sc-form__panel-head {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      margin-bottom: 0.55rem;
      padding-bottom: 0.55rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .sc-form__panel-head > div { flex: 1; min-width: 0; }
    .sc-form__panel-head mat-icon {
      flex-shrink: 0;
      margin-top: 0.1rem;
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
      color: var(--sc-accent);
    }
    .sc-form__panel-head h3 {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .sc-form__panel-head p {
      margin: 0.12rem 0 0;
      font-size: 0.68rem;
      color: #64748b;
      line-height: 1.4;
    }
    .sc-form__suggest-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      padding: 0.35rem 0.55rem;
      border: none;
      border-radius: 8px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: background 0.12s;
    }
    .sc-form__suggest-btn:hover { background: #e2e8f0; }
    .sc-form__suggest-btn mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
      color: var(--sc-accent);
    }
    .sc-form__block {
      margin-bottom: 0.75rem;
      padding-bottom: 0.65rem;
      border-bottom: 1px solid #f8fafc;
    }
    .sc-form__block:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    .sc-form__block-title {
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #1e293b;
    }
    .sc-form__hint {
      margin: 0 0 0.35rem;
      font-size: 0.65rem;
      color: #94a3b8;
      line-height: 1.4;
    }
    .sc-form__presets {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-bottom: 0.4rem;
    }
    .sc-form__presets--wrap { margin-bottom: 0.45rem; }
    .sc-form__preset {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.18rem 0.42rem;
      border: none;
      border-radius: 999px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: background 0.12s, color 0.12s;
    }
    .sc-form__preset mat-icon {
      font-size: 0.75rem;
      width: 0.75rem;
      height: 0.75rem;
    }
    .sc-form__preset:hover { background: #e2e8f0; color: #334155; }
    .sc-form__preset--on {
      background: var(--sc-accent);
      color: #fff;
    }
    .sc-form__preset--add {
      border-radius: 8px;
      background: #f8fafc;
      box-shadow: inset 0 0 0 1px #e2e8f0;
    }
    .sc-form__preset--add:hover {
      background: #fff;
      box-shadow: inset 0 0 0 1px var(--sc-accent);
      color: #0f172a;
    }
    .sc-form__tag-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 0.22rem;
      margin-top: -0.15rem;
    }
    .sc-form__tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0.12rem 0.28rem 0.12rem 0.4rem;
      border: none;
      border-radius: 999px;
      font: inherit;
      font-size: 0.6rem;
      font-weight: 600;
      background: #e2e8f0;
      color: #475569;
      cursor: pointer;
      transition: background 0.12s;
    }
    .sc-form__tag-chip:hover { background: #cbd5e1; }
    .sc-form__tag-chip mat-icon {
      font-size: 0.7rem;
      width: 0.7rem;
      height: 0.7rem;
    }
    .sc-form__context {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.55rem;
      padding: 0.4rem 0.55rem;
      border-radius: 9px;
      background: #f8fafc;
      font-size: 0.68rem;
      font-weight: 600;
      color: #475569;
    }
    .sc-form__identity-progress {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      margin-bottom: 0.65rem;
    }
    .sc-form__identity-progress-bar {
      flex: 1;
      height: 4px;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .sc-form__identity-progress-bar span {
      display: block;
      height: 100%;
      background: var(--sc-accent);
      border-radius: 999px;
      transition: width 0.2s;
    }
    .sc-form__identity-progress-label {
      flex-shrink: 0;
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
    }
    .sc-form__identity-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 200px;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .sc-form__identity-side { min-width: 0; }
    .sc-form__check-card {
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: #f8fafc;
      box-shadow: inset 0 0 0 1px #e2e8f0;
      position: sticky;
      top: 0;
    }
    .sc-form__check-card h4 {
      margin: 0 0 0.4rem;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .sc-form__check-card ul {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.64rem;
    }
    .sc-form__check-card li {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      padding: 0.18rem 0;
      color: #94a3b8;
    }
    .sc-form__check-card mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .sc-form__slug {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      margin: -0.15rem 0 0.35rem;
      padding: 0.28rem 0.4rem;
      border-radius: 6px;
      background: #f8fafc;
      font-size: 0.62rem;
      color: #64748b;
    }
    .sc-form__slug mat-icon {
      font-size: 0.75rem;
      width: 0.75rem;
      height: 0.75rem;
    }
    .sc-form__desc-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      margin-top: 0.15rem;
      padding: 0.32rem 0.5rem;
      border: none;
      border-radius: 8px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
    .sc-form__desc-btn:hover { background: #e2e8f0; }
    .sc-form__desc-btn mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
      color: var(--sc-accent);
    }
    .sc-form__identity-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .sc-form__presets--stack {
      flex-direction: column;
      align-items: stretch;
    }
    .sc-form__preset--email {
      justify-content: flex-start;
      border-radius: 8px;
      text-align: left;
    }
    .sc-form__preset--email mat-icon {
      font-size: 0.8rem;
      width: 0.8rem;
      height: 0.8rem;
    }
    .sc-form__owner-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.35rem;
      margin-bottom: 0.4rem;
    }
    .sc-form__owner-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.45rem 0.35rem;
      border: none;
      border-radius: 10px;
      background: #f8fafc;
      font: inherit;
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      box-shadow: inset 0 0 0 1px #e2e8f0;
      transition: background 0.12s, box-shadow 0.12s;
    }
    .sc-form__owner-card mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #94a3b8;
    }
    .sc-form__owner-card--on {
      background: #fff;
      color: #0f172a;
      box-shadow: inset 0 0 0 2px var(--sc-accent);
    }
    .sc-form__owner-card--on mat-icon { color: var(--sc-accent); }
    .sc-form__code-wrap {
      border-radius: 10px;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px #e2e8f0;
    }
    .sc-form__code {
      display: block;
      width: 100%;
      padding: 0.55rem 0.65rem;
      border: none;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.68rem;
      line-height: 1.5;
      resize: vertical;
      min-height: 6rem;
      box-sizing: border-box;
    }
    .sc-form__code:focus {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--sc-accent);
    }
    .sc-form__label {
      margin: 0.35rem 0 0.25rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sc-form__label:first-child { margin-top: 0; }
    .sc-form__clouds {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.4rem;
    }
    .sc-form__pick {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.32rem;
      padding: 0.65rem 0.45rem;
      border: none;
      border-radius: 12px;
      background: #f8fafc;
      font: inherit;
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
      box-shadow: inset 0 0 0 1px #e2e8f0;
    }
    .sc-form__pick strong { font-size: 0.68rem; font-weight: 650; color: #334155; }
    .sc-form__pick:hover { background: #f1f5f9; transform: translateY(-1px); }
    .sc-form__pick--on {
      background: #fff;
      box-shadow: inset 0 0 0 2px var(--sc-accent), 0 4px 12px rgb(15 23 42 / 0.06);
    }
    .sc-form__pick--on strong { color: #0f172a; }
    .sc-form__cats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.32rem;
    }
    .sc-form__cat {
      display: flex;
      gap: 0.35rem;
      align-items: center;
      padding: 0.45rem 0.5rem;
      border: none;
      border-radius: 11px;
      background: #f8fafc;
      text-align: left;
      font: inherit;
      cursor: pointer;
      box-shadow: inset 0 0 0 1px #e2e8f0;
      transition: background 0.12s, box-shadow 0.12s;
    }
    .sc-form__cat--on {
      background: #fff;
      box-shadow: inset 0 0 0 2px var(--sc-accent);
    }
    .sc-form__cat-copy strong { font-size: 0.7rem; display: block; }
    .sc-form__cat-copy span { font-size: 0.6rem; color: #64748b; line-height: 1.3; }
    .sc-form__envs {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    .sc-form__env {
      padding: 0.2rem 0.48rem;
      border: none;
      border-radius: 999px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .sc-form__env--on {
      background: var(--sc-accent);
      color: #fff;
    }
    .sc-form__fields { display: flex; flex-direction: column; gap: 0.15rem; }
    .sc-form__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem;
    }
    .sc-form__full { width: 100%; }
    .sc-form__owners {
      display: flex;
      flex-wrap: wrap;
      gap: 0.22rem;
      margin-bottom: 0.1rem;
    }
    .sc-form__owner {
      padding: 0.16rem 0.4rem;
      border: none;
      border-radius: 999px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .sc-form__owner--on {
      background: var(--sc-accent);
      color: #fff;
    }
    .sc-form__toggles {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .sc-form__review {
      margin-top: 0.5rem;
      padding: 0.55rem 0.65rem;
      border-radius: 10px;
      background: #f8fafc;
      box-shadow: inset 0 0 0 1px #e2e8f0;
    }
    .sc-form__review h3 {
      margin: 0 0 0.3rem;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .sc-form__review ul {
      margin: 0;
      padding-left: 1rem;
      font-size: 0.72rem;
      line-height: 1.5;
    }
    .sc-form__aside {
      padding: 0.75rem 0.8rem;
      background: #fafbfc;
      border-left: 1px solid #f1f5f9;
      overflow-y: auto;
      scrollbar-width: thin;
      min-height: 0;
    }
    .sc-form__aside-card {
      padding: 0.65rem;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 1px 4px rgb(15 23 42 / 0.05);
    }
    .sc-form__aside-hero {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 0.35rem;
      width: 5rem;
      height: 5rem;
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 2px 8px rgb(15 23 42 / 0.06);
    }
    .sc-form__aside-tech {
      position: absolute;
      right: -0.35rem;
      bottom: -0.35rem;
      display: flex;
      padding: 0.22rem;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 2px 6px rgb(15 23 42 / 0.1);
    }
    .sc-form__aside-provider {
      margin: 0 0 0.45rem;
      font-size: 0.62rem;
      font-weight: 600;
      text-align: center;
      color: #64748b;
    }
    .sc-form__aside-label {
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sc-form__aside-name {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.82rem;
      line-height: 1.35;
    }
    .sc-form__aside-desc {
      margin: 0.22rem 0 0.4rem;
      font-size: 0.67rem;
      color: #64748b;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sc-form__aside-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.22rem;
      margin-bottom: 0.35rem;
    }
    .sc-form__chip {
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      font-size: 0.6rem;
      font-weight: 650;
      background: #e2e8f0;
      color: #475569;
    }
    .sc-form__aside-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.2rem;
      margin-bottom: 0.4rem;
    }
    .sc-form__tag {
      padding: 0.08rem 0.35rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #64748b;
    }
    .sc-form__aside-rows {
      list-style: none;
      margin: 0 0 0.45rem;
      padding: 0;
      font-size: 0.65rem;
    }
    .sc-form__aside-rows li {
      display: flex;
      justify-content: space-between;
      gap: 0.35rem;
      padding: 0.15rem 0;
    }
    .sc-form__aside-rows span { color: #94a3b8; }
    .sc-form__checklist {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.65rem;
    }
    .sc-form__checklist li {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: #94a3b8;
      padding: 0.12rem 0;
    }
    .sc-form__checklist mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .sc-form__check--ok { color: #059669; }
    .sc-form__actions {
      display: flex !important;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 1.15rem !important;
      border-top: 1px solid #e2e8f0;
      background: #fff;
      flex-shrink: 0;
    }
    .sc-form__nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .sc-form__actions-right {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-left: auto;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
    @media (max-width: 820px) {
      .sc-form__layout { grid-template-columns: 1fr; }
      .sc-form__identity-grid { grid-template-columns: 1fr; }
      .sc-form__identity-row { grid-template-columns: 1fr; }
      .sc-form__owner-grid { grid-template-columns: 1fr 1fr; }
      .sc-form__check-card { position: static; }
      .sc-form__aside { border-left: none; border-top: 1px solid #f1f5f9; max-height: 12rem; }
      .sc-form__head { flex-wrap: wrap; }
      .sc-form__head-strip { width: 100%; justify-content: center; }
      .sc-form__cats { grid-template-columns: 1fr 1fr; }
      .sc-form__actions { flex-direction: column; align-items: stretch; }
      .sc-form__actions-right { margin-left: 0; justify-content: flex-end; }
    }
    @media (max-width: 520px) {
      .sc-form__clouds { grid-template-columns: 1fr; }
      .sc-form__cats { grid-template-columns: 1fr; }
    }
  `,
})
export class ServiceCatalogFormDialogComponent {
  readonly data = inject<ServiceCatalogFormDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<ServiceCatalogFormDialogComponent, ServiceCatalogTemplate>)
  private readonly fb = inject(FormBuilder)

  readonly steps = STEPS
  readonly clouds = CLOUD_OPTIONS
  readonly categories = CATEGORY_OPTIONS
  readonly ownerPresets = OWNER_PRESETS
  readonly versionPresets = VERSION_PRESETS
  readonly tagPresets = TAG_PRESETS
  readonly contactPresets = CONTACT_PRESETS
  readonly provisionTimePresets = PROVISION_TIME_PRESETS
  readonly costPresets = COST_PRESETS
  readonly environments = ENVIRONMENT_OPTIONS
  readonly activeStep = signal<FormStep>('scope')

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', Validators.maxLength(500)],
    category: ['instance' as ServiceCatalogCategory, Validators.required],
    cloud: ['aws' as ServiceCatalogCloud, Validators.required],
    environment: ['staging' as ServiceCatalogEnvironment, Validators.required],
    version: ['v1.0', Validators.required],
    owner: ['platform-team', Validators.required],
    contactEmail: [''],
    tags: [''],
    avgProvision: ['10 min', Validators.required],
    estimatedCost: [''],
    parameters: [''],
    documentationUrl: [''],
    resourcesCreated: [''],
    provisionSteps: [CATEGORY_PROVISION_STEPS.instance.join('\n')],
    requiresApproval: [false],
    publishNow: [false],
  })

  stepIndex = computed(() => this.steps.findIndex((s) => s.id === this.activeStep()))

  constructor() {
    if (this.data.mode === 'edit' && this.data.template) {
      this.form.patchValue(templateToFormValue(this.data.template))
      return
    }
    this.form.patchValue({
      provisionSteps: CATEGORY_PROVISION_STEPS.instance.join('\n'),
    })
  }

  nameLength = (): number => this.form.get('name')?.value?.length ?? 0
  descLength = (): number => this.form.get('description')?.value?.length ?? 0
  resourceSuggestions = (): string[] => CATEGORY_RESOURCE_SUGGESTIONS[this.selectedCategory()]

  nameSlug = (): string => {
    const name = this.form.get('name')?.value?.trim()
    if (!name) return 'sin-nombre'
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48)
  }

  identityProgress = (): { done: number; total: number; pct: number } => {
    const v = this.form.getRawValue()
    let done = 0
    if (v.name?.trim()) done++
    if (v.description?.trim()) done++
    if (v.owner?.trim()) done++
    if (parseTags(v.tags).length) done++
    if (v.contactEmail?.trim()) done++
    const total = 5
    return { done, total, pct: (done / total) * 100 }
  }

  ownerIcon = (owner: string): string => OWNER_ICONS[owner] ?? 'group'

  applyDescriptionTemplate = (): void => {
    const desc = CATEGORY_DESCRIPTION_TEMPLATES[this.selectedCategory()]
      .replace('{cloud}', this.cloudLabel(this.selectedCloud()))
      .replace('{env}', this.envLabel(this.form.get('environment')?.value))
    this.form.patchValue({ description: desc })
  }

  applyIdentitySuggestions = (): void => {
    const cat = this.selectedCategory()
    const cloud = this.selectedCloud()
    const env = this.form.get('environment')?.value ?? 'staging'
    const envTag = env === 'production' ? 'prod' : env === 'development' ? 'dev' : 'staging'
    const name = CATEGORY_NAME_SUGGESTIONS[cat][cloud]
    const description = CATEGORY_DESCRIPTION_TEMPLATES[cat]
      .replace('{cloud}', this.cloudLabel(cloud))
      .replace('{env}', this.envLabel(env))
    const tags = [envTag, cat === 'instance' ? 'web' : cat].join(', ')
    this.form.patchValue({
      name,
      description,
      tags,
      contactEmail: CONTACT_PRESETS[0],
    })
  }

  hasTag = (tag: string): boolean => this.previewTags().includes(tag)

  handleToggleTag = (tag: string): void => {
    const current = parseTags(this.form.get('tags')?.value ?? '')
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    this.form.patchValue({ tags: next.join(', ') })
  }

  handleAddResource = (resource: string): void => {
    const lines = parseLines(this.form.get('resourcesCreated')?.value ?? '')
    if (lines.includes(resource)) return
    this.form.patchValue({ resourcesCreated: [...lines, resource].join('\n') })
  }

  applyCategorySuggestions = (): void => {
    const cat = this.selectedCategory()
    this.form.patchValue({
      parameters: CATEGORY_PARAM_TEMPLATES[cat],
      provisionSteps: CATEGORY_PROVISION_STEPS[cat].join('\n'),
      resourcesCreated: CATEGORY_RESOURCE_SUGGESTIONS[cat].slice(0, 3).join('\n'),
    })
  }

  selectedCloud = (): ServiceCatalogCloud => this.form.get('cloud')?.value ?? 'aws'
  selectedCategory = (): ServiceCatalogCategory => this.form.get('category')?.value ?? 'instance'
  cloudLabel = (c: ServiceCatalogCloud): string => SERVICE_CATALOG_CLOUD_LABELS[c]
  cloudFullLabel = (c: ServiceCatalogCloud): string => CLOUD_FULL_LABELS[c]
  categoryLabel = (c: ServiceCatalogCategory): string => SERVICE_CATALOG_CATEGORY_LABELS[c]
  categoryHint = (c: ServiceCatalogCategory): string => CATEGORY_HINTS[c]
  envLabel = (e: ServiceCatalogEnvironment | null | undefined): string =>
    e ? SERVICE_CATALOG_ENVIRONMENT_LABELS[e] : '—'
  categoryTechLogo = (c: ServiceCatalogCategory): NavLogoKey => CATEGORY_TECH_LOGO[c]
  previewTags = (): string[] => parseTags(this.form.get('tags')?.value ?? '')
  linesFrom = (raw: string): string[] => parseLines(raw)

  selectCloud = (cloud: ServiceCatalogCloud): void => {
    this.form.patchValue({ cloud })
  }

  selectCategory = (category: ServiceCatalogCategory): void => {
    this.form.patchValue({ category })
  }

  stepDone = (id: FormStep): boolean => {
    const idx = this.steps.findIndex((s) => s.id === id)
    return idx >= 0 && idx < this.stepIndex()
  }

  goToStep = (id: FormStep): void => {
    this.activeStep.set(id)
  }

  prevStep = (): void => {
    const idx = this.stepIndex()
    if (idx > 0) this.activeStep.set(this.steps[idx - 1].id)
  }

  nextStep = (): void => {
    const idx = this.stepIndex()
    if (idx < this.steps.length - 1) this.activeStep.set(this.steps[idx + 1].id)
  }

  handleSave = (): void => {
    if (!this.form.valid) return
    const raw = this.form.getRawValue() as ServiceCatalogFormValue
    if (this.data.mode === 'edit' && this.data.template) {
      this.dialogRef.close(mergeTemplateFromForm(this.data.template, raw))
      return
    }
    this.dialogRef.close(buildTemplateFromForm(raw))
  }
}
