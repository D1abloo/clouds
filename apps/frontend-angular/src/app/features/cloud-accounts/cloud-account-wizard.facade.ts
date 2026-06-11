import { Injectable, inject, signal, computed } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { ToastService } from '../../core/services/toast.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import type { CloudProvider } from '../../core/models/api.models'
import {
  CLOUD_WIZARD_STEPS,
  WIZARD_SUBTITLE,
  CLOUD_PROVIDER_CARDS,
  CLOUD_WIZARD_CARDS,
  VPS_WIZARD_CARDS,
  credentialTypeLabel,
  maskSecret,
  providerCard,
  connectionMethodsFor,
  resourceSyncOptionsFor,
  defaultSelectedResources,
  type ConnectionProviderId,
  type WizardStep,
} from './cloud-account-wizard.config'
import {
  buildConfigPayload,
  buildCredentialsPayload,
  isWizardFormValid,
  reviewSummaryLine,
} from './cloud-account-wizard.validation'
import { cloudAccountWizardTheme, WIZARD_STEP_ICONS } from './cloud-account-wizard-theme.util'

export interface WizardInitOptions {
  suggestedProvider?: ConnectionProviderId | CloudProvider
  provider?: ConnectionProviderId | CloudProvider
  scope?: 'all' | 'cloud' | 'vps' | 'platform'
  initialStep?: WizardStep
}

export interface WizardCloseResult {
  created: boolean
  accountId?: string
  provider?: ConnectionProviderId
  synced?: boolean
  integrationOnly?: boolean
}

@Injectable()
export class CloudAccountWizardFacade {
  private readonly fb = inject(FormBuilder)
  private readonly accounts = inject(CloudAccountsService)
  private readonly toast = inject(ToastService)
  private readonly pro = inject(ProModeService)

  readonly steps = CLOUD_WIZARD_STEPS
  readonly wizardSubtitle = WIZARD_SUBTITLE
  readonly credentialTypeLabel = credentialTypeLabel
  readonly maskSecret = maskSecret
  readonly stepIcons = WIZARD_STEP_ICONS

  readonly step = signal<WizardStep>('provider')
  readonly selectedProvider = signal<ConnectionProviderId | null>(null)
  readonly selectedResources = signal<string[]>([])
  readonly saving = signal(false)
  readonly validating = signal(false)
  readonly validationResult = signal<{ valid: boolean; message: string } | null>(null)
  readonly permissionsExpanded = signal(false)
  readonly scopeFilter = signal<'all' | 'cloud' | 'vps' | 'platform'>('all')

  private projectId = ''
  private createdAccountId = ''

  readonly providerCards = computed(() => {
    const scope = this.scopeFilter()
    if (scope === 'cloud') return CLOUD_WIZARD_CARDS
    if (scope === 'vps') return VPS_WIZARD_CARDS
    if (scope === 'platform') {
      return CLOUD_PROVIDER_CARDS.filter((c) => c.scope === 'platform')
    }
    return CLOUD_PROVIDER_CARDS
  })

  readonly stepIndex = computed(() => this.steps.findIndex((s) => s.id === this.step()))

  readonly providerMeta = computed(() => {
    const p = this.selectedProvider()
    return p ? providerCard(p) : undefined
  })

  readonly wizardTheme = computed(() =>
    cloudAccountWizardTheme(this.selectedProvider(), this.providerMeta()?.shortName),
  )

  readonly stepProgress = computed(() => {
    const idx = this.stepIndex()
    const total = this.steps.length
    if (total <= 1) return 100
    return Math.round(((idx + 1) / total) * 100)
  })

  readonly showScopeTabs = computed(() => this.scopeFilter() === 'all')

  readonly providerLabel = computed(() => this.providerMeta()?.shortName ?? 'cloud')

  readonly isCloudApiProvider = computed(() => !!this.providerMeta()?.cloudApiProvider)

  readonly connectionMethods = computed(() => {
    const p = this.selectedProvider()
    return p ? connectionMethodsFor(p) : []
  })

  readonly resourceOptions = computed(() => {
    const p = this.selectedProvider()
    return p ? resourceSyncOptionsFor(p) : []
  })

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

  init = (options: WizardInitOptions = {}): void => {
    this.scopeFilter.set(options.scope ?? 'all')
    if (options.initialStep) this.step.set(options.initialStep)

    this.accounts.defaultProject().subscribe({
      next: (p) => { this.projectId = p.id },
      error: () => {
        if (!this.pro.proMode()) this.projectId = 'demo-project'
      },
    })

    const suggested = options.suggestedProvider ?? options.provider
    if (suggested) {
      this.selectedProvider.set(suggested as ConnectionProviderId)
      this.applyProviderDefaults(suggested as ConnectionProviderId)
      if (options.initialStep === undefined && options.suggestedProvider) {
        this.step.set('method')
      }
    }
  }

  setScopeFilter = (scope: 'all' | 'cloud' | 'vps' | 'platform'): void => {
    this.scopeFilter.set(scope)
    const current = this.selectedProvider()
    if (current && !this.providerCards().some((c) => c.id === current)) {
      this.selectedProvider.set(null)
    }
  }

  selectProvider = (id: ConnectionProviderId): void => {
    this.selectedProvider.set(id)
    this.validationResult.set(null)
    this.applyProviderDefaults(id)
    this.selectedResources.set(defaultSelectedResources(id))
  }

  selectMethod = (methodId: string, comingSoon?: boolean): void => {
    if (comingSoon) {
      this.toast.info('Próximamente')
      return
    }
    this.form.patchValue({ credentialType: methodId })
    this.validationResult.set(null)
  }

  toggleResource = (id: string, checked: boolean): void => {
    this.selectedResources.update((list) => {
      if (checked) return list.includes(id) ? list : [...list, id]
      return list.filter((r) => r !== id)
    })
  }

  private applyProviderDefaults = (prov: ConnectionProviderId): void => {
    const card = providerCard(prov)
    if (!card) return
    this.form.patchValue({
      credentialType: card.defaultCredentialType,
      defaultRegion: card.defaultRegion ?? '',
    })
    this.selectedResources.set(defaultSelectedResources(prov))
  }

  canGoToStep = (target: WizardStep): boolean => {
    const current = this.stepIndex()
    const targetIdx = this.steps.findIndex((s) => s.id === target)
    if (targetIdx <= current) return true
    if (target === 'method') return !!this.selectedProvider()
    if (target === 'credentials') return !!this.selectedProvider() && !!this.form.value.credentialType
    if (target === 'validate') {
      const prov = this.selectedProvider()
      return !!prov && isWizardFormValid(prov, this.form.getRawValue() as never)
    }
    if (target === 'resources') return !!this.validationResult()?.valid
    if (target === 'finish') return this.selectedResources().length > 0 && !!this.validationResult()?.valid
    return false
  }

  goToStep = (target: WizardStep): void => {
    if (!this.canGoToStep(target)) return
    this.step.set(target)
  }

  handleBack = (): void => {
    const order: WizardStep[] = ['provider', 'method', 'credentials', 'validate', 'resources', 'finish']
    const idx = order.indexOf(this.step())
    if (idx > 0) this.step.set(order[idx - 1])
  }

  handleNext = (): void => {
    const current = this.step()
    if (current === 'provider') {
      if (!this.selectedProvider()) {
        this.toast.error('Selecciona un proveedor')
        return
      }
      this.step.set('method')
      return
    }
    if (current === 'method') {
      if (!this.form.value.credentialType) {
        this.toast.error('Selecciona un método de conexión')
        return
      }
      this.step.set('credentials')
      return
    }
    if (current === 'credentials') {
      const prov = this.selectedProvider()
      if (!prov || !isWizardFormValid(prov, this.form.getRawValue() as never)) {
        this.toast.error('Completa los campos obligatorios')
        this.form.markAllAsTouched()
        return
      }
      this.step.set('validate')
      return
    }
    if (current === 'validate') {
      if (!this.validationResult()?.valid) {
        this.toast.error('Valida la conexión antes de continuar')
        return
      }
      this.step.set('resources')
      return
    }
    if (current === 'resources') {
      if (!this.selectedResources().length) {
        this.toast.error('Selecciona al menos un tipo de recurso')
        return
      }
      this.step.set('finish')
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
    const config = {
      ...buildConfigPayload(prov, v as never),
      syncResources: this.selectedResources(),
    }
    this.accounts
      .validatePreview({
        projectId: this.projectId,
        name: v.name,
        provider: cloudProv,
        accountId: v.accountId || undefined,
        defaultRegion: v.defaultRegion || undefined,
        config,
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

  handleSave = (andSync: boolean, onClose?: (result: WizardCloseResult) => void): void => {
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
      onClose?.({ created: true, provider: prov, integrationOnly: true })
      return
    }

    const sync = andSync || v.syncOnCreate
    const config = {
      ...buildConfigPayload(prov, v as never),
      syncResources: this.selectedResources(),
    }
    this.saving.set(true)
    this.accounts
      .create({
        projectId: this.projectId,
        name: v.name,
        provider: cloudProv,
        accountId: v.accountId || undefined,
        defaultRegion: v.defaultRegion || undefined,
        config,
        credentials: buildCredentialsPayload(prov, v as never),
      })
      .subscribe({
        next: (acc) => {
          this.createdAccountId = acc.id
          if (!sync) {
            this.saving.set(false)
            this.toast.success('Cuenta conectada correctamente')
            onClose?.({ created: true, accountId: acc.id, provider: prov })
            return
          }
          this.accounts.sync(acc.id).subscribe({
            next: (r) => {
              this.saving.set(false)
              this.toast.success(`Sincronización completada: ${r.instances} recursos, ${r.regions} regiones`)
              onClose?.({ created: true, synced: true, accountId: acc.id, provider: prov })
            },
            error: () => {
              this.saving.set(false)
              this.toast.error('Conexión guardada pero la sincronización falló')
              onClose?.({ created: true, accountId: acc.id, provider: prov })
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
