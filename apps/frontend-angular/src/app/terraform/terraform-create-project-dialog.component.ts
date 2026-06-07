import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { map, startWith } from 'rxjs'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { TERRAFORM_FOLDERS } from './terraform.demo'
import type { CloudProvider } from '../core/models/api.models'
import type { TerraformWorkspaceItem } from '../core/stores/terraform-run.store'
import { BrandLogoComponent } from '../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../shared/theme/nav-logo.types'
import {
  PROJECT_COMPLIANCE_TIERS,
  PROJECT_ENV_PRESETS,
  PROJECT_STATE_BACKENDS,
  PROVIDER_PROJECT_INFO,
  complianceTierLabel,
  stateBackendLabel,
} from './terraform-create-project.meta'

export interface CreateProjectDialogData {
  workspaces: TerraformWorkspaceItem[]
}

export interface CreateProjectDialogResult {
  name: string
  folderId: string
  provider: CloudProvider
  description: string
  tags: string[]
  environments: string[]
  stateBackend: string
  complianceTier: string
  createStarterAutomation: boolean
  linkExistingWorkspace: boolean
  linkWorkspaceId: string | null
}

interface ProjectFormState {
  name: string
  folderId: string
  provider: CloudProvider
  description: string
  tags: string
  environments: string[]
  stateBackend: string
  complianceTier: string
  createStarterAutomation: boolean
  linkExistingWorkspace: boolean
  linkWorkspaceId: string
}

@Component({
  selector: 'app-terraform-create-project-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    BrandLogoComponent,
  ],
  templateUrl: './terraform-create-project-dialog.component.html',
  styleUrl: './terraform-create-project-dialog.component.scss',
})
export class TerraformCreateProjectDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<TerraformCreateProjectDialogComponent, CreateProjectDialogResult | undefined>)
  private readonly destroyRef = inject(DestroyRef)
  private readonly dialogData = inject<CreateProjectDialogData>(MAT_DIALOG_DATA, { optional: true })

  readonly folders = TERRAFORM_FOLDERS
  readonly providers: CloudProvider[] = ['AWS', 'GCP', 'AZURE']
  readonly envPresets = PROJECT_ENV_PRESETS
  readonly complianceTiers = PROJECT_COMPLIANCE_TIERS
  readonly allWorkspaces = this.dialogData?.workspaces ?? []

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    folderId: new FormControl('apps', { nonNullable: true }),
    provider: new FormControl<CloudProvider>('AWS', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    tags: new FormControl('', { nonNullable: true }),
    environments: new FormControl<string[]>(['dev', 'staging'], { nonNullable: true }),
    stateBackend: new FormControl('s3', { nonNullable: true }),
    complianceTier: new FormControl('standard', { nonNullable: true }),
    createStarterAutomation: new FormControl(true, { nonNullable: true }),
    linkExistingWorkspace: new FormControl(false, { nonNullable: true }),
    linkWorkspaceId: new FormControl('', { nonNullable: true }),
  })

  readonly formState = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue() as ProjectFormState),
    ),
    { initialValue: this.form.getRawValue() as ProjectFormState },
  )

  readonly projectSlug = computed(() => {
    const name = this.formState().name.trim()
    if (!name) return 'proyecto-nuevo'
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  })

  readonly selectedFolder = computed(() =>
    this.folders.find((f) => f.id === this.formState().folderId),
  )

  readonly folderWorkspaces = computed(() => {
    const s = this.formState()
    return this.allWorkspaces.filter(
      (w) => w.folderId === s.folderId && w.provider === s.provider,
    )
  })

  readonly linkedWorkspace = computed(() => {
    const id = this.formState().linkWorkspaceId
    if (!id) return null
    return this.allWorkspaces.find((w) => w.id === id) ?? null
  })

  readonly availableBackends = computed(() => {
    const p = this.formState().provider
    return PROJECT_STATE_BACKENDS.filter((b) => b.providers.includes(p))
  })

  readonly suggestedBackendLabel = computed(() => stateBackendLabel(this.formState().stateBackend))

  readonly previewWorkspaces = computed(() => {
    const s = this.formState()
    const linked = s.linkExistingWorkspace ? this.linkedWorkspace() : null
    const slug = this.projectSlug()
    return s.environments.map((envId, index) => {
      if (linked && index === 0) return linked.name
      const preset = PROJECT_ENV_PRESETS.find((e) => e.id === envId)
      const suffix = preset?.workspaceSuffix ?? envId
      return `${slug}-${suffix}`
    })
  })

  readonly parsedTags = computed(() =>
    this.formState()
      .tags.split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  )

  readonly readinessItems = computed(() => {
    const s = this.formState()
    const linkOk =
      !s.linkExistingWorkspace ||
      (!!s.linkWorkspaceId && this.folderWorkspaces().some((w) => w.id === s.linkWorkspaceId))
    return [
      { id: 'name', label: 'Nombre (mín. 2 caracteres)', done: s.name.trim().length >= 2 },
      { id: 'folder', label: 'Carpeta seleccionada', done: !!s.folderId },
      { id: 'provider', label: 'Proveedor cloud', done: !!s.provider },
      { id: 'env', label: 'Al menos un entorno', done: s.environments.length > 0 },
      { id: 'link', label: 'Workspace a vincular', done: linkOk },
      { id: 'desc', label: 'Descripción recomendada', done: s.description.trim().length >= 10 },
    ]
  })

  readonly readinessPct = computed(() => {
    const items = this.readinessItems()
    const done = items.filter((i) => i.done).length
    return Math.round((done / items.length) * 100)
  })

  ngOnInit(): void {
    this.form
      .get('provider')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        if (!p) return
        this.syncStateBackendForProvider(p)
        this.syncLinkWorkspaceSelection()
      })

    this.form
      .get('folderId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncLinkWorkspaceSelection())

    this.form
      .get('linkExistingWorkspace')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((on) => {
        if (on) this.syncLinkWorkspaceSelection()
        else this.form.patchValue({ linkWorkspaceId: '' })
      })
  }

  private syncStateBackendForProvider = (p: CloudProvider): void => {
    const def = PROVIDER_PROJECT_INFO[p]?.stateDefault ?? 'terraform-cloud'
    const allowed = PROJECT_STATE_BACKENDS.filter((b) => b.providers.includes(p)).map((b) => b.id)
    const current = this.form.getRawValue().stateBackend
    if (!allowed.includes(current)) {
      this.form.patchValue({ stateBackend: allowed.includes(def) ? def : allowed[0] })
    }
  }

  private syncLinkWorkspaceSelection = (): void => {
    if (!this.form.getRawValue().linkExistingWorkspace) return
    const inFolder = this.folderWorkspaces()
    const current = this.form.getRawValue().linkWorkspaceId
    if (current && inFolder.some((w) => w.id === current)) return
    const first = inFolder[0]
    this.form.patchValue({ linkWorkspaceId: first?.id ?? '' })
  }

  providerLogo = (p: CloudProvider): NavLogoKey => {
    if (p === 'GCP') return 'gcp'
    if (p === 'AZURE') return 'azure'
    return 'aws'
  }

  providerInfo = (p: CloudProvider) => PROVIDER_PROJECT_INFO[p]

  selectProvider = (p: CloudProvider): void => {
    this.form.patchValue({ provider: p })
  }

  selectFolder = (folderId: string): void => {
    this.form.patchValue({ folderId })
  }

  isEnvSelected = (id: string): boolean => this.formState().environments.includes(id)

  toggleEnv = (id: string): void => {
    const current = this.form.get('environments')?.value ?? []
    if (current.includes(id) && current.length <= 1) return
    const next = current.includes(id) ? current.filter((e) => e !== id) : [...current, id]
    this.form.patchValue({ environments: next })
  }

  complianceLabel = (): string => complianceTierLabel(this.formState().complianceTier)

  canSubmit = (): boolean => {
    if (!this.form.valid || this.formState().environments.length === 0) return false
    const s = this.formState()
    if (s.linkExistingWorkspace) {
      return !!s.linkWorkspaceId && this.folderWorkspaces().some((w) => w.id === s.linkWorkspaceId)
    }
    return true
  }

  submit = (): void => {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched()
      return
    }
    const v = this.form.getRawValue()
    this.ref.close({
      name: v.name.trim(),
      folderId: v.folderId,
      provider: v.provider,
      description: v.description.trim() || 'Proyecto IaC gestionado desde CloudOps.',
      tags: v.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      environments: v.environments,
      stateBackend: v.stateBackend,
      complianceTier: v.complianceTier,
      createStarterAutomation: v.createStarterAutomation,
      linkExistingWorkspace: v.linkExistingWorkspace,
      linkWorkspaceId: v.linkExistingWorkspace && v.linkWorkspaceId ? v.linkWorkspaceId : null,
    })
  }
}
