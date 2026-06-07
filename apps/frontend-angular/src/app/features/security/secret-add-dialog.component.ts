import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { SECURITY_ACCENT, SECURITY_ACCENT_BORDER } from './security.config'
import type { SecretRecord, SecretType } from './secrets-manager.demo'
import { SECRET_TYPE_LABELS } from './secrets-manager.demo'

@Component({
  selector: 'app-secret-add-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <article class="sec-add">
      <header class="sec-add__head">
        <div>
          <span class="sec-add__label">Nuevo secreto</span>
          <h2 mat-dialog-title>Añadir secreto</h2>
          <p>Registra una referencia Vault. El valor real nunca se almacena en la plataforma.</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <form [formGroup]="form" (ngSubmit)="handleSubmit()">
        <mat-dialog-content class="sec-add__body">
          <label class="sec-add__field">
            <span>Nombre</span>
            <input formControlName="name" placeholder="aws-prod-deploy" aria-label="Nombre del secreto" />
          </label>
          <div class="sec-add__row">
            <label class="sec-add__field">
              <span>Tipo</span>
              <select formControlName="type" aria-label="Tipo de secreto">
                @for (t of types; track t) {
                  <option [value]="t">{{ typeLabel(t) }}</option>
                }
              </select>
            </label>
            <label class="sec-add__field">
              <span>Entorno</span>
              <select formControlName="environment" aria-label="Entorno">
                <option value="staging">Staging</option>
                <option value="prod">Producción</option>
                <option value="ci">CI/CD</option>
                <option value="global">Global</option>
              </select>
            </label>
          </div>
          <label class="sec-add__field">
            <span>Referencia Vault</span>
            <input formControlName="reference" placeholder="vault/aws/prod#deploy" aria-label="Referencia" />
          </label>
          <label class="sec-add__field">
            <span>Descripción</span>
            <textarea formControlName="description" rows="2" placeholder="Uso previsto del secreto…" aria-label="Descripción"></textarea>
          </label>
          <div class="sec-add__row">
            <label class="sec-add__field">
              <span>Propietario</span>
              <input formControlName="owner" placeholder="admin@cloudops" aria-label="Propietario" />
            </label>
            <label class="sec-add__field">
              <span>Fecha de expiración</span>
              <input formControlName="expires" type="date" aria-label="Expiración" />
            </label>
          </div>
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
    .sec-add { width: 100%; color: #0f172a; }
    .sec-add__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding-bottom: 0.65rem; border-bottom: 1px solid #e2e8f0; }
    .sec-add__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: ${SECURITY_ACCENT}; }
    .sec-add__head h2 { margin: 0.15rem 0 0; font-size: 1rem; font-weight: 700; }
    .sec-add__head p { margin: 0.2rem 0 0; font-size: 0.68rem; color: #64748b; }
    .sec-add__body { display: flex; flex-direction: column; gap: 0.65rem; padding-top: 0.65rem !important; }
    .sec-add__row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    .sec-add__field { display: flex; flex-direction: column; gap: 0.25rem; }
    .sec-add__field span { font-size: 0.62rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .sec-add__field input, .sec-add__field select, .sec-add__field textarea {
      padding: 0.45rem 0.55rem; border-radius: 8px; border: 1px solid ${SECURITY_ACCENT_BORDER}; font: inherit; font-size: 0.78rem;
    }
    .sec-add__field textarea { resize: vertical; min-height: 2.5rem; }
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
    description: new FormControl('', { nonNullable: true }),
    environment: new FormControl('staging', { nonNullable: true }),
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
      environments: [v.environment],
      description: v.description || undefined,
      accessCount30d: 0,
      lastAccess: new Date().toISOString(),
    }
    this.dialogRef.close(secret)
  }
}
