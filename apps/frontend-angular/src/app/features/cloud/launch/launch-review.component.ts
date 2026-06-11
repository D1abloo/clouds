import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import type { LaunchPreflightUiCheck } from './cloud-launch.types'

@Component({
  selector: 'app-launch-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section class="lrev">
      <header><mat-icon>fact_check</mat-icon><strong>Resumen antes de lanzar</strong></header>
      @if (checks().length) {
        <ul class="lrev__checks">
          @for (c of checks(); track c.id) {
            <li [class]="'lrev__check lrev__check--' + c.level">
              <mat-icon>{{ icon(c.level) }}</mat-icon>
              <span>{{ c.message }}</span>
            </li>
          }
        </ul>
      }
      <dl class="lrev__grid">
        @for (row of rows(); track row.label) {
          <div>
            <dt>{{ row.label }}</dt>
            <dd [class.lrev__mono]="row.mono">{{ row.value }}</dd>
          </div>
        }
      </dl>
      @if (costHint()) {
        <p class="lrev__cost"><mat-icon>savings</mat-icon> Coste estimado: <strong>{{ costHint() }}</strong></p>
      }
    </section>
  `,
  styleUrl: './launch-review.component.scss',
})
export class LaunchReviewComponent {
  readonly rows = input<{ label: string; value: string; mono?: boolean }[]>([])
  readonly checks = input<LaunchPreflightUiCheck[]>([])
  readonly costHint = input('')

  icon = (level: string): string => {
    if (level === 'ok') return 'check_circle'
    if (level === 'warning') return 'warning'
    return 'error'
  }
}
