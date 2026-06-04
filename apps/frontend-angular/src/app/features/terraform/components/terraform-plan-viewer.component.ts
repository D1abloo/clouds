import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'app-terraform-plan-viewer',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="plan-viewer animate-fade-in">
      <div class="plan-viewer__header">
        <div>
          <h4><mat-icon>description</mat-icon> Terraform plan</h4>
          @if (runId) { <span class="run-id">Run {{ runId }}</span> }
        </div>
        @if (planOutput) {
          <button mat-button type="button" (click)="handleCopy()">
            <mat-icon>content_copy</mat-icon> Copy
          </button>
        }
      </div>
      @if (resources.length) {
        <div class="plan-resources">
          @for (r of resources; track r.name) {
            <div class="plan-resource">
              <span class="change change--{{ r.change }}">{{ r.change }}</span>
              <code>{{ r.type }}</code>
              <span>{{ r.name }}</span>
            </div>
          }
        </div>
      }
      <pre class="plan-output mono">{{ planOutput || 'Generate a plan to preview infrastructure changes.' }}</pre>
    </div>
  `,
  styles: `
    .plan-viewer {
      border-radius: var(--app-radius-lg);
      overflow: hidden;
      background: var(--app-card);
      border: none;
      outline: none;
      box-shadow: none;
      filter: none;
    }
    .plan-viewer__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: var(--app-surface);
      h4 {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.95rem;
      }
      .run-id { font-size: 0.72rem; color: var(--app-text-muted); }
    }
    .plan-resources {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.75rem 1.25rem;
      background: color-mix(in srgb, var(--app-accent) 6%, var(--app-card));
    }
    .plan-resource {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.82rem;
      code { font-size: 0.75rem; opacity: 0.85; }
    }
    .change {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      &--create { background: rgba(34,197,94,0.15); color: #16a34a; }
      &--update { background: rgba(245,158,11,0.15); color: #d97706; }
      &--delete { background: rgba(239,68,68,0.15); color: #dc2626; }
    }
    .plan-output {
      margin: 0;
      padding: 1.25rem;
      max-height: 280px;
      overflow: auto;
      font-size: 0.75rem;
      line-height: 1.55;
      background: #0d1117;
      color: #c9d1d9;
    }
  `,
})
export class TerraformPlanViewerComponent {
  @Input() planOutput = ''
  @Input() runId = ''
  @Input() resources: { type: string; name: string; change: string }[] = []

  handleCopy = (): void => {
    if (this.planOutput) navigator.clipboard?.writeText(this.planOutput)
  }
}
