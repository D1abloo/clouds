import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { MatButtonToggleModule } from '@angular/material/button-toggle'
import type { FinopsCloudProvider } from '../data/mock-billing'

@Component({
  selector: 'app-finops-cloud-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonToggleModule],
  template: `
    <mat-button-toggle-group [value]="selected()" (change)="handleChange($event.value)" aria-label="Filtrar por proveedor cloud">
      <mat-button-toggle value="all">Todos</mat-button-toggle>
      <mat-button-toggle value="AWS">AWS</mat-button-toggle>
      <mat-button-toggle value="GCP">GCP</mat-button-toggle>
      <mat-button-toggle value="Azure">Azure</mat-button-toggle>
    </mat-button-toggle-group>
  `,
  styles: `
    :host { display: block; margin-bottom: 1rem; }
    mat-button-toggle-group { border-radius: 10px; overflow: hidden; }
  `,
})
export class FinopsCloudSelectorComponent {
  readonly selected = input<string>('all')
  readonly selectedChange = output<string>()

  handleChange = (v: string): void => this.selectedChange.emit(v)
}
