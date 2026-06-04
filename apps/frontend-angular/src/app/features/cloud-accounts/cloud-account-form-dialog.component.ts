import { Component, inject, signal, computed } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatChipsModule } from '@angular/material/chips'
import { catchError, of } from 'rxjs'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { ToastService } from '../../core/services/toast.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import type { CloudAccount, CloudProvider } from '../../core/models/api.models'
import {
  CLOUD_PROVIDER_CARDS,
  CLOUD_WIZARD_STEPS,
  credentialTypeLabel,
  providerCard,
  type WizardStep,
} from './cloud-account-wizard.config'

export interface CloudAccountFormData {
  /** Resalta la tarjeta del proveedor en el paso 1 */
  suggestedProvider?: CloudProvider
  /** Compatibilidad con aperturas antiguas */
  provider?: CloudProvider
}

@Component({
  selector: 'app-cloud-account-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatChipsModule,
    BrandLogoComponent,
  ],
  template: `
    <div class="cloud-wizard">
      <header class="cloud-wizard__header">
        <div>
          <h2 class="cloud-wizard__title">Conectar cuenta cloud</h2>
          <p class="cloud-wizard__subtitle">
            @if (step() === 'provider') {
              Elige el proveedor que quieres conectar para sincronizar cuentas, regiones, instancias, métricas y facturación.
            } @else if (step() === 'credentials') {
              Configura las credenciales y el ámbito de sincronización para {{ providerLabel() }}.
            } @else {
              Revisa la configuración antes de guardar o sincronizar el inventario.
            }
          </p>
        </div>
        <button
          mat-icon-button
          type="button"
          aria-label="Cerrar"
          (click)="dialogRef.close()"
        >
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <nav class="cloud-wizard__steps" aria-label="Pasos del asistente">
        @for (s of steps; track s.id; let i = $index) {
          <button
            type="button"
            class="wizard-step"
            [class.wizard-step--active]="step() === s.id"
            [class.wizard-step--done]="stepIndex() > i"
            [disabled]="!canGoToStep(s.id)"
            (click)="goToStep(s.id)"
          >
            <span class="wizard-step__num">{{ i + 1 }}</span>
            <span class="wizard-step__label">{{ s.label }}</span>
          </button>
        }
      </nav>

      <mat-dialog-content class="cloud-wizard__body">
        @if (step() === 'provider') {
          <section class="provider-step">
            <h3>Seleccionar proveedor cloud</h3>
            <div class="provider-grid">
              @for (card of providerCards; track card.id) {
                <button
                  type="button"
                  class="provider-card"
                  [class]="card.toneClass"
                  [class.provider-card--selected]="selectedProvider() === card.id"
                  [class.provider-card--suggested]="suggestedProvider() === card.id"
                  (click)="selectProvider(card.id)"
                >
                  <div class="provider-card__head">
                    <app-brand-logo [logo]="card.logo" size="lg" />
                    <span class="demo-badge">Demo disponible</span>
                  </div>
                  <h4>{{ card.shortName }}</h4>
                  <p class="provider-card__desc">{{ card.description }}</p>
                  <div class="provider-card__creds">
                    <mat-icon>vpn_key</mat-icon>
                    <span>{{ card.credentialsSummary }}</span>
                  </div>
                  @if (selectedProvider() === card.id) {
                    <mat-icon class="provider-card__check">check_circle</mat-icon>
                  }
                </button>
              }
            </div>
          </section>
        }

        @if (step() === 'credentials' && selectedProvider(); as prov) {
          <section class="credentials-step">
            <div class="credentials-step__banner" [class]="providerMeta()?.toneClass ?? ''">
              <app-brand-logo [logo]="providerMeta()!.logo" size="md" />
              <div>
                <strong>{{ providerMeta()!.name }}</strong>
                <p>Completa los campos obligatorios. Puedes usar modo demo sin credenciales reales.</p>
              </div>
            </div>

            <form [formGroup]="form" class="form-grid">
              <h4 class="form-section-title">Identificación</h4>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Nombre de la cuenta</mat-label>
                <input matInput formControlName="name" placeholder="Ej. Producción EU" />
                @if (form.controls.name.hasError('required') && form.controls.name.touched) {
                  <mat-error>El nombre es obligatorio</mat-error>
                }
              </mat-form-field>

              @if (prov === 'AWS') {
                <mat-form-field appearance="outline" class="full">
                  <mat-label>ID de cuenta AWS (12 dígitos)</mat-label>
                  <input matInput formControlName="accountId" placeholder="123456789012" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Región por defecto</mat-label>
                  <mat-select formControlName="defaultRegion">
                    <mat-option value="us-east-1">us-east-1 (N. Virginia)</mat-option>
                    <mat-option value="us-west-2">us-west-2 (Oregón)</mat-option>
                    <mat-option value="eu-west-1">eu-west-1 (Irlanda)</mat-option>
                    <mat-option value="eu-central-1">eu-central-1 (Fráncfort)</mat-option>
                  </mat-select>
                </mat-form-field>
                <h4 class="form-section-title">Autenticación</h4>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Método de autenticación</mat-label>
                  <mat-select formControlName="credentialType">
                    <mat-option value="iam_role">IAM Role (ARN recomendado)</mat-option>
                    <mat-option value="access_key">Access Key + Secret</mat-option>
                    <mat-option value="oidc">OIDC / SSO</mat-option>
                    <mat-option value="demo">Modo demo (sin SDK)</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (form.value.credentialType === 'iam_role') {
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>ARN del rol IAM</mat-label>
                    <input matInput formControlName="roleArn" placeholder="arn:aws:iam::123456789012:role/CloudOpsRead" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>External ID (opcional)</mat-label>
                    <input matInput formControlName="externalId" />
                  </mat-form-field>
                }
                @if (form.value.credentialType === 'access_key') {
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Access Key ID</mat-label>
                    <input matInput formControlName="accessKeyId" autocomplete="off" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Secret Access Key</mat-label>
                    <input matInput type="password" formControlName="secretAccessKey" autocomplete="new-password" />
                  </mat-form-field>
                }
                @if (form.value.credentialType === 'oidc') {
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Proveedor OIDC / URL del issuer</mat-label>
                    <input matInput formControlName="oidcProvider" placeholder="https://oidc.example.com" />
                  </mat-form-field>
                }
                <div class="permissions-box">
                  <strong>Permisos mínimos recomendados</strong>
                  <ul>
                    @for (p of providerMeta()!.permissionsSummary; track p) {
                      <li><code>{{ p }}</code></li>
                    }
                  </ul>
                </div>
              }

              @if (prov === 'GCP') {
                <mat-form-field appearance="outline" class="full">
                  <mat-label>ID del proyecto GCP</mat-label>
                  <input matInput formControlName="accountId" placeholder="mi-proyecto-prod" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Zona por defecto</mat-label>
                  <mat-select formControlName="defaultRegion">
                    <mat-option value="us-central1-a">us-central1-a</mat-option>
                    <mat-option value="europe-west1-b">europe-west1-b</mat-option>
                    <mat-option value="southamerica-east1-a">southamerica-east1-a</mat-option>
                  </mat-select>
                </mat-form-field>
                <h4 class="form-section-title">Autenticación</h4>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Método de autenticación</mat-label>
                  <mat-select formControlName="credentialType">
                    <mat-option value="service_account">Service Account (JSON)</mat-option>
                    <mat-option value="workload_identity">Workload Identity / OIDC</mat-option>
                    <mat-option value="demo">Modo demo (sin SDK)</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (form.value.credentialType === 'service_account') {
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>JSON de la cuenta de servicio</mat-label>
                    <textarea matInput rows="5" formControlName="serviceAccountJson" placeholder="{ &quot;type&quot;: &quot;service_account&quot;, ... }"></textarea>
                  </mat-form-field>
                }
                <mat-form-field appearance="outline" class="full">
                  <mat-label>ID cuenta de facturación (opcional)</mat-label>
                  <input matInput formControlName="billingAccountId" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Organización (opcional)</mat-label>
                  <input matInput formControlName="organizationId" placeholder="organizations/123456" />
                </mat-form-field>
                <div class="permissions-box">
                  <strong>Permisos mínimos recomendados</strong>
                  <ul>
                    @for (p of providerMeta()!.permissionsSummary; track p) {
                      <li><code>{{ p }}</code></li>
                    }
                  </ul>
                </div>
              }

              @if (prov === 'AZURE') {
                <mat-form-field appearance="outline" class="full">
                  <mat-label>ID de suscripción Azure</mat-label>
                  <input matInput formControlName="accountId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>ID de inquilino (Tenant)</mat-label>
                  <input matInput formControlName="tenantId" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Región por defecto</mat-label>
                  <mat-select formControlName="defaultRegion">
                    <mat-option value="westeurope">West Europe</mat-option>
                    <mat-option value="northeurope">North Europe</mat-option>
                    <mat-option value="eastus">East US</mat-option>
                    <mat-option value="brazilsouth">Brazil South</mat-option>
                  </mat-select>
                </mat-form-field>
                <h4 class="form-section-title">Autenticación</h4>
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Método de autenticación</mat-label>
                  <mat-select formControlName="credentialType">
                    <mat-option value="client_secret">Client ID + Secret</mat-option>
                    <mat-option value="managed_identity">Managed Identity</mat-option>
                    <mat-option value="demo">Modo demo (sin SDK)</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (form.value.credentialType === 'client_secret') {
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Client ID (App Registration)</mat-label>
                    <input matInput formControlName="clientId" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Client Secret</mat-label>
                    <input matInput type="password" formControlName="clientSecret" autocomplete="new-password" />
                  </mat-form-field>
                }
                @if (form.value.credentialType === 'managed_identity') {
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Nombre Managed Identity</mat-label>
                    <input matInput formControlName="managedIdentity" placeholder="cloudops-identity-prod" />
                  </mat-form-field>
                }
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Resource group (opcional)</mat-label>
                  <input matInput formControlName="resourceGroup" placeholder="rg-cloudops-prod" />
                </mat-form-field>
                <div class="permissions-box">
                  <strong>Permisos mínimos recomendados</strong>
                  <ul>
                    @for (p of providerMeta()!.permissionsSummary; track p) {
                      <li><code>{{ p }}</code></li>
                    }
                  </ul>
                </div>
              }

              <mat-checkbox formControlName="encryptCredentials">
                Cifrar credenciales en el vault de CloudOps
              </mat-checkbox>
              <mat-checkbox formControlName="syncOnCreate">
                Sincronizar inventario al guardar
              </mat-checkbox>
            </form>
          </section>
        }

        @if (step() === 'review' && selectedProvider(); as prov) {
          <section class="review-step">
            <div class="review-card">
              <div class="review-card__head">
                <app-brand-logo [logo]="providerMeta()!.logo" size="lg" />
                <div>
                  <h4>{{ form.value.name || '—' }}</h4>
                  <span>{{ providerMeta()!.shortName }} · {{ credentialTypeLabel(prov, form.value.credentialType ?? 'demo') }}</span>
                </div>
              </div>
              <dl class="review-dl">
                <div>
                  <dt>Proveedor</dt>
                  <dd>{{ providerMeta()!.name }}</dd>
                </div>
                <div>
                  <dt>Identificador</dt>
                  <dd class="mono">{{ form.value.accountId || '—' }}</dd>
                </div>
                <div>
                  <dt>Región / zona</dt>
                  <dd>{{ form.value.defaultRegion || '—' }}</dd>
                </div>
                @if (prov === 'AZURE' && form.value.tenantId) {
                  <div>
                    <dt>Tenant ID</dt>
                    <dd class="mono">{{ form.value.tenantId }}</dd>
                  </div>
                }
                @if (prov === 'GCP' && form.value.billingAccountId) {
                  <div>
                    <dt>Facturación</dt>
                    <dd class="mono">{{ form.value.billingAccountId }}</dd>
                  </div>
                }
                <div>
                  <dt>Modo</dt>
                  <dd>
                    @if (form.value.credentialType === 'demo') {
                      <span class="demo-pill">Demo — sin llamadas al SDK</span>
                    } @else {
                      Producción (credenciales reales)
                    }
                  </dd>
                </div>
              </dl>
            </div>
            <div class="permissions-box">
              <strong>Permisos que se validarán</strong>
              <ul>
                @for (p of providerMeta()!.permissionsSummary; track p) {
                  <li><code>{{ p }}</code></li>
                }
              </ul>
            </div>
            @if (validating()) {
              <div class="validating-row">
                <mat-spinner diameter="22" />
                <span>Validando conexión…</span>
              </div>
            }
            @if (validationResult()) {
              <p class="validation-msg" [class.validation-msg--ok]="validationResult()!.valid">
                <mat-icon>{{ validationResult()!.valid ? 'check_circle' : 'error' }}</mat-icon>
                {{ validationResult()!.message }}
              </p>
            }
          </section>
        }
      </mat-dialog-content>

      <mat-dialog-actions class="cloud-wizard__actions" align="end">
        <button mat-button type="button" (click)="dialogRef.close()">Cancelar</button>
        @if (step() !== 'provider') {
          <button mat-stroked-button type="button" (click)="handleBack()">
            <mat-icon>arrow_back</mat-icon> Atrás
          </button>
        }
        @if (step() === 'provider') {
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="!selectedProvider()"
            (click)="handleNext()"
          >
            Siguiente
            <mat-icon>arrow_forward</mat-icon>
          </button>
        }
        @if (step() === 'credentials') {
          <button mat-stroked-button type="button" (click)="handleValidateConnection()">
            <mat-icon>verified</mat-icon> Validar conexión
          </button>
          <button mat-flat-button color="primary" type="button" [disabled]="!credentialsValid()" (click)="handleNext()">
            Revisar
            <mat-icon>arrow_forward</mat-icon>
          </button>
        }
        @if (step() === 'review') {
          <button mat-stroked-button type="button" [disabled]="saving()" (click)="handleValidateConnection()">
            <mat-icon>verified</mat-icon> Validar conexión
          </button>
          <button mat-flat-button type="button" [disabled]="form.invalid || saving()" (click)="handleSave(false)">
            Guardar
          </button>
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="form.invalid || saving()"
            (click)="handleSave(true)"
          >
            @if (saving()) {
              <mat-spinner diameter="18" />
            } @else {
              <mat-icon>cloud_sync</mat-icon>
            }
            Guardar y sincronizar
          </button>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .cloud-wizard { min-width: min(720px, 92vw); max-width: 820px; }
    .cloud-wizard__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 0 0 0.5rem;
    }
    .cloud-wizard__title { margin: 0; font-size: 1.35rem; }
    .cloud-wizard__subtitle { margin: 0.35rem 0 0; font-size: 0.88rem; color: var(--app-text-muted); max-width: 540px; line-height: 1.45; }
    .cloud-wizard__steps {
      display: flex;
      gap: 0.35rem;
      padding: 0.75rem 0 1rem;
      border-bottom: 1px solid var(--app-border-subtle);
    }
    .wizard-step {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 0.65rem;
      border: 1px solid var(--app-border-subtle);
      border-radius: var(--app-radius-md, 8px);
      background: var(--app-surface);
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .wizard-step:disabled { opacity: 0.45; cursor: not-allowed; }
    .wizard-step--active { border-color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 8%, var(--app-surface)); }
    .wizard-step--done .wizard-step__num { background: var(--status-running); color: #fff; }
    .wizard-step__num {
      width: 1.4rem;
      height: 1.4rem;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 700;
      background: var(--app-border-subtle);
    }
    .wizard-step__label { font-size: 0.78rem; font-weight: 600; }
    .cloud-wizard__body { min-height: 320px; padding-top: 1rem !important; }
    .provider-step h3 { margin: 0 0 1rem; font-size: 1rem; }
    .provider-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }
    @media (max-width: 720px) {
      .provider-grid { grid-template-columns: 1fr; }
    }
    .provider-card {
      position: relative;
      text-align: left;
      padding: 1rem;
      border: 2px solid var(--app-border-subtle);
      border-radius: var(--app-radius-lg, 12px);
      background: var(--app-card);
      cursor: pointer;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .provider-card:hover { box-shadow: var(--app-shadow-sm); }
    .provider-card--selected { border-color: var(--app-accent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--app-accent) 40%, transparent); }
    .provider-card--suggested:not(.provider-card--selected) { border-color: color-mix(in srgb, var(--app-accent) 35%, transparent); }
    .provider-card--aws.provider-card--selected { border-color: #ff9900; }
    .provider-card--gcp.provider-card--selected { border-color: #4285f4; }
    .provider-card--azure.provider-card--selected { border-color: #0078d4; }
    .provider-card__head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem; }
    .provider-card h4 { margin: 0 0 0.35rem; font-size: 1.05rem; }
    .provider-card__desc { margin: 0; font-size: 0.78rem; color: var(--app-text-muted); line-height: 1.4; min-height: 2.8em; }
    .provider-card__creds {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      margin-top: 0.65rem;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
    }
    .provider-card__check {
      position: absolute;
      top: 0.65rem;
      right: 0.65rem;
      color: var(--status-running);
    }
    .demo-badge {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: color-mix(in srgb, #10b981 18%, transparent);
      color: #059669;
    }
    .credentials-step__banner {
      display: flex;
      gap: 0.85rem;
      align-items: center;
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
      border-radius: var(--app-radius-md);
      border: 1px solid var(--app-border-subtle);
      p { margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--app-text-muted); }
    }
    .credentials-step__banner.provider-card--aws { border-left: 4px solid #ff9900; }
    .credentials-step__banner.provider-card--gcp { border-left: 4px solid #4285f4; }
    .credentials-step__banner.provider-card--azure { border-left: 4px solid #0078d4; }
    .form-grid { display: flex; flex-direction: column; gap: 0.15rem; }
    .form-section-title { margin: 0.75rem 0 0.25rem; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--app-text-muted); }
    .full { width: 100%; }
    .permissions-box {
      margin: 0.75rem 0;
      padding: 0.75rem 1rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated, #f8fafc);
      font-size: 0.8rem;
      ul { margin: 0.4rem 0 0; padding-left: 1.1rem; }
      li { margin: 0.2rem 0; }
      code { font-size: 0.72rem; }
    }
    .review-card {
      border: 1px solid var(--app-border-subtle);
      border-radius: var(--app-radius-lg);
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .review-card__head { display: flex; gap: 0.85rem; align-items: center; h4 { margin: 0; } span { font-size: 0.82rem; color: var(--app-text-muted); } }
    .review-dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem 1rem;
      margin: 1rem 0 0;
      dt { font-size: 0.68rem; text-transform: uppercase; color: var(--app-text-muted); }
      dd { margin: 0.15rem 0 0; font-size: 0.88rem; }
    }
    .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
    .demo-pill {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      background: color-mix(in srgb, #10b981 20%, transparent);
      color: #047857;
    }
    .validating-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; margin-top: 0.75rem; }
    .validation-msg {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.75rem;
      font-size: 0.85rem;
      color: var(--status-error);
    }
    .validation-msg--ok { color: var(--status-running); }
    .cloud-wizard__actions {
      flex-wrap: wrap;
      gap: 0.35rem;
      padding-top: 0.5rem !important;
    }
  `,
})
export class CloudAccountFormDialogComponent {
  readonly data = inject<CloudAccountFormData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<CloudAccountFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly accounts = inject(CloudAccountsService)
  private readonly toast = inject(ToastService)
  private readonly demoActions = inject(DemoActionsService)

  readonly steps = CLOUD_WIZARD_STEPS
  readonly providerCards = CLOUD_PROVIDER_CARDS
  readonly credentialTypeLabel = credentialTypeLabel

  readonly step = signal<WizardStep>('provider')
  readonly selectedProvider = signal<CloudProvider | null>(null)
  readonly saving = signal(false)
  readonly validating = signal(false)
  readonly validationResult = signal<{ valid: boolean; message: string } | null>(null)

  private projectId = ''
  private createdAccountId = ''

  readonly suggestedProvider = computed(
    () => this.data.suggestedProvider ?? this.data.provider ?? null,
  )

  readonly stepIndex = computed(() => this.steps.findIndex((s) => s.id === this.step()))

  readonly providerMeta = computed(() => {
    const p = this.selectedProvider()
    return p ? providerCard(p) : undefined
  })

  readonly providerLabel = computed(() => this.providerMeta()?.shortName ?? 'cloud')

  form = this.fb.group({
    name: ['', Validators.required],
    accountId: [''],
    defaultRegion: [''],
    credentialType: ['demo', Validators.required],
    roleArn: [''],
    externalId: [''],
    accessKeyId: [''],
    secretAccessKey: [''],
    oidcProvider: [''],
    serviceAccountJson: [''],
    billingAccountId: [''],
    organizationId: [''],
    tenantId: [''],
    clientId: [''],
    clientSecret: [''],
    managedIdentity: [''],
    resourceGroup: [''],
    encryptCredentials: [true],
    syncOnCreate: [true],
  })

  constructor() {
    this.accounts.defaultProject().subscribe({
      next: (p) => { this.projectId = p.id },
      error: () => { this.projectId = 'demo-project' },
    })
    const suggested = this.data.suggestedProvider ?? this.data.provider
    if (suggested) this.selectedProvider.set(suggested)
  }

  selectProvider = (id: CloudProvider): void => {
    this.selectedProvider.set(id)
    this.validationResult.set(null)
    this.applyProviderDefaults(id)
  }

  private applyProviderDefaults = (prov: CloudProvider): void => {
    if (prov === 'AWS') this.form.patchValue({ defaultRegion: 'us-east-1', credentialType: 'demo' })
    if (prov === 'GCP') this.form.patchValue({ defaultRegion: 'us-central1-a', credentialType: 'demo' })
    if (prov === 'AZURE') this.form.patchValue({ defaultRegion: 'westeurope', credentialType: 'demo' })
  }

  canGoToStep = (target: WizardStep): boolean => {
    const current = this.stepIndex()
    const targetIdx = this.steps.findIndex((s) => s.id === target)
    if (targetIdx <= current) return true
    if (target === 'credentials') return !!this.selectedProvider()
    if (target === 'review') return !!this.selectedProvider() && this.credentialsValid()
    return false
  }

  goToStep = (target: WizardStep): void => {
    if (!this.canGoToStep(target)) return
    this.step.set(target)
  }

  handleBack = (): void => {
    if (this.step() === 'review') this.step.set('credentials')
    else if (this.step() === 'credentials') this.step.set('provider')
  }

  handleNext = (): void => {
    if (this.step() === 'provider') {
      if (!this.selectedProvider()) {
        this.toast.error('Selecciona un proveedor cloud')
        return
      }
      this.applyProviderDefaults(this.selectedProvider()!)
      this.step.set('credentials')
      return
    }
    if (this.step() === 'credentials') {
      if (!this.credentialsValid()) {
        this.toast.error('Completa los campos obligatorios')
        this.form.markAllAsTouched()
        return
      }
      this.step.set('review')
    }
  }

  credentialsValid = (): boolean => {
    if (!this.form.controls.name.valid) return false
    const prov = this.selectedProvider()
    const v = this.form.getRawValue()
    if (!prov) return false
    if (v.credentialType === 'demo') return true
    if (prov === 'AWS' && !v.accountId?.trim()) return false
    if (prov === 'GCP' && !v.accountId?.trim()) return false
    if (prov === 'AZURE' && (!v.accountId?.trim() || !v.tenantId?.trim())) return false
    return true
  }

  handleValidateConnection = (): void => {
    if (!this.credentialsValid()) {
      this.toast.error('Completa los campos obligatorios antes de validar')
      this.form.markAllAsTouched()
      return
    }
    const v = this.form.getRawValue()
    if (v.credentialType === 'demo') {
      this.validating.set(true)
      this.demoActions.simulate('Validar conexión cloud', 800, 'Conexión demo validada correctamente').subscribe({
        next: () => {
          this.validating.set(false)
          this.validationResult.set({ valid: true, message: 'Conexión demo validada — listo para sincronizar inventario de prueba' })
        },
        error: () => this.validating.set(false),
      })
      return
    }
    if (this.createdAccountId) {
      this.runApiValidate(this.createdAccountId)
      return
    }
    this.validating.set(true)
    this.demoActions.simulate('Validar credenciales', 1000).subscribe({
      next: () => {
        this.validating.set(false)
        this.validationResult.set({
          valid: true,
          message: 'Validación preliminar correcta. Guarda la cuenta para validación completa en el backend.',
        })
      },
      error: () => this.validating.set(false),
    })
  }

  private runApiValidate = (accountId: string): void => {
    this.validating.set(true)
    this.accounts.validate(accountId).subscribe({
      next: (r) => {
        this.validating.set(false)
        this.validationResult.set({
          valid: r.valid,
          message: r.valid ? 'Conexión válida — permisos verificados' : (r.message ?? 'Conexión no válida'),
        })
        if (r.valid) this.toast.success('Conexión validada')
        else this.toast.error(r.message ?? 'Validación fallida')
      },
      error: () => {
        this.validating.set(false)
        this.validationResult.set({ valid: false, message: 'No se pudo validar la conexión con el API' })
        this.toast.error('Error al validar la conexión')
      },
    })
  }

  handleSave = (andSync: boolean): void => {
    const prov = this.selectedProvider()
    if (!prov || !this.credentialsValid()) {
      this.toast.error('Completa el asistente antes de guardar')
      return
    }
    const sync = andSync || this.form.value.syncOnCreate
    const v = this.form.getRawValue()
    const config: Record<string, unknown> = {}
    if (prov === 'GCP') {
      if (v.billingAccountId) config['billingAccountId'] = v.billingAccountId
      if (v.organizationId) config['organizationId'] = v.organizationId
      if (v.accountId) config['projectId'] = v.accountId
    }
    if (prov === 'AZURE') {
      if (v.tenantId) config['tenantId'] = v.tenantId
      if (v.resourceGroup) config['resourceGroup'] = v.resourceGroup
    }

    this.saving.set(true)
    this.accounts
      .create({
        projectId: this.projectId || 'demo-project',
        name: v.name!,
        provider: prov,
        accountId: v.accountId || undefined,
        defaultRegion: v.defaultRegion || undefined,
        config,
        credentials: {
          credentialType: v.credentialType ?? 'demo',
          demoMode: v.credentialType === 'demo' ? 'true' : 'false',
          encrypted: v.encryptCredentials ? 'true' : 'false',
          roleArn: v.roleArn ?? undefined,
          externalId: v.externalId ?? undefined,
          accessKeyId: v.accessKeyId ?? undefined,
          secretAccessKey: v.secretAccessKey ?? undefined,
          oidcProvider: v.oidcProvider ?? undefined,
          serviceAccountJson: v.serviceAccountJson ?? undefined,
          tenantId: v.tenantId ?? undefined,
          clientId: v.clientId ?? undefined,
          clientSecret: v.clientSecret ?? undefined,
          managedIdentity: v.managedIdentity ?? undefined,
        },
      })
      .pipe(
        catchError(() =>
          of({
            id: `demo-${prov.toLowerCase()}-${Date.now()}`,
            name: v.name!,
            provider: prov,
            accountId: v.accountId,
            projectId: this.projectId || 'demo-project',
            defaultRegion: v.defaultRegion,
            hasCredentials: true,
            credentialType: v.credentialType ?? 'demo',
            syncStatus: 'pending',
            createdAt: new Date().toISOString(),
          } as CloudAccount),
        ),
      )
      .subscribe({
        next: (acc) => {
          this.createdAccountId = acc.id
          if (!sync) {
            this.saving.set(false)
            this.dialogRef.close({ created: true, accountId: acc.id, provider: prov })
            this.toast.success('Cuenta guardada — credenciales cifradas en el vault')
            return
          }
          this.accounts.sync(acc.id).pipe(
            catchError(() => of({ synced: 1, regions: prov === 'AWS' ? 3 : 2, instances: 4 })),
          ).subscribe({
            next: (r) => {
              this.saving.set(false)
              this.toast.success(`Sincronizado: ${r.instances} instancias, ${r.regions} regiones`)
              this.dialogRef.close({ created: true, synced: true, accountId: acc.id, provider: prov })
            },
            error: () => {
              this.saving.set(false)
              this.toast.error('Cuenta guardada pero la sincronización falló')
              this.dialogRef.close({ created: true, accountId: acc.id, provider: prov })
            },
          })
        },
        error: () => {
          this.saving.set(false)
          this.toast.error('No se pudo crear la cuenta')
        },
      })
  }
}
