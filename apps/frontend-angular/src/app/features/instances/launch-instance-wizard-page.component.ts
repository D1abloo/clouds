import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog } from '@angular/material/dialog'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { LaunchInstanceModalComponent } from '../../shared/modals/launch-instance/launch-instance-modal.component'
import type { LaunchProvider } from '../../shared/data/instance-pricing'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

type CloudLaunchSlug = 'aws' | 'gcp' | 'azure'

const PROVIDER_CARDS: { slug: CloudLaunchSlug; label: string; tagline: string; logo: NavLogoKey }[] = [
  {
    slug: 'aws',
    label: 'Amazon Web Services',
    tagline: 'EC2, VPC y grupos de seguridad',
    logo: 'aws',
  },
  {
    slug: 'gcp',
    label: 'Google Cloud Platform',
    tagline: 'Compute Engine y redes VPC',
    logo: 'gcp',
  },
  {
    slug: 'azure',
    label: 'Microsoft Azure',
    tagline: 'Máquinas virtuales y redes',
    logo: 'azure',
  },
]

const slugToProvider = (slug: string | null): LaunchProvider | null => {
  const s = (slug ?? '').toLowerCase()
  if (s === 'aws') return 'AWS'
  if (s === 'gcp') return 'GCP'
  if (s === 'azure') return 'AZURE'
  return null
}

@Component({
  selector: 'app-launch-instance-wizard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule, BrandLogoComponent],
  template: `
    <div class="launch-wizard-page">
      @if (mode() === 'select') {
        <header class="launch-wizard-page__hero">
          <h1>Lanzar instancia</h1>
          <p>Selecciona el proveedor cloud donde quieres aprovisionar la instancia.</p>
        </header>
        <div class="launch-wizard-page__grid" role="list">
          @for (card of providerCards; track card.slug) {
            <a
              class="launch-wizard-page__card"
              role="listitem"
              [routerLink]="['/cloud', card.slug, 'launch']"
              [attr.aria-label]="'Lanzar instancia en ' + card.label"
            >
              <app-brand-logo [logo]="card.logo" size="lg" />
              <strong>{{ card.label }}</strong>
              <span>{{ card.tagline }}</span>
            </a>
          }
        </div>
      } @else {
        <div class="launch-wizard-page__loading">
          <mat-icon class="spin">sync</mat-icon>
          <p>Abriendo asistente de lanzamiento…</p>
        </div>
      }
    </div>
  `,
  styles: `
    .launch-wizard-page {
      max-width: 960px;
      margin: 0 auto;
      padding: 1.5rem 1rem 2rem;
    }
    .launch-wizard-page__hero h1 {
      margin: 0;
      font-size: 1.5rem;
    }
    .launch-wizard-page__hero p {
      margin: 0.35rem 0 1.25rem;
      color: var(--app-text-muted);
      font-size: 0.9rem;
    }
    .launch-wizard-page__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .launch-wizard-page__card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.1rem 1.15rem;
      border-radius: 14px;
      border: 1px solid var(--app-border-subtle);
      background: var(--app-card);
      text-decoration: none;
      color: inherit;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
      span { font-size: 0.82rem; color: var(--app-text-muted); }
    }
    .launch-wizard-page__card:hover {
      box-shadow: var(--app-shadow-md);
      transform: translateY(-2px);
    }
    .launch-wizard-page__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 3rem 1rem;
      color: var(--app-text-muted);
    }
    .spin {
      animation: spin 1.2s linear infinite;
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
})
export class LaunchInstanceWizardPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly dialog = inject(MatDialog)
  private readonly destroyRef = inject(DestroyRef)

  readonly providerCards = PROVIDER_CARDS
  readonly mode = signal<'select' | 'wizard'>('select')

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const provider = slugToProvider(params.get('provider'))
      if (!provider) {
        this.mode.set('select')
        return
      }
      this.mode.set('wizard')
      this.openWizard(provider)
    })
  }

  private openWizard = (provider: LaunchProvider): void => {
    const ref = this.dialog.open(LaunchInstanceModalComponent, {
      width: 'min(1040px, 96vw)',
      maxWidth: '95vw',
      maxHeight: '95vh',
      panelClass: 'launch-instance-dialog-panel',
      autoFocus: false,
      data: { initialProvider: provider },
    })

    ref.afterClosed().subscribe(() => {
      const slug = this.route.snapshot.paramMap.get('provider')
      if (slug) {
        void this.router.navigate(['/cloud', slug, 'overview'])
      } else {
        void this.router.navigate(['/admin/infraestructura/instancias/lanzar'])
      }
    })
  }
}
