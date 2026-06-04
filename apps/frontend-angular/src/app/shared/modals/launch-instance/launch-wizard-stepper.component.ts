import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

export type WizardStepId = 1 | 2 | 3 | 4

export interface WizardStepDef {
  id: WizardStepId
  label: string
}

export const LAUNCH_WIZARD_STEPS: WizardStepDef[] = [
  { id: 1, label: 'Provider' },
  { id: 2, label: 'Configure' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'Launch' },
]

@Component({
  selector: 'app-launch-wizard-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <nav class="launch-stepper" aria-label="Launch wizard progress">
      @for (step of steps; track step.id; let last = $last) {
        <div class="launch-stepper__item" [class]="stepState(step.id)">
          <span class="launch-stepper__circle">
            @if (step.id < activeStep()) {
              <mat-icon class="launch-stepper__check">check</mat-icon>
            } @else {
              {{ step.id }}
            }
          </span>
          <span class="launch-stepper__label">{{ step.label }}</span>
        </div>
        @if (!last) {
          <span class="launch-stepper__line" [class.launch-stepper__line--done]="step.id < activeStep()"></span>
        }
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
    if (id < active) return 'launch-stepper__item--done'
    if (id === active) return 'launch-stepper__item--active'
    return 'launch-stepper__item--pending'
  }
}
