import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import type { SecretRecord, SecretType } from './secrets-manager.demo'
import { SECRET_TYPE_LABELS } from './secrets-manager.demo'

@Component({
  selector: 'app-secret-add-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <article class="secret-form">
      <header class="secret-form__head">
        <h2 mat-dialog-title>Añadir secreto</h2>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <form [formGroup]="form" (ngSubmit)="handleSubmit()">
        <mat-dialog-content class="secret-form__body">
          <label class="secret-form__field">
            <span>Nombre</span>
            <input formControlName="name" placeholder="aws-prod-deploy" aria-label="Nombre del secreto" />
          </label>
          <label class="secret-form__field">
            <span>Tipo</span>
            <select formControlName="type" aria-label="Tipo de secreto">
              @for (t of types; track t) {
                <option [value]="t">{{ typeLabel(t) }}</option>
              }
            </select>
          </label>
          <label class="secret-form__field">
            <span>Referencia Vault</span>
            <input formControlName="reference" placeholder="vault/aws/prod#deploy" aria-label="Referencia" />
          </label>
          <label class="secret-form__field">
            <span>Propietario</span>
            <input formControlName="owner" placeholder="admin@cloudops" aria-label="Propietario" />
          </label>
          <label class="secret-form__field">
            <span>Fecha de expiración</span>
            <input formControlName="expires" type="date" aria-label="Expiración" />
          </label>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
            <mat-icon>add</mat-icon> Crear secreto
          </button>
        </mat-dialog-actions>
      </form>
    </article>
  `,
  styles: `
    .secret-form { color: #0f172a; min-width: min(420px, 90vw); }
    .secret-form__head { display: flex; justify-content: space-between; align-items: center; }
    .secret-form__head h2 { margin: 0; font-size: 0.95rem; }
    .secret-form__body { display: flex; flex-direction: column; gap: 0.65rem; padding-top: 0.5rem !important; }
    .secret-form__field { display: flex; flex-direction: column; gap: 0.25rem; }
    .secret-form__field span { font-size: 0.62rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .secret-form__field input, .secret-form__field select {
      padding: 0.45rem 0.55rem; border-radius: 8px; border: 1px solid #e2e8f0; font: inherit; font-size: 0.78rem;
    }
  `,
})
export class SecretAddDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SecretAddDialogComponent>)

  readonly types: SecretType[] = ['cloud', 'ssh', 'api', 'vault', 'db']
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<SecretType>('cloud', { nonNullable: true }),
    reference: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    owner: new FormControl('admin@cloudops', { nonNullable: true }),
    expires: new FormControl('', { nonNullable: true }),
  })

  typeLabel = (t: SecretType): string => SECRET_TYPE_LABELS[t]

  handleSubmit = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    const secret: SecretRecord = {
      id: `sec-${Date.now()}`,
      name: v.name,
      type: v.type,
      reference: v.reference,
      expires: v.expires || '—',
      status: 'running',
      owner: v.owner,
      lastRotated: new Date().toISOString(),
      environments: ['staging'],
    }
    this.dialogRef.close(secret)
  }
}
