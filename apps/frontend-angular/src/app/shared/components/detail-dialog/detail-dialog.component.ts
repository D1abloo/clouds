import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'

export interface DetailDialogData {
  title: string
  rows: { label: string; value: string }[]
  extra?: string
}

@Component({
  selector: 'app-detail-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <dl class="detail-dl">
        @for (row of data.rows; track row.label) {
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        }
      </dl>
      @if (data.extra) {
        <pre class="extra mono">{{ data.extra }}</pre>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button mat-dialog-close type="button">Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    .detail-dl {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 0.35rem 1rem;
      margin: 0;
      dt { color: var(--app-text-muted); font-size: 0.85rem; }
      dd { margin: 0; font-weight: 500; }
    }
    .extra {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--app-surface);
      border-radius: 8px;
      max-height: 240px;
      overflow: auto;
      font-size: 0.75rem;
    }
  `,
})
export class DetailDialogComponent {
  readonly data = inject<DetailDialogData>(MAT_DIALOG_DATA)
}
