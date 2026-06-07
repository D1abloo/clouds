import { Component, inject } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatRadioModule } from '@angular/material/radio'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { COMMAND_CENTER_ACTION_PRESETS, COMMAND_CENTER_PLATFORMS } from './overview-pages.demo'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export interface CommandCenterActionDialogData {
  prefill?: {
    action?: string
    provider?: string
    resource?: string
    region?: string
  }
}

export interface CommandCenterActionDialogResult {
  action: string
  provider: string
  logo: NavLogoKey | null
  resource: string
  region: string
  mode: 'now' | 'queue'
  priority: 'normal' | 'high'
}

@Component({
  selector: 'app-command-center-action-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    BrandLogoComponent,
  ],
  template: `
    <div class="cmd-dialog">
      <header class="cmd-dialog__head">
        <div class="cmd-dialog__icon"><mat-icon>play_circle</mat-icon></div>
        <div>
          <h2 mat-dialog-title>Nueva acción operativa</h2>
          <p>Selecciona plataforma, acción y destino. Ejecuta al instante o encola para aprobación.</p>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="handleSubmit()">
        <mat-dialog-content class="cmd-dialog__body">
          <mat-form-field appearance="fill" subscriptSizing="dynamic">
            <mat-label>Plataforma</mat-label>
            <mat-select formControlName="provider">
              @for (p of platforms; track p.provider) {
                <mat-option [value]="p.provider">
                  <span class="cmd-dialog__option">
                    <app-brand-logo [logo]="p.logo" size="sm" />
                    {{ p.label }}
                  </span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="fill" subscriptSizing="dynamic">
            <mat-label>Acción</mat-label>
            <mat-select formControlName="action">
              @for (group of presets; track group.group) {
                <mat-optgroup [label]="group.group">
                  @for (item of group.items; track item) {
                    <mat-option [value]="item">{{ item }}</mat-option>
                  }
                </mat-optgroup>
              }
            </mat-select>
          </mat-form-field>

          <div class="cmd-dialog__row">
            <mat-form-field appearance="fill" subscriptSizing="dynamic">
              <mat-label>Recurso</mat-label>
              <input matInput formControlName="resource" placeholder="aws-prod-app-1" />
            </mat-form-field>
            <mat-form-field appearance="fill" subscriptSizing="dynamic">
              <mat-label>Región / scope</mat-label>
              <input matInput formControlName="region" placeholder="us-east-1" />
            </mat-form-field>
          </div>

          <div class="cmd-dialog__modes">
            <span class="cmd-dialog__modes-label">Modo de ejecución</span>
            <mat-radio-group formControlName="mode" class="cmd-dialog__radio">
              <mat-radio-button value="now">Ejecutar ahora</mat-radio-button>
              <mat-radio-button value="queue">Añadir a cola</mat-radio-button>
            </mat-radio-group>
          </div>

          <mat-form-field appearance="fill" subscriptSizing="dynamic">
            <mat-label>Prioridad</mat-label>
            <mat-select formControlName="priority">
              <mat-option value="normal">Normal</mat-option>
              <mat-option value="high">Alta · requiere aprobación si es destructiva</mat-option>
            </mat-select>
          </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" (click)="handleCancel()">Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
            <mat-icon>play_arrow</mat-icon>
            Confirmar
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: `
    .cmd-dialog__head {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
      padding: 0.25rem 0 0.5rem;
    }
    .cmd-dialog__icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 14%, transparent);
      mat-icon { color: var(--app-accent); }
    }
    .cmd-dialog__head p {
      margin: 0.25rem 0 0;
      font-size: 0.82rem;
      color: var(--app-text-muted);
      line-height: 1.45;
    }
    .cmd-dialog__body {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: min(480px, 92vw);
      padding-top: 0.35rem !important;
    }
    .cmd-dialog__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .cmd-dialog__option {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }
    .cmd-dialog__modes {
      padding: 0.45rem 0.55rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 40%, var(--app-card));
    }
    .cmd-dialog__modes-label {
      display: block;
      font-size: 0.62rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
      margin-bottom: 0.35rem;
    }
    .cmd-dialog__radio {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    @media (max-width: 520px) {
      .cmd-dialog__row { grid-template-columns: 1fr; }
    }
  `,
})
export class CommandCenterActionDialogComponent {
  private readonly fb = inject(FormBuilder)
  private readonly dialogRef = inject(MatDialogRef<CommandCenterActionDialogComponent, CommandCenterActionDialogResult>)
  readonly data = inject<CommandCenterActionDialogData>(MAT_DIALOG_DATA, { optional: true })

  readonly platforms = COMMAND_CENTER_PLATFORMS
  readonly presets = COMMAND_CENTER_ACTION_PRESETS

  readonly form = this.fb.nonNullable.group({
    provider: [this.data?.prefill?.provider ?? 'AWS', Validators.required],
    action: [this.data?.prefill?.action ?? 'Reiniciar instancia', Validators.required],
    resource: [this.data?.prefill?.resource ?? 'aws-prod-app-1', Validators.required],
    region: [this.data?.prefill?.region ?? 'us-east-1', Validators.required],
    mode: ['now' as 'now' | 'queue', Validators.required],
    priority: ['normal' as 'normal' | 'high', Validators.required],
  })

  handleSubmit = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    const platform = this.platforms.find((p) => p.provider === v.provider)
    this.dialogRef.close({
      action: v.action,
      provider: v.provider,
      logo: platform?.logo ?? null,
      resource: v.resource,
      region: v.region,
      mode: v.mode,
      priority: v.priority,
    })
  }

  handleCancel = (): void => this.dialogRef.close()
}
