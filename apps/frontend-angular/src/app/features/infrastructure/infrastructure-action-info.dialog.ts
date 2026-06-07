import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import type { InfraActionSpec } from './infrastructure-actions.catalog'

export interface InfrastructureActionInfoDialogData {
  spec: InfraActionSpec
  moduleId: string
  logo?: NavLogoKey
  logos?: NavLogoKey[]
}

export type InfrastructureActionInfoDialogResult = 'run' | 'cancel'

@Component({
  selector: 'app-infrastructure-action-info-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, BrandLogoComponent],
  template: `
    <div class="infra-action-dialog">
      <header class="infra-action-dialog__head">
        <div class="infra-action-dialog__brand">
          @if (data.logos?.length) {
            <div class="infra-action-dialog__logos">
              @for (lg of data.logos; track lg) {
                <app-brand-logo [logo]="lg" size="md" />
              }
            </div>
          } @else if (data.logo) {
            <app-brand-logo [logo]="data.logo" size="lg" />
          }
          <div>
            <h2 mat-dialog-title>{{ data.spec.title }}</h2>
            <p>{{ data.spec.summary }}</p>
          </div>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content>
        <div class="infra-action-dialog__meta">
          <article>
            <span>Impacto</span>
            <p>{{ data.spec.impact }}</p>
          </article>
          <article>
            <span>Duración</span>
            <p>{{ data.spec.duration }}</p>
          </article>
        </div>

        @if (data.spec.prerequisites?.length) {
          <section>
            <h3>Requisitos</h3>
            <ul>
              @for (item of data.spec.prerequisites; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </section>
        }

        <section>
          <h3>Pasos de ejecución</h3>
          <ol>
            @for (step of data.spec.steps; track step) {
              <li>{{ step }}</li>
            }
          </ol>
        </section>

        @if (data.spec.resources?.length) {
          <section>
            <h3>Recursos afectados</h3>
            <div class="infra-action-dialog__tags">
              @for (r of data.spec.resources; track r) {
                <span>{{ r }}</span>
              }
            </div>
          </section>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="handleCancel()">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="handleRun()">
          <mat-icon>play_arrow</mat-icon>
          Ejecutar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .infra-action-dialog__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      padding-bottom: 0.35rem;
    }
    .infra-action-dialog__brand {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }
    .infra-action-dialog__logos {
      display: flex;
      gap: 0.25rem;
      flex-shrink: 0;
    }
    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 1.05rem;
      font-weight: 800;
    }
    .infra-action-dialog__brand > div > p {
      margin: 0.2rem 0 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
      line-height: 1.4;
    }
    .infra-action-dialog__meta {
      display: grid;
      grid-template-columns: 1fr 140px;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .infra-action-dialog__meta article {
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 7%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .infra-action-dialog__meta span {
      display: block;
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--app-text-muted);
      margin-bottom: 0.15rem;
    }
    .infra-action-dialog__meta p {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 650;
      line-height: 1.35;
    }
    section {
      margin-bottom: 0.75rem;
    }
    section h3 {
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--infra-accent-deep, #c2410c);
    }
    ul, ol {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.72rem;
      line-height: 1.5;
    }
    .infra-action-dialog__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .infra-action-dialog__tags span {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 0.12rem 0.4rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 12%, transparent);
      color: var(--infra-accent-deep, #c2410c);
    }
  `,
})
export class InfrastructureActionInfoDialogComponent {
  readonly data = inject<InfrastructureActionInfoDialogData>(MAT_DIALOG_DATA)
  private readonly ref = inject(MatDialogRef<InfrastructureActionInfoDialogComponent, InfrastructureActionInfoDialogResult>)

  handleCancel = (): void => {
    this.ref.close('cancel')
  }

  handleRun = (): void => {
    this.ref.close('run')
  }
}
