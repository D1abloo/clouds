import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import type { SecurityRisk } from './security-center.demo'

export interface SecurityEvidenceDialogData {
  finding: SecurityRisk
}

@Component({
  selector: 'app-security-evidence-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <article class="sec-ev">
      <header class="sec-ev__head">
        <mat-icon>fact_check</mat-icon>
        <div>
          <span class="sec-ev__type">{{ data.finding.evidenceType }}</span>
          <h2>Evidencia técnica</h2>
          <p>{{ data.finding.finding }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="sec-ev__body">
        <pre class="sec-ev__pre">{{ data.finding.evidence }}</pre>
        @if (data.finding.cve) {
          <p class="sec-ev__ref">Referencia: <code>{{ data.finding.cve }}</code></p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-ev { min-width: min(560px, 94vw); color: #0f172a; }
    .sec-ev__head { display: flex; gap: 0.5rem; align-items: flex-start; padding-bottom: 0.55rem; border-bottom: 1px solid #e2e8f0; }
    .sec-ev__head > mat-icon:first-child { color: #ec4899; }
    .sec-ev__type { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .sec-ev__head h2 { margin: 0.1rem 0 0; font-size: 0.9rem; font-weight: 700; }
    .sec-ev__head p { margin: 0.15rem 0 0; font-size: 0.68rem; color: #64748b; }
    .sec-ev__head button { margin-left: auto; }
    .sec-ev__pre {
      margin: 0; padding: 0.75rem; border-radius: 9px; background: #0f172a; color: #e2e8f0;
      font-size: 0.68rem; line-height: 1.55; overflow-x: auto; white-space: pre-wrap;
    }
    .sec-ev__ref { margin: 0.65rem 0 0; font-size: 0.68rem; color: #64748b; }
    .sec-ev__ref code { font-family: ui-monospace, monospace; background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 4px; }
  `,
})
export class SecurityEvidenceDialogComponent {
  readonly data = inject<SecurityEvidenceDialogData>(MAT_DIALOG_DATA)
}
