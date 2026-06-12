import { Component, inject, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ActivatedRoute } from '@angular/router'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-pricing-page',
  template: `
    <header class="pub-page-hero">
      <div class="pub-wrap" style="text-align: center">
        <h1>Planes Spendlyx</h1>
        <p>Acceso PRO para equipos que lanzan y gobiernan infraestructura multi-cloud con IA, observabilidad y RBAC.</p>
      </div>
    </header>
    <div class="pub pub-page-body">
      <div class="pub-wrap">
        <article class="pub-card pub-pricing-card">
          <h2>Plan PRO</h2>
          <p class="pub-badge">Acceso bajo solicitud</p>
          <p>Incluye AI Infra Studio, nubes AWS/GCP/Azure, VPS, inventario, logs, seguridad, repositorios y automatización.</p>
          <p style="font-size: 0.85rem; color: #64748b; margin-top: 0.75rem">Activación guiada para equipos con proveedores reales conectados</p>
          <div class="pub-actions" style="justify-content: center; margin-top: 1.5rem">
            <a routerLink="/registro" class="pub-btn pub-btn--primary">Crear cuenta</a>
            <a routerLink="/contacto" class="pub-btn pub-btn--outline">Contactar</a>
          </div>
        </article>
      </div>
    </div>
  `,
  styles: [PUBLIC_THEME],
})
export class PricingPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  ngOnInit(): void { const s = this.route.snapshot.data['seo']; if (s) this.seo.apply(s) }
}
