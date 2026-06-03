import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

export interface PageHeaderAction {
  label: string
  icon?: string
  primary?: boolean
  disabled?: boolean
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <header class="page-header rich-header">
      <div class="rich-header__text">
        <h1>{{ title }}</h1>
        @if (description) {
          <p>{{ description }}</p>
        }
      </div>
      @if (actions.length) {
        <div class="rich-header__actions">
          @for (action of actions; track action.label) {
            <button
              mat-flat-button
              [color]="action.primary ? 'primary' : undefined"
              [disabled]="action.disabled"
              type="button"
              (click)="actionClick.emit(action.label)"
            >
              @if (action.icon) {
                <mat-icon>{{ action.icon }}</mat-icon>
              }
              {{ action.label }}
            </button>
          }
        </div>
      }
    </header>
  `,
  styles: `
    .rich-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .rich-header__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      button { display: inline-flex; align-items: center; gap: 0.35rem; }
    }
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string
  @Input() description = ''
  @Input() actions: PageHeaderAction[] = []
  readonly actionClick = output<string>()
}
