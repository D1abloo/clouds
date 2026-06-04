import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'app-github-account-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Añadir cuenta GitHub</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="account-form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Etiqueta</mat-label>
          <input matInput formControlName="label" placeholder="GitHub producción" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Usuario</mat-label>
          <input matInput formControlName="username" placeholder="cloudops-demo" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Token (opcional, demo si vacío)</mat-label>
          <input matInput formControlName="token" type="password" autocomplete="off" />
        </mat-form-field>
        <p class="hint">Sin token real se usarán datos de demostración.</p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button mat-flat-button color="primary" type="button" [disabled]="form.invalid" (click)="submit()">
        Añadir cuenta
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; }
    .hint { margin: 0; font-size: 0.8rem; color: var(--app-text-muted); }
    .account-form { display: flex; flex-direction: column; gap: 0.25rem; min-width: 320px; }
  `,
})
export class GithubAccountDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<GithubAccountDialogComponent>)

  readonly form = new FormGroup({
    label: new FormControl('GitHub', { nonNullable: true }),
    username: new FormControl('cloudops-demo', { nonNullable: true, validators: [Validators.required] }),
    token: new FormControl('', { nonNullable: true }),
  })

  submit = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    this.dialogRef.close({
      label: v.label,
      username: v.username,
      token: v.token || undefined,
    })
  }
}
