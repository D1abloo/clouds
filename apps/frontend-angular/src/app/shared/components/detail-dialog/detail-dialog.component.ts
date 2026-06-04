import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

export interface DetailDialogData {
  title: string
  rows: { label: string; value: string }[]
  extra?: string
  icon?: string
}

@Component({
  selector: 'app-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="detail-dialog">
      <header class="detail-dialog__header">
        <div class="detail-dialog__icon">
          <mat-icon>{{ data.icon ?? 'info' }}</mat-icon>
        </div>
        <div>
          <h2 mat-dialog-title>{{ data.title }}</h2>
          <p class="detail-dialog__sub">Resource details and metadata</p>
        </div>
      </header>
      <mat-dialog-content>
        <dl class="detail-dl">
          @for (row of data.rows; track row.label) {
            <dt>{{ row.label }}</dt>
            <dd [title]="row.value">{{ row.value }}</dd>
          }
        </dl>
        @if (data.extra) {
          <pre class="extra mono">{{ data.extra }}</pre>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-flat-button color="primary" mat-dialog-close type="button">Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .detail-dialog { padding: 0.25rem 0; }
    .detail-dialog__header {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      padding: 0 0 0.5rem;
    }
    .detail-dialog__icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 14%, transparent);
      mat-icon { color: var(--app-accent); }
    }
    h2[mat-dialog-title] {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      padding: 0;
    }
    .detail-dialog__sub {
      margin: 0.2rem 0 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
    }
    .detail-dl {
      display: grid;
      grid-template-columns: minmax(120px, 140px) 1fr;
      gap: 0.5rem 1rem;
      margin: 0;
      padding: 0.75rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, var(--app-elevated) 60%, transparent);
      dt {
        color: var(--app-text-muted);
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: capitalize;
      }
      dd {
        margin: 0;
        font-weight: 500;
        font-size: 0.875rem;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
    }
    .extra {
      margin-top: 1rem;
      padding: 0.85rem;
      background: var(--app-surface);
      border-radius: var(--app-radius-md);
      max-height: 240px;
      overflow: auto;
      font-size: 0.75rem;
      box-shadow: var(--app-shadow-xs);
    }
    mat-dialog-actions { padding: 0.75rem 0 0; }
  `,
})
export class DetailDialogComponent {
  readonly data = inject<DetailDialogData>(MAT_DIALOG_DATA)
}
