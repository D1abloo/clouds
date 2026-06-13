import { UpperCasePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { ToastService } from '../../core/services/toast.service'
import { CloudLaunchWizardComponent, type CloudLaunchWizardData } from './cloud-launch-wizard.component'
import type { CloudProvider } from '../../core/models/api.models'
import type { CloudSlug } from './cloud-provider.data'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

type ProviderCard = {
  slug: CloudSlug
  provider: CloudProvider
  label: string
  tagline: string
  logo: NavLogoKey
}

const PROVIDERS: ProviderCard[] = [
  { slug: 'aws', provider: 'AWS', label: 'Amazon Web Services', tagline: 'EC2 · VPC · AMI · Security Groups', logo: 'aws' },
  { slug: 'azure', provider: 'AZURE', label: 'Microsoft Azure', tagline: 'VM · VNet · NSG · Resource Group', logo: 'azure' },
  { slug: 'gcp', provider: 'GCP', label: 'Google Cloud', tagline: 'Compute Engine · VPC · Firewall', logo: 'gcp' },
  { slug: 'clouding', provider: 'CLOUDING', label: 'Clouding.io', tagline: 'Servidores cloud europeos', logo: 'clouding' },
]

const slugFromParam = (raw: string | null): CloudSlug | null => {
  const s = (raw ?? '').toLowerCase()
  if (s === 'aws' || s === 'azure' || s === 'gcp' || s === 'clouding') return s
  return null
}

@Component({
  selector: 'app-cloud-launch-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    UpperCasePipe,
    MatButtonModule,
    MatIconModule,
    BrandLogoComponent,
    LoadingStateComponent,
    CloudLaunchWizardComponent,
  ],
  templateUrl: './cloud-launch-page.component.html',
  styleUrl: './cloud-launch-page.component.scss',
})
export class CloudLaunchPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly accounts = inject(CloudAccountsService)
  private readonly toast = inject(ToastService)
  private readonly destroyRef = inject(DestroyRef)

  readonly providers = PROVIDERS
  readonly loading = signal(false)
  readonly wizardData = signal<CloudLaunchWizardData | null>(null)
  readonly activeSlug = signal<CloudSlug | null>(null)

  readonly activeProvider = computed(() => PROVIDERS.find((p) => p.slug === this.activeSlug()) ?? null)

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = slugFromParam(params.get('provider'))
      this.activeSlug.set(slug)
      if (slug) this.loadAccount(slug)
      else this.wizardData.set(null)
    })
  }

  selectProvider = (slug: CloudSlug): void => {
    void this.router.navigate(['/cloud', slug, 'launch'])
  }

  handleLaunched = (): void => {
    const slug = this.activeSlug()
    if (slug) void this.router.navigate(['/cloud', slug, 'instances'])
  }

  handleCancel = (): void => {
    const slug = this.activeSlug()
    if (slug) void this.router.navigate(['/cloud', slug, 'overview'])
    else void this.router.navigate(['/admin/infraestructura/instancias/lanzar'])
  }

  private loadAccount = (slug: CloudSlug): void => {
    const card = PROVIDERS.find((p) => p.slug === slug)
    if (!card) return
    this.loading.set(true)
    this.wizardData.set(null)
    this.accounts.list(undefined, card.provider).subscribe({
      next: (rows) => {
        const acc = rows.find((a) => a.hasCredentials) ?? rows[0]
        if (!acc?.id) {
          this.loading.set(false)
          this.toast.info('Conecta una cuenta cloud para habilitar lanzamientos en tiempo real')
          return
        }
        this.wizardData.set({
          accountId: acc.id,
          accountName: acc.name,
          provider: card.provider,
          slug,
          defaultRegion: acc.defaultRegion,
        })
        this.loading.set(false)
      },
      error: () => {
        this.loading.set(false)
        this.toast.error('No se pudo cargar la cuenta cloud')
      },
    })
  }
}
