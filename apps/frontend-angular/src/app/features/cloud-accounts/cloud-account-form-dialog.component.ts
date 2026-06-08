import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatExpansionModule } from '@angular/material/expansion'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { ToastService } from '../../core/services/toast.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import type { CloudProvider } from '../../core/models/api.models'
import {
  CLOUD_PROVIDER_CARDS,
  CLOUD_WIZARD_STEPS,
  WIZARD_SUBTITLE,
  credentialTypeLabel,
  maskSecret,
  providerCard,
  type ConnectionProviderId,
  type WizardStep,
} from './cloud-account-wizard.config'
import {
  buildConfigPayload,
  buildCredentialsPayload,
  isWizardFormValid,
  reviewSummaryLine,
} from './cloud-account-wizard.validation'

export interface CloudAccountFormData {
  suggestedProvider?: ConnectionProviderId | CloudProvider
  provider?: ConnectionProviderId | CloudProvider
}

@Component({
  selector: 'app-cloud-account-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    MatExpansionModule,
    BrandLogoComponent,
  ],
  templateUrl: './cloud-account-form-dialog.component.html',
  styleUrl: './cloud-account-form-dialog.component.scss',
})
export class CloudAccountFormDialogComponent {
  readonly data = inject<CloudAccountFormData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<CloudAccountFormDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly accounts = inject(CloudAccountsService)
  private readonly toast = inject(ToastService)
  private readonly pro = inject(ProModeService)

  readonly steps = CLOUD_WIZARD_STEPS
  readonly wizardSubtitle = WIZARD_SUBTITLE
  readonly providerCards = CLOUD_PROVIDER_CARDS
  readonly credentialTypeLabel = credentialTypeLabel
  readonly maskSecret = maskSecret

  readonly step = signal<WizardStep>('provider')
  readonly selectedProvider = signal<ConnectionProviderId | null>(null)
  readonly saving = signal(false)
  readonly validating = signal(false)
  readonly validationResult = signal<{ valid: boolean; message: string } | null>(null)
  readonly permissionsExpanded = signal(false)

  private projectId = ''
  private createdAccountId = ''

  readonly suggestedProvider = computed(
    () => (this.data.suggestedProvider ?? this.data.provider ?? null) as ConnectionProviderId | null,
  )

  readonly stepIndex = computed(() => this.steps.findIndex((s) => s.id === this.step()))

  readonly providerMeta = computed(() => {
    const p = this.selectedProvider()
    return p ? providerCard(p) : undefined
  })

  readonly providerLabel = computed(() => this.providerMeta()?.shortName ?? 'cloud')

  readonly isCloudApiProvider = computed(() => !!this.providerMeta()?.cloudApiProvider)

  readonly reviewDisabled = computed(() => {
    const prov = this.selectedProvider()
    if (!prov || !isWizardFormValid(prov, this.form.getRawValue() as never)) return true
    return !this.validationResult()?.valid
  })

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    accountId: [''],
    defaultRegion: [''],
    credentialType: ['iam_role', Validators.required],
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
    apiToken: [''],
    apiEmail: [''],
    appKey: [''],
    appSecret: [''],
    consumerKey: [''],
    kubeconfig: [''],
    clusterUrl: [''],
    bearerToken: [''],
    dockerHost: [''],
    dockerTlsCert: [''],
    dockerTlsKey: [''],
    dockerTlsCa: [''],
    sshHost: [''],
    sshUser: [''],
    githubOrg: [''],
    gitlabUrl: ['https://gitlab.com'],
    jenkinsUrl: [''],
    jenkinsUser: [''],
    terraformOrg: [''],
    terraformHostname: ['app.terraform.io'],
    encryptCredentials: [true],
    syncOnCreate: [true],
  })

  constructor() {
    this.accounts.defaultProject().subscribe({
      next: (p) => { this.projectId = p.id },
      error: () => {
        if (!this.pro.proMode()) this.projectId = 'demo-project'
      },
    })
    const suggested = this.data.suggestedProvider ?? this.data.provider
    if (suggested) {
      this.selectedProvider.set(suggested as ConnectionProviderId)
      this.applyProviderDefaults(suggested as ConnectionProviderId)
    }
  }

  selectProvider = (id: ConnectionProviderId): void => {
    this.selectedProvider.set(id)
    this.validationResult.set(null)
    this.applyProviderDefaults(id)
  }

  private applyProviderDefaults = (prov: ConnectionProviderId): void => {
    const card = providerCard(prov)
    if (!card) return
    this.form.patchValue({
      credentialType: card.defaultCredentialType,
      defaultRegion: card.defaultRegion ?? '',
    })
  }

  canGoToStep = (target: WizardStep): boolean => {
    const current = this.stepIndex()
    const targetIdx = this.steps.findIndex((s) => s.id === target)
    if (targetIdx <= current) return true
    if (target === 'credentials') return !!this.selectedProvider()
    if (target === 'review') {
      const prov = this.selectedProvider()
      return !!prov && isWizardFormValid(prov, this.form.getRawValue() as never) && !!this.validationResult()?.valid
    }
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
      const prov = this.selectedProvider()
      if (!prov || !isWizardFormValid(prov, this.form.getRawValue() as never)) {
        this.toast.error('Completa los campos obligatorios')
        this.form.markAllAsTouched()
        return
      }
      if (!this.validationResult()?.valid) {
        this.toast.error('Valida la conexión antes de continuar')
        return
      }
      this.step.set('review')
    }
  }

  handleValidateConnection = (): void => {
    const prov = this.selectedProvider()
    const v = this.form.getRawValue()
    if (!prov || !isWizardFormValid(prov, v as never)) {
      this.toast.error('Completa los campos obligatorios antes de validar')
      this.form.markAllAsTouched()
      return
    }

    const cloudProv = this.providerMeta()?.cloudApiProvider
    if (!cloudProv || !this.projectId) {
      this.validating.set(true)
      setTimeout(() => {
        this.validating.set(false)
        this.validationResult.set({
          valid: true,
          message: 'Formato de credenciales correcto. Guarda la conexión para activar la integración.',
        })
      }, 600)
      return
    }

    this.validating.set(true)
    this.accounts
      .validatePreview({
        projectId: this.projectId,
        name: v.name,
        provider: cloudProv,
        accountId: v.accountId || undefined,
        defaultRegion: v.defaultRegion || undefined,
        config: buildConfigPayload(prov, v as never),
        credentials: buildCredentialsPayload(prov, v as never),
      })
      .subscribe({
        next: (r) => {
          this.validating.set(false)
          this.validationResult.set({
            valid: r.valid,
            message: r.valid
              ? (r.message ?? 'Conexión válida — permisos verificados')
              : (r.message ?? 'No se pudo validar la conexión'),
          })
          if (r.valid) this.toast.success('Conexión validada')
          else this.toast.error(r.message ?? 'Validación fallida')
        },
        error: (err) => {
          this.validating.set(false)
          const msg = err?.error?.message ?? 'No se pudo validar la conexión con el servidor'
          this.validationResult.set({ valid: false, message: msg })
          this.toast.error(msg)
        },
      })
  }

  handleSave = (andSync: boolean): void => {
    const prov = this.selectedProvider()
    const v = this.form.getRawValue()
    if (!prov || !isWizardFormValid(prov, v as never)) {
      this.toast.error('Completa el asistente antes de guardar')
      return
    }
    if (!this.projectId) {
      this.toast.error('No se pudo resolver el proyecto. Inicia sesión e inténtalo de nuevo.')
      return
    }

    const cloudProv = this.providerMeta()?.cloudApiProvider
    if (!cloudProv) {
      this.toast.success('Configuración registrada. Completa la conexión en el módulo correspondiente.')
      this.dialogRef.close({ created: true, provider: prov, integrationOnly: true })
      return
    }

    const sync = andSync || v.syncOnCreate
    this.saving.set(true)
    this.accounts
      .create({
        projectId: this.projectId,
        name: v.name,
        provider: cloudProv,
        accountId: v.accountId || undefined,
        defaultRegion: v.defaultRegion || undefined,
        config: buildConfigPayload(prov, v as never),
        credentials: buildCredentialsPayload(prov, v as never),
      })
      .subscribe({
        next: (acc) => {
          this.createdAccountId = acc.id
          if (!sync) {
            this.saving.set(false)
            this.dialogRef.close({ created: true, accountId: acc.id, provider: prov })
            this.toast.success('Conexión guardada — credenciales cifradas de forma segura')
            return
          }
          this.accounts.sync(acc.id).subscribe({
            next: (r) => {
              this.saving.set(false)
              this.toast.success(`Sincronización completada: ${r.instances} recursos, ${r.regions} regiones`)
              this.dialogRef.close({ created: true, synced: true, accountId: acc.id, provider: prov })
            },
            error: () => {
              this.saving.set(false)
              this.toast.error('Conexión guardada pero la sincronización falló')
              this.dialogRef.close({ created: true, accountId: acc.id, provider: prov })
            },
          })
        },
        error: (err) => {
          this.saving.set(false)
          this.toast.error(err?.error?.message ?? 'No se pudo guardar la conexión')
        },
      })
  }

  reviewLine = (): string => {
    const prov = this.selectedProvider()
    if (!prov) return '—'
    return reviewSummaryLine(prov, this.form.getRawValue() as never)
  }
}
