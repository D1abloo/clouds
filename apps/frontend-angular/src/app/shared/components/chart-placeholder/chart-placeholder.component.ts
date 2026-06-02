import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-chart-placeholder',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="chart-placeholder" role="img" [attr.aria-label]="label">
      <mat-icon>show_chart</mat-icon>
      <span>{{ label }}</span>
    </div>
  `,
  styles: `
    .chart-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      opacity: 0.5;
    }
  `,
})
export class ChartPlaceholderComponent {
  @Input() label = 'Chart visualization — connect metrics API'
}
