import { Component, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { ToastService } from '../../core/services/toast.service'
import { CloudProvider } from '../../core/models/api.models'

export interface CloudAccountFormData {
  provider: CloudProvider
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
  ],
  template: `
    <h2 mat-dialog-title>Add {{ data.provider }} account</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Account name</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>

        @if (data.provider === 'AWS') {
          <mat-form-field appearance="outline" class="full">
            <mat-label>AWS Account ID</mat-label>
            <input matInput formControlName="accountId" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Default region</mat-label>
            <input matInput formControlName="defaultRegion" placeholder="us-east-1" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Auth method</mat-label>
            <mat-select formControlName="credentialType">
              <mat-option value="iam_role">IAM Role ARN</mat-option>
              <mat-option value="access_key">Access Key + Secret</mat-option>
              <mat-option value="oidc">OIDC</mat-option>
              <mat-option value="demo">Demo (no SDK)</mat-option>
            </mat-select>
          </mat-form-field>
          @if (form.value.credentialType === 'iam_role') {
            <mat-form-field appearance="outline" class="full">
              <mat-label>Role ARN</mat-label>
              <input matInput formControlName="roleArn" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>External ID (optional)</mat-label>
              <input matInput formControlName="externalId" />
            </mat-form-field>
          }
          @if (form.value.credentialType === 'access_key') {
            <mat-form-field appearance="outline" class="full">
              <mat-label>Access Key ID</mat-label>
              <input matInput formControlName="accessKeyId" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Secret Access Key</mat-label>
              <input matInput type="password" formControlName="secretAccessKey" />
            </mat-form-field>
          }
          <p class="hint">Permissions: EC2 read/list, start/stop, CloudWatch, Cost Explorer, VPC/SG read.</p>
        }

        @if (data.provider === 'GCP') {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Project ID</mat-label>
            <input matInput formControlName="accountId" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Default zone</mat-label>
            <input matInput formControlName="defaultRegion" placeholder="us-central1-a" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Auth method</mat-label>
            <mat-select formControlName="credentialType">
              <mat-option value="service_account">Service Account JSON</mat-option>
              <mat-option value="workload_identity">Workload Identity / OIDC</mat-option>
              <mat-option value="demo">Demo (no SDK)</mat-option>
            </mat-select>
          </mat-form-field>
          @if (form.value.credentialType === 'service_account') {
            <mat-form-field appearance="outline" class="full">
              <mat-label>Service Account JSON</mat-label>
              <textarea matInput rows="4" formControlName="serviceAccountJson"></textarea>
            </mat-form-field>
          }
          <mat-form-field appearance="outline" class="full">
            <mat-label>Billing Account ID (optional)</mat-label>
            <input matInput formControlName="billingAccountId" />
          </mat-form-field>
          <p class="hint">Permissions: Compute Viewer, limited Instance Admin, Monitoring, Billing Viewer.</p>
        }

        @if (data.provider === 'AZURE') {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Subscription name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Subscription ID</mat-label>
            <input matInput formControlName="accountId" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Tenant ID</mat-label>
            <input matInput formControlName="tenantId" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Default region</mat-label>
            <input matInput formControlName="defaultRegion" placeholder="westeurope" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Auth method</mat-label>
            <mat-select formControlName="credentialType">
              <mat-option value="client_secret">Client ID + Secret</mat-option>
              <mat-option value="managed_identity">Managed Identity</mat-option>
              <mat-option value="demo">Demo (no SDK)</mat-option>
            </mat-select>
          </mat-form-field>
          @if (form.value.credentialType === 'client_secret') {
            <mat-form-field appearance="outline" class="full">
              <mat-label>Client ID</mat-label>
              <input matInput formControlName="clientId" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Client Secret</mat-label>
              <input matInput type="password" formControlName="clientSecret" />
            </mat-form-field>
          }
          <mat-form-field appearance="outline" class="full">
            <mat-label>Resource Group (optional)</mat-label>
            <input matInput formControlName="resourceGroup" />
          </mat-form-field>
          <p class="hint">Permissions: Reader, VM Contributor (limited), Monitoring, Cost Management.</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
      <button mat-stroked-button type="button" [disabled]="saving()" (click)="handleValidate()">Validate connection</button>
      <button mat-flat-button color="primary" type="button" [disabled]="form.invalid || saving()" (click)="handleSave(true)">
        Save &amp; sync
      </button>
      <button mat-flat-button type="button" [disabled]="form.invalid || saving()" (click)="handleSave(false)">Save</button>
    </mat-dialog-actions>
  `,
  styles: `
    .form-grid { display: flex; flex-direction: column; gap: 0.25rem; min-width: 420px; }
    .full { width: 100%; }
    .hint { font-size: 0.75rem; color: var(--app-text-muted); margin: 0.5rem 0; }
  `,
})
export class CloudAccountFormDialogComponent {
  readonly data = inject<CloudAccountFormData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<CloudAccountFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly accounts = inject(CloudAccountsService)
  private readonly toast = inject(ToastService)

  readonly saving = signal(false)
  private projectId = ''
  private createdAccountId = ''

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
    tenantId: [''],
    clientId: [''],
    clientSecret: [''],
    managedIdentity: [''],
    resourceGroup: [''],
  })

  constructor() {
    this.accounts.defaultProject().subscribe({
      next: (p) => { this.projectId = p.id },
      error: () => { this.projectId = '' },
    })
    if (this.data.provider === 'AWS') this.form.patchValue({ defaultRegion: 'us-east-1', credentialType: 'demo' })
    if (this.data.provider === 'GCP') this.form.patchValue({ defaultRegion: 'us-central1-a', credentialType: 'demo' })
    if (this.data.provider === 'AZURE') this.form.patchValue({ defaultRegion: 'westeurope', credentialType: 'demo' })
  }

  handleValidate = (): void => {
    if (!this.createdAccountId) {
      this.toast.error('Save the account first, then validate')
      return
    }
    this.accounts.validate(this.createdAccountId).subscribe({
      next: (r) => this.toast.success(r.valid ? 'Connection valid' : (r.message ?? 'Invalid')),
      error: () => this.toast.error('Validation failed'),
    })
  }

  handleSave = (andSync: boolean): void => {
    if (this.form.invalid || !this.projectId) {
      this.toast.error('Complete the form and ensure default project exists')
      return
    }
    const v = this.form.getRawValue()
    const config: Record<string, unknown> = {}
    if (this.data.provider === 'GCP' && v.billingAccountId) config['billingAccountId'] = v.billingAccountId
    if (this.data.provider === 'AZURE') {
      if (v.tenantId) config['tenantId'] = v.tenantId
      if (v.resourceGroup) config['resourceGroup'] = v.resourceGroup
    }
    if (this.data.provider === 'GCP' && v.accountId) config['projectId'] = v.accountId

    this.saving.set(true)
    this.accounts
      .create({
        projectId: this.projectId,
        name: v.name!,
        provider: this.data.provider,
        accountId: v.accountId || undefined,
        defaultRegion: v.defaultRegion || undefined,
        config,
        credentials: {
          credentialType: v.credentialType ?? 'demo',
          demoMode: v.credentialType === 'demo' ? 'true' : 'false',
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
      .subscribe({
        next: (acc) => {
          this.createdAccountId = acc.id
          if (!andSync) {
            this.saving.set(false)
            this.dialogRef.close({ created: true, accountId: acc.id })
            this.toast.success('Account saved — credentials encrypted in vault')
            return
          }
          this.accounts.sync(acc.id).subscribe({
            next: (r) => {
              this.saving.set(false)
              this.toast.success(`Synced ${r.instances} instances, ${r.regions} regions`)
              this.dialogRef.close({ created: true, synced: true, accountId: acc.id })
            },
            error: () => {
              this.saving.set(false)
              this.toast.error('Account saved but sync failed')
              this.dialogRef.close({ created: true, accountId: acc.id })
            },
          })
        },
        error: () => {
          this.saving.set(false)
          this.toast.error('Could not create account')
        },
      })
  }
}
