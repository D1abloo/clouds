import { Component, inject, signal } from '@angular/core'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import type { Runbook } from './runbooks.demo'

export interface RunbookImportPayload {
  name: string
  description?: string
  category?: string
  linkedTo?: string
  owner?: string
  tags?: string[]
  steps?: { title: string; type?: string; command?: string }[]
}

@Component({
  selector: 'app-runbook-import-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Importar runbook</h2>
    <mat-dialog-content>
      <p class="runbook-dialog__hint">
        Sube un archivo JSON o YAML con la definición del runbook. También puedes cargar la plantilla demo.
      </p>
      <label class="runbook-import__drop">
        <input
          type="file"
          accept=".json,.yaml,.yml,application/json"
          class="runbook-import__input"
          (change)="handleFileChange($event)"
          aria-label="Archivo de runbook"
        />
        <mat-icon>upload_file</mat-icon>
        <span>{{ fileName() || 'Seleccionar archivo…' }}</span>
      </label>
      @if (parseError()) {
        <p class="runbook-import__error" role="alert">{{ parseError() }}</p>
      }
      @if (previewName()) {
        <p class="runbook-import__ok">
          <mat-icon>check_circle</mat-icon>
          Listo para importar: <strong>{{ previewName() }}</strong>
        </p>
      }
      <button type="button" class="runbook-import__template" (click)="loadDemoTemplate()">
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
    .runbook-dialog__hint {
      margin: 0 0 1rem;
      font-size: 0.8rem;
      color: #333;
    }
    .runbook-import__drop {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border: 2px dashed color-mix(in srgb, #844fba 35%, transparent);
      border-radius: 12px;
      cursor: pointer;
      font-size: 0.8rem;
      color: #111;
    }
    .runbook-import__input {
      display: none;
    }
    .runbook-import__error {
      margin: 0.75rem 0 0;
      font-size: 0.78rem;
      color: #b91c1c;
    }
    .runbook-import__ok {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.75rem 0 0;
      font-size: 0.78rem;
      color: #15803d;
    }
    .runbook-import__ok mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .runbook-import__template {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 1rem;
      padding: 0.4rem 0.65rem;
      border: 1px solid color-mix(in srgb, #111 12%, transparent);
      border-radius: 8px;
      background: transparent;
      font: inherit;
      font-size: 0.75rem;
      cursor: pointer;
      color: #111;
    }
    .runbook-import__template:hover {
      background: color-mix(in srgb, #844fba 8%, transparent);
    }
  `,
})
export class RunbookImportDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<RunbookImportDialogComponent, RunbookImportPayload>)

  readonly fileName = signal('')
  readonly parseError = signal('')
  readonly previewName = signal('')
  readonly payload = signal<RunbookImportPayload | null>(null)

  handleFileChange = (ev: Event): void => {
    const input = ev.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    this.fileName.set(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      this.parseContent(text, file.name)
    }
    reader.onerror = () => {
      this.parseError.set('No se pudo leer el archivo')
      this.payload.set(null)
      this.previewName.set('')
    }
    reader.readAsText(file)
  }

  loadDemoTemplate = (): void => {
    const demo: RunbookImportPayload = {
      name: 'Runbook importado (plantilla)',
      description: 'Procedimiento cargado desde plantilla demo para validar el flujo de importación.',
      category: 'infra',
      linkedTo: 'import-target-01',
      owner: 'SRE',
      tags: ['import', 'demo'],
      steps: [
        { title: 'Validar entorno', type: 'check' },
        { title: 'Ejecutar script', type: 'command', command: 'echo "demo import"' },
        { title: 'Notificar', type: 'notify' },
      ],
    }
    this.payload.set(demo)
    this.previewName.set(demo.name)
    this.parseError.set('')
    this.fileName.set('plantilla-demo.json')
  }

  confirm = (): void => {
    const p = this.payload()
    if (!p) return
    this.dialogRef.close(p)
  }

  private parseContent = (text: string, fileName: string): void => {
    this.parseError.set('')
    try {
      let raw: unknown
      if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
        raw = this.parseSimpleYaml(text)
      } else {
        raw = JSON.parse(text)
      }
      const p = this.normalizePayload(raw)
      if (!p.name) {
        throw new Error('Falta el campo «name»')
      }
      this.payload.set(p)
      this.previewName.set(p.name)
    } catch (e) {
      this.parseError.set(e instanceof Error ? e.message : 'Formato no válido')
      this.payload.set(null)
      this.previewName.set('')
    }
  }

  private normalizePayload = (raw: unknown): RunbookImportPayload => {
    if (!raw || typeof raw !== 'object') throw new Error('El archivo debe ser un objeto JSON')
    const o = raw as Record<string, unknown>
    const name = String(o['name'] ?? o['title'] ?? '').trim()
    return {
      name,
      description: o['description'] != null ? String(o['description']) : undefined,
      category: o['category'] != null ? String(o['category']) : undefined,
      linkedTo: o['linkedTo'] != null ? String(o['linkedTo']) : String(o['target'] ?? ''),
      owner: o['owner'] != null ? String(o['owner']) : 'Importado',
      tags: Array.isArray(o['tags']) ? o['tags'].map(String) : undefined,
      steps: Array.isArray(o['steps'])
        ? (o['steps'] as Record<string, unknown>[]).map((s, i) => ({
            title: String(s['title'] ?? `Paso ${i + 1}`),
            type: s['type'] != null ? String(s['type']) : 'command',
            command: s['command'] != null ? String(s['command']) : undefined,
          }))
        : undefined,
    }
  }

  /** Parser mínimo para YAML plano demo (name, description, etc.) */
  private parseSimpleYaml = (text: string): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const line of text.split('\n')) {
      const m = line.match(/^(\w+):\s*(.+)$/)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
    if (!out['name']) throw new Error('YAML: falta «name:»')
    return out
  }
}
