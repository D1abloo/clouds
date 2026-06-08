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
    <div class="pub pub-page">
      <div class="pub-wrap" style="max-width:480px;margin:0 auto;text-align:center;padding:3rem 0">
        <h1>Planes</h1>
        <div class="pub-card" style="padding:2rem;margin-top:1.5rem">
          <h2 style="margin:0 0 .5rem">Plan PRO</h2>
          <p style="font-size:1.1rem;font-weight:600;color:#0284c7">Acceso bajo solicitud</p>
          <p>Contacta con el equipo de Spendlyx para activar capacidades completas para tu organización.</p>
          <p style="font-size:.85rem;color:#64748b">Próximamente más opciones</p>
          <div class="pub-actions" style="justify-content:center;margin-top:1.5rem">
            <a routerLink="/registro" class="pub-btn pub-btn--primary">Crear cuenta</a>
            <a routerLink="/contacto" class="pub-btn pub-btn--outline">Contactar</a>
          </div>
        </div>
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
