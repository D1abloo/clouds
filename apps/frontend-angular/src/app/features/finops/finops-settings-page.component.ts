import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'app-finops-settings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatSlideToggleModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="page-container finops-page">
      <header class="finops-hero">
        <h1>Configuración FinOps</h1>
        <p>Presupuestos, umbrales de alerta y preferencias de informes.</p>
      </header>
      <form class="finops-card settings-form" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>Presupuesto mensual global (€)</mat-label>
          <input matInput type="number" formControlName="monthlyBudget" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Umbral alerta presupuesto (%)</mat-label>
          <input matInput type="number" formControlName="alertThreshold" />
        </mat-form-field>
        <mat-slide-toggle formControlName="aiRecommendations">Recomendaciones IA automáticas</mat-slide-toggle>
        <mat-slide-toggle formControlName="weeklyDigest">Resumen semanal por email</mat-slide-toggle>
        <button mat-flat-button color="primary" type="submit">Guardar configuración</button>
      </form>
    </div>
  `,
  styles: [`
    @import './finops-theme.scss';
    .settings-form { display: flex; flex-direction: column; gap: 1rem; max-width: 480px; }
  `],
})
export class FinopsSettingsPageComponent {
  private readonly fb = inject(FormBuilder)
  readonly form = this.fb.group({
    monthlyBudget: [60000],
    alertThreshold: [85],
    aiRecommendations: [true],
    weeklyDigest: [true],
  })
  save = (): void => { /* mock persist */ }
}
