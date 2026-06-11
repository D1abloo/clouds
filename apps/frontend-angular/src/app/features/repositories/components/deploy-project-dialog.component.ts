import { Component, inject, OnInit, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { GithubService, type DeployTargetType } from '../../../core/services/github.service'
import { catchError, of } from 'rxjs'

type DeployTarget = { id: string; name: string; type: DeployTargetType; subtitle?: string }

@Component({
  selector: 'app-deploy-project-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>rocket_launch</mat-icon>
      Nuevo despliegue
    </h2>
    <mat-dialog-content class="deploy-dialog">
      <header class="deploy-dialog__repo">
        <span class="deploy-dialog__badge">GitHub</span>
        <strong>{{ data.repoName }}</strong>
        <p>Rama base: <code>{{ data.defaultBranch }}</code></p>
      </header>

      <section class="deploy-dialog__section" aria-labelledby="deploy-branch-label">
        <h3 id="deploy-branch-label">Origen</h3>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Rama a desplegar</mat-label>
          <input matInput [formControl]="branch" autocomplete="off" />
          <mat-hint>Commit HEAD de esta rama se usará como versión</mat-hint>
        </mat-form-field>
      </section>

      <section class="deploy-dialog__section" aria-labelledby="deploy-env-label">
        <h3 id="deploy-env-label">Entorno y estrategia</h3>
        <div class="deploy-dialog__row">
          <mat-form-field appearance="outline" class="half">
            <mat-label>Entorno</mat-label>
            <mat-select [formControl]="environment">
              <mat-option value="production">Producción</mat-option>
              <mat-option value="staging">Staging</mat-option>
              <mat-option value="development">Desarrollo</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="half">
            <mat-label>Estrategia</mat-label>
            <mat-select [formControl]="strategy">
              <mat-option value="rolling">Rolling</mat-option>
              <mat-option value="blue-green">Blue/Green</mat-option>
              <mat-option value="canary">Canary</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </section>

      <section class="deploy-dialog__section" aria-labelledby="deploy-target-label">
        <h3 id="deploy-target-label">Destino en tu workspace</h3>
        @if (loadingTargets()) {
          <div class="deploy-dialog__loading">
            <mat-spinner diameter="28" />
            <span>Cargando instancias y VPS…</span>
          </div>
        } @else if (!targets().length) {
          <p class="deploy-dialog__empty">
            No hay instancias ni VPS en tu espacio de trabajo. Conecta cloud o registra un VPS primero.
          </p>
        } @else {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Destino</mat-label>
            <mat-select [formControl]="targetId">
              @for (t of targets(); track t.id) {
                <mat-option [value]="t.id">
                  {{ t.name }} · {{ targetLabel(t.type) }}
                  @if (t.subtitle) {
                    <span class="opt-sub"> — {{ t.subtitle }}</span>
                  }
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      </section>

      <section class="deploy-dialog__section">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Notas (opcional)</mat-label>
          <textarea matInput rows="2" [formControl]="notes" placeholder="Ventana de cambio, ticket, responsable…"></textarea>
        </mat-form-field>
      </section>

      <ul class="deploy-dialog__pipeline" aria-label="Pasos del despliegue">
        @for (step of pipelineSteps; track step) {
          <li><mat-icon>check_circle_outline</mat-icon>{{ step }}</li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="!canSubmit()"
        [mat-dialog-close]="result()"
      >
        Iniciar despliegue
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      mat-icon { color: #0284c7; }
    }
    .deploy-dialog { min-width: min(520px, 92vw); }
    .full { width: 100%; }
    .half { flex: 1; min-width: 140px; }
    .deploy-dialog__repo {
      margin-bottom: 1rem;
      padding: 0.75rem 0.85rem;
      border-radius: 12px;
      background: linear-gradient(135deg, #f0f9ff, #eef2ff);
      border: 1px solid #e0e7ff;
      strong { display: block; font-size: 1rem; margin: 0.25rem 0; }
      p { margin: 0; font-size: 0.78rem; color: #64748b; }
      code { font-size: 0.75rem; }
    }
    .deploy-dialog__badge {
      font-size: 0.62rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #24292f;
      background: #fff;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      border: 1px solid #e2e8f0;
    }
    .deploy-dialog__section h3 {
      margin: 0 0 0.5rem;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .deploy-dialog__row { display: flex; gap: 0.65rem; flex-wrap: wrap; }
    .deploy-dialog__loading {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.82rem;
      color: #64748b;
      padding: 0.5rem 0;
    }
    .deploy-dialog__empty {
      font-size: 0.8rem;
      color: #b45309;
      background: #fffbeb;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      border: 1px solid #fde68a;
    }
    .deploy-dialog__pipeline {
      list-style: none;
      margin: 0.75rem 0 0;
      padding: 0.65rem 0.75rem;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.75rem;
      li {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.72rem;
        font-weight: 600;
        color: #475569;
        mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: #22c55e; }
      }
    }
    .opt-sub { opacity: 0.75; font-size: 0.85em; }
  `,
})
export class DeployProjectDialogComponent implements OnInit {
  private readonly github = inject(GithubService)
  readonly data = inject<{ repoName: string; defaultBranch: string; repoId?: string }>(MAT_DIALOG_DATA)

  readonly branch = new FormControl('', { nonNullable: true, validators: [Validators.required] })
  readonly environment = new FormControl('staging', { nonNullable: true })
  readonly strategy = new FormControl('rolling', { nonNullable: true })
  readonly targetId = new FormControl('', { nonNullable: true, validators: [Validators.required] })
  readonly notes = new FormControl('', { nonNullable: true })

  readonly targets = signal<DeployTarget[]>([])
  readonly loadingTargets = signal(true)

  readonly pipelineSteps = ['Checkout', 'Build', 'Test', 'Publish', 'Deploy']

  ngOnInit(): void {
    this.branch.setValue(this.data.defaultBranch)
    this.github.deployTargets().pipe(catchError(() => of({ items: [] as DeployTarget[] }))).subscribe((res) => {
      const items = (res.items ?? []) as DeployTarget[]
      this.targets.set(items)
      if (items[0]) this.targetId.setValue(items[0].id)
      this.loadingTargets.set(false)
    })
  }

  targetLabel = (t: DeployTargetType): string =>
    ({ instance: 'Instancia cloud', vps: 'VPS', docker: 'Docker', kubernetes: 'Kubernetes' })[t]

  canSubmit = (): boolean =>
    this.branch.valid && this.targetId.valid && this.targets().length > 0

  result = () => {
    const target = this.targets().find((t) => t.id === this.targetId.value)
    if (!target) return null
    return {
      branch: this.branch.value,
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
      environment: this.environment.value,
      strategy: this.strategy.value,
      notes: this.notes.value.trim() || undefined,
    }
  }
}
