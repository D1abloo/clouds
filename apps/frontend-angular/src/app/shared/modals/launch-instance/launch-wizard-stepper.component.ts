import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

export type WizardStepId = 1 | 2 | 3 | 4 | 5

export interface WizardStepDef {
  id: WizardStepId
  label: string
  icon: string
}

export const LAUNCH_WIZARD_STEPS: WizardStepDef[] = [
  { id: 1, label: 'Proveedor', icon: 'cloud' },
  { id: 2, label: 'Destino', icon: 'folder_special' },
  { id: 3, label: 'Instancia', icon: 'memory' },
  { id: 4, label: 'Recursos', icon: 'speed' },
  { id: 5, label: 'Lanzar', icon: 'rocket_launch' },
]

@Component({
  selector: 'app-launch-wizard-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <nav class="lw-stepper" aria-label="Pasos del asistente">
      @for (step of steps; track step.id) {
        <div class="lw-step" [class]="stepState(step.id)">
          <span class="lw-step__marker">
            @if (step.id < activeStep()) {
              <mat-icon>check</mat-icon>
            } @else {
              {{ step.id }}
            }
          </span>
          <span class="lw-step__text">
            <span class="lw-step__label">{{ step.label }}</span>
          </span>
        </div>
      }
    </nav>
  `,
  styleUrl: './launch-wizard-stepper.component.scss',
})
export class LaunchWizardStepperComponent {
  readonly activeStep = input.required<WizardStepId>()
  readonly steps = LAUNCH_WIZARD_STEPS

  stepState = (id: WizardStepId): string => {
    const active = this.activeStep()
    if (id < active) return 'lw-step--done'
    if (id === active) return 'lw-step--active'
    return 'lw-step--pending'
  }
}
