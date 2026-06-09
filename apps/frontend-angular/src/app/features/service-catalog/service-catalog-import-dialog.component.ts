import { Component, inject, signal } from '@angular/core'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import type { ServiceCatalogTemplate } from './service-catalog.types'
import { CATEGORY_TECH_LOGO } from './service-catalog.config'
import { buildTemplateFromImport, type ServiceCatalogImportPayload } from './service-catalog.util'

@Component({
  selector: 'app-service-catalog-import-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, BrandLogoComponent],
  template: `
    <header class="sc-import__head">
      <div>
        <span class="sc-import__eyebrow">Catálogo</span>
        <h2 mat-dialog-title>Importar plantilla</h2>
      </div>
      <div class="sc-import__logos" aria-hidden="true">
        <app-brand-logo logo="aws" size="sm" />
        <app-brand-logo logo="gcp" size="sm" />
        <app-brand-logo logo="azure" size="sm" />
      </div>
    </header>
    <mat-dialog-content>
      <p class="sc-import__hint">
        Sube un archivo JSON con la definición de la plantilla (nombre, categoría, cloud, versión, tags…).
      </p>
      <label class="sc-import__drop">
        <input
          type="file"
          accept=".json,application/json"
          class="sc-import__input"
          (change)="handleFileChange($event)"
          aria-label="Archivo JSON de plantilla"
        />
        <mat-icon>upload_file</mat-icon>
        <span>{{ fileName() || 'Seleccionar archivo JSON…' }}</span>
      </label>
      @if (parseError()) {
        <p class="sc-import__error" role="alert">{{ parseError() }}</p>
      }
      @if (preview(); as p) {
        <div class="sc-import__preview">
          <div class="sc-import__preview-logos">
            @if (p.cloud) {
              <app-brand-logo [logo]="p.cloud" size="md" />
            }
            @if (p.category) {
              <app-brand-logo [logo]="categoryLogo(p.category)" size="sm" />
            }
          </div>
          <div>
            <strong>{{ p.name }}</strong>
            <span>{{ p.category ?? '—' }} · {{ p.cloud ?? '—' }} · {{ p.version ?? 'v1.0' }}</span>
            @if (p.description) {
              <p>{{ p.description }}</p>
            }
          </div>
        </div>
      }
      <button type="button" class="sc-import__demo" (click)="loadDemoTemplate()">
        <mat-icon>description</mat-icon>
        Usar plantilla demo (JSON)
      </button>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!payload()" (click)="confirm()">
        <mat-icon>upload</mat-icon>
        Importar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host { display: block; font-size: 0.8125rem; color: #0f172a; }
    .sc-import__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.65rem 1rem 0;
    }
    .sc-import__eyebrow {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sc-import__head h2 {
      margin: 0.1rem 0 0;
      font-size: 0.95rem;
      font-weight: 700;
    }
    .sc-import__logos {
      display: flex;
      gap: 0.25rem;
    }
    .sc-import__hint {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.45;
    }
    .sc-import__drop {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: #f8fafc;
      cursor: pointer;
      font-size: 0.75rem;
    }
    .sc-import__input { display: none; }
    .sc-import__error {
      margin: 0.5rem 0 0;
      font-size: 0.72rem;
      color: #b91c1c;
    }
    .sc-import__preview {
      display: flex;
      gap: 0.55rem;
      margin-top: 0.65rem;
      padding: 0.55rem 0.6rem;
      border-radius: 8px;
      background: #f8fafc;
    }
    .sc-import__preview-logos {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .sc-import__preview strong {
      display: block;
      font-size: 0.78rem;
    }
    .sc-import__preview span {
      display: block;
      margin-top: 0.1rem;
      font-size: 0.65rem;
      color: #64748b;
      text-transform: capitalize;
    }
    .sc-import__preview p {
      margin: 0.25rem 0 0;
      font-size: 0.68rem;
      color: #64748b;
      line-height: 1.4;
    }
    .sc-import__demo {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      margin-top: 0.75rem;
      padding: 0.35rem 0.55rem;
      border: none;
      border-radius: 8px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      color: #334155;
    }
  `,
})
export class ServiceCatalogImportDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<ServiceCatalogImportDialogComponent, ServiceCatalogTemplate>,
  )

  readonly fileName = signal('')
  readonly parseError = signal('')
  readonly preview = signal<ServiceCatalogImportPayload | null>(null)
  readonly payload = signal<ServiceCatalogImportPayload | null>(null)

  categoryLogo = (category: string): NavLogoKey =>
    CATEGORY_TECH_LOGO[category as keyof typeof CATEGORY_TECH_LOGO] ?? 'aws'

  handleFileChange = (ev: Event): void => {
    const input = ev.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    this.fileName.set(file.name)
    const reader = new FileReader()
    reader.onload = () => this.parseContent(String(reader.result ?? ''), file.name)
    reader.onerror = () => {
      this.parseError.set('No se pudo leer el archivo')
      this.payload.set(null)
      this.preview.set(null)
    }
    reader.readAsText(file)
  }

  loadDemoTemplate = (): void => {
    const demo: ServiceCatalogImportPayload = {
      name: 'Plantilla importada (demo)',
      description: 'Stack nginx + sidecar cargado desde JSON demo para validar el flujo de importación.',
      category: 'docker',
      cloud: 'gcp',
      version: 'v1.0',
      owner: 'devops',
      tags: ['import', 'demo', 'nginx'],
      avgProvision: '6 min',
      requiresApproval: false,
    }
    this.fileName.set('demo-template.json')
    this.preview.set(demo)
    this.payload.set(demo)
    this.parseError.set('')
  }

  confirm = (): void => {
    const p = this.payload()
    if (!p) return
    this.dialogRef.close(buildTemplateFromImport(p))
  }

  private parseContent = (text: string, name: string): void => {
    try {
      const raw = JSON.parse(text) as ServiceCatalogImportPayload
      if (!raw.name?.trim()) {
        this.parseError.set('El JSON debe incluir un campo «name»')
        this.payload.set(null)
        this.preview.set(null)
        return
      }
      this.parseError.set('')
      this.preview.set(raw)
      this.payload.set(raw)
      this.fileName.set(name)
    } catch {
      this.parseError.set('JSON no válido — revisa el formato del archivo')
      this.payload.set(null)
      this.preview.set(null)
    }
  }
}
