import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatIconModule } from '@angular/material/icon'

export type ModuleFormKind = 'scale' | 'expand' | 'simulate' | 'thresholds'

export interface ModuleFormDialogData {
  kind: ModuleFormKind
  title: string
  subtitle?: string
  resourceName: string
  replicas?: number
  sizeGb?: number
  growthPct?: number
  periodDays?: number
  cpuThreshold?: number
  ramThreshold?: number
  diskThreshold?: number
}

export interface ModuleFormDialogResult {
  kind: ModuleFormKind
  replicas?: number
  sizeGb?: number
  growthPct?: number
  periodDays?: number
  cpuThreshold?: number
  ramThreshold?: number
  diskThreshold?: number
}

const kindMeta: Record<ModuleFormKind, { icon: string; hint: string; impact: string }> = {
  scale: {
    icon: 'unfold_more',
    hint: 'El cluster aplicará un rolling update gradual. Pods no listos quedarán fuera del service hasta pasar readiness.',
    impact: 'Puede haber breve degradación de capacidad durante el escalado.',
  },
  expand: {
    icon: 'storage',
    hint: 'La ampliación en caliente depende del proveedor. Verifica que el volumen esté en estado in-use o available.',
    impact: 'Operación irreversible — no se puede reducir el tamaño del volumen después.',
  },
  simulate: {
    icon: 'science',
    hint: 'Proyección what-if basada en métricas históricas de los últimos 30 días.',
    impact: 'Resultado estimado — no modifica recursos reales.',
  },
  thresholds: {
    icon: 'tune',
    hint: 'Las alertas se evalúan cada 5 minutos y se envían a Slack #cloudops.',
    impact: 'Cambio de configuración — afecta futuras notificaciones.',
  },
}

@Component({
  selector: 'app-module-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule],
  template: `
    <div class="mod-form-dialog">
      <header class="mod-form-dialog__head">
        <div class="mod-form-dialog__icon">
          <mat-icon>{{ meta.icon }}</mat-icon>
        </div>
        <div>
          <h2 mat-dialog-title>{{ data.title }}</h2>
          @if (data.subtitle) {
            <p class="mod-form-dialog__sub">{{ data.subtitle }}</p>
          }
          <p class="mod-form-dialog__resource mono">{{ data.resourceName }}</p>
        </div>
      </header>

      <mat-dialog-content>
        <p class="mod-form-dialog__hint">{{ meta.hint }}</p>

        @if (data.kind === 'scale') {
          <mat-form-field appearance="outline" class="mod-form-field">
            <mat-label>Réplicas deseadas</mat-label>
            <input matInput type="number" min="1" max="50" [(ngModel)]="replicas" />
            <mat-hint>Actual: {{ data.replicas ?? replicas }} · Máx. recomendado: 20</mat-hint>
          </mat-form-field>
        }
        @if (data.kind === 'expand') {
          <mat-form-field appearance="outline" class="mod-form-field">
            <mat-label>Nuevo tamaño (GB)</mat-label>
            <input matInput type="number" min="1" [(ngModel)]="sizeGb" />
            <mat-hint>Debe ser mayor que el tamaño actual</mat-hint>
          </mat-form-field>
        }
        @if (data.kind === 'simulate') {
          <div class="mod-form-grid">
            <mat-form-field appearance="outline" class="mod-form-field">
              <mat-label>Crecimiento esperado (%)</mat-label>
              <input matInput type="number" min="1" max="500" [(ngModel)]="growthPct" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="mod-form-field">
              <mat-label>Periodo</mat-label>
              <mat-select [(ngModel)]="periodDays">
                <mat-option [value]="30">30 días</mat-option>
                <mat-option [value]="90">90 días</mat-option>
                <mat-option [value]="180">180 días</mat-option>
                <mat-option [value]="365">1 año</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <p class="mod-form-preview">
            Escenario: <strong>+{{ growthPct }}%</strong> de demanda en <strong>{{ periodDays }} días</strong>
          </p>
        }
        @if (data.kind === 'thresholds') {
          <div class="mod-form-grid mod-form-grid--3">
            <mat-form-field appearance="outline" class="mod-form-field">
              <mat-label>CPU (%)</mat-label>
              <input matInput type="number" min="1" max="100" [(ngModel)]="cpuThreshold" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="mod-form-field">
              <mat-label>RAM (%)</mat-label>
              <input matInput type="number" min="1" max="100" [(ngModel)]="ramThreshold" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="mod-form-field">
              <mat-label>Disco (%)</mat-label>
              <input matInput type="number" min="1" max="100" [(ngModel)]="diskThreshold" />
            </mat-form-field>
          </div>
        }

        <div class="mod-form-impact">
          <mat-icon>info</mat-icon>
          <span>{{ meta.impact }}</span>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="handleCancel()">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="handleSubmit()">
          <mat-icon>check</mat-icon>
          Aplicar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .mod-form-dialog__head {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      padding-bottom: 0.65rem;
      margin-bottom: 0.25rem;
      border-bottom: 1px solid color-mix(in srgb, var(--infra-accent, #ff9900) 20%, transparent);
    }

    .mod-form-dialog__icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--infra-accent, #ff9900) 28%, transparent);
      flex-shrink: 0;
    }

    .mod-form-dialog__icon mat-icon {
      color: var(--infra-accent-deep, #c2410c);
    }

    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 1rem;
      font-weight: 850;
    }

    .mod-form-dialog__sub {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }

    .mod-form-dialog__resource {
      margin: 0.2rem 0 0;
      font-size: 0.68rem;
      color: var(--infra-accent-deep, #c2410c);
    }

    .mod-form-dialog__hint {
      margin: 0 0 0.65rem;
      padding: 0.5rem 0.6rem;
      border-radius: 8px;
      font-size: 0.68rem;
      line-height: 1.45;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 5%, var(--app-card));
      border-left: 3px solid var(--infra-accent, #ff9900);
    }

    .mod-form-field {
      width: 100%;
    }

    .mod-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .mod-form-grid--3 {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (max-width: 520px) {
      .mod-form-grid,
      .mod-form-grid--3 {
        grid-template-columns: 1fr;
      }
    }

    .mod-form-preview {
      margin: 0 0 0.5rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }

    .mod-form-impact {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      margin-top: 0.5rem;
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      font-size: 0.65rem;
      color: var(--app-text-muted);
      background: color-mix(in srgb, var(--app-text) 4%, var(--app-card));
    }

    .mod-form-impact mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      color: var(--infra-accent-deep, #c2410c);
      flex-shrink: 0;
    }

    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class ModuleFormDialogComponent {
  readonly data = inject<ModuleFormDialogData>(MAT_DIALOG_DATA)
  private readonly ref = inject(MatDialogRef<ModuleFormDialogComponent, ModuleFormDialogResult | undefined>)
  readonly meta = kindMeta[this.data.kind]

  replicas = this.data.replicas ?? 3
  sizeGb = this.data.sizeGb ?? 500
  growthPct = this.data.growthPct ?? 25
  periodDays = this.data.periodDays ?? 90
  cpuThreshold = this.data.cpuThreshold ?? 80
  ramThreshold = this.data.ramThreshold ?? 85
  diskThreshold = this.data.diskThreshold ?? 90

  handleCancel = (): void => this.ref.close(undefined)

  handleSubmit = (): void => {
    this.ref.close({
      kind: this.data.kind,
      replicas: this.replicas,
      sizeGb: this.sizeGb,
      growthPct: this.growthPct,
      periodDays: this.periodDays,
      cpuThreshold: this.cpuThreshold,
      ramThreshold: this.ramThreshold,
      diskThreshold: this.diskThreshold,
    })
  }
}
