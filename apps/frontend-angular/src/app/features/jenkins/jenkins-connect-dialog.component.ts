import { Component, inject, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatIconModule } from '@angular/material/icon'
import { JenkinsService } from '../../core/services/jenkins.service'
import { ToastService } from '../../core/services/toast.service'

@Component({
  selector: 'app-jenkins-connect-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  template: `
    <article class="jenkins-connect">
      <header class="jenkins-connect__head">
        <mat-icon>dns</mat-icon>
        <div>
          <h2>Conectar Jenkins</h2>
          <p>URL del controlador, usuario y API token para sincronizar jobs y desplegar desde el panel.</p>
        </div>
      </header>

      <form [formGroup]="form" (ngSubmit)="handleSubmit()">
        <mat-dialog-content class="jenkins-connect__body">
          <mat-form-field appearance="outline" class="jenkins-connect__field">
            <mat-label>Nombre del controlador</mat-label>
            <input matInput formControlName="name" placeholder="jenkins-prod" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="jenkins-connect__field">
            <mat-label>URL de Jenkins</mat-label>
            <input matInput formControlName="url" placeholder="https://jenkins.ejemplo.com" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="jenkins-connect__field">
            <mat-label>Usuario</mat-label>
            <input matInput formControlName="username" autocomplete="username" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="jenkins-connect__field">
            <mat-label>API token</mat-label>
            <input matInput type="password" formControlName="apiToken" autocomplete="off" />
          </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Conectando…' : 'Conectar' }}
          </button>
        </mat-dialog-actions>
      </form>
    </article>
  `,
  styles: `
    .jenkins-connect__head {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      padding: 0.25rem 0 0.5rem;
      mat-icon { color: #d97706; font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
      h2 { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
      p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.45; max-width: 28rem; }
    }
    .jenkins-connect__body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: min(420px, 88vw);
      padding-top: 0.25rem !important;
    }
    .jenkins-connect__field { width: 100%; }
  `,
})
export class JenkinsConnectDialogComponent {
  private readonly jenkins = inject(JenkinsService)
  private readonly toast = inject(ToastService)
  private readonly ref = inject(MatDialogRef<JenkinsConnectDialogComponent>)

  readonly saving = signal(false)

  readonly form = new FormGroup({
    name: new FormControl('jenkins-prod', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    url: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^https?:\/\/.+/i)] }),
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    apiToken: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  })

  handleSubmit = (): void => {
    if (this.form.invalid || this.saving()) return
    const { name, url, username, apiToken } = this.form.getRawValue()
    this.saving.set(true)
    this.jenkins
      .createServer({
        name,
        url: url.replace(/\/$/, ''),
        secretRef: JSON.stringify({ username, apiToken }),
      })
      .subscribe({
        next: (server) => {
          this.jenkins.validate(server.id).subscribe({
            next: (res) => {
              this.saving.set(false)
              const msg = (res as { message?: string })?.message ?? 'Conexión validada'
              this.toast.success(msg)
              this.ref.close(server)
            },
            error: () => {
              this.saving.set(false)
              this.toast.warning('Servidor guardado; no se pudo validar la conexión')
              this.ref.close(server)
            },
          })
        },
        error: () => {
          this.saving.set(false)
          this.toast.error('No se pudo conectar Jenkins')
        },
      })
  }
}
