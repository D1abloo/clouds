import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import type { AccessAssignment } from './access-control.demo'

@Component({
  selector: 'app-access-grant-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <article class="access-form">
      <header class="access-form__head">
        <h2 mat-dialog-title>Conceder acceso</h2>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <form [formGroup]="form" (ngSubmit)="handleSubmit()">
        <mat-dialog-content class="access-form__body">
          <label class="access-form__field"><span>Usuario (email)</span><input formControlName="user" placeholder="dev@cloudops" aria-label="Usuario" /></label>
          <label class="access-form__field"><span>Rol</span>
            <select formControlName="role" aria-label="Rol">
              <option value="Developer">Developer</option>
              <option value="Operador">Operador</option>
              <option value="Solo lectura">Solo lectura</option>
              <option value="Super Admin">Super Admin</option>
            </select>
          </label>
          <label class="access-form__field"><span>Ámbito</span>
            <select formControlName="scope" aria-label="Ámbito">
              <option value="Global">Global</option>
              <option value="Staging">Staging</option>
              <option value="Producción">Producción</option>
              <option value="AWS prod">AWS prod</option>
            </select>
          </label>
          <label class="access-form__field access-form__check">
            <input type="checkbox" formControlName="mfa" aria-label="Requerir MFA" />
            <span>Requerir MFA</span>
          </label>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid"><mat-icon>person_add</mat-icon> Conceder</button>
        </mat-dialog-actions>
      </form>
    </article>
  `,
  styles: `
    .access-form { color: #0f172a; min-width: min(400px, 90vw); }
    .access-form__head { display: flex; justify-content: space-between; align-items: center; }
    .access-form__head h2 { margin: 0; font-size: 0.95rem; }
    .access-form__body { display: flex; flex-direction: column; gap: 0.65rem; }
    .access-form__field { display: flex; flex-direction: column; gap: 0.25rem; }
    .access-form__field span { font-size: 0.62rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .access-form__field input, .access-form__field select { padding: 0.45rem 0.55rem; border-radius: 8px; border: 1px solid #e2e8f0; font: inherit; font-size: 0.78rem; }
    .access-form__check { flex-direction: row; align-items: center; gap: 0.4rem; span { text-transform: none; font-size: 0.78rem; color: #475569; } }
  `,
})
export class AccessGrantDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AccessGrantDialogComponent>)

  readonly form = new FormGroup({
    user: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    role: new FormControl('Developer', { nonNullable: true }),
    scope: new FormControl('Staging', { nonNullable: true }),
    mfa: new FormControl(true, { nonNullable: true }),
  })

  handleSubmit = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    const assignment: AccessAssignment = {
      id: `asg-${Date.now()}`,
      user: v.user,
      role: v.role,
      scope: v.scope,
      status: 'running',
      grantedAt: new Date().toISOString(),
      mfa: v.mfa,
    }
    this.dialogRef.close(assignment)
  }
}
