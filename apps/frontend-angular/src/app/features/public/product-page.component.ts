import { Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  selector: 'app-product-page',
  template: `
    <header class="pub-page-hero">
      <div class="pub-wrap">
        <h1>Producto Spendlyx</h1>
        <p>Panel live para gestión cloud y operaciones — diseñado para usuarios, no para administradores de servidores.</p>
      </div>
    </header>
    <div class="pub pub-page-body">
      <div class="pub-wrap pub-grid">
        @for (f of features; track f.title) {
          <article class="pub-card pub-card--feature">
            <div class="pub-icon" aria-hidden="true">{{ f.icon }}</div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.text }}</p>
          </article>
        }
      </div>
    </div>
  `,
  styles: [PUBLIC_THEME],
})
export class ProductPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  ngOnInit(): void { const s = this.route.snapshot.data['seo']; if (s) this.seo.apply(s) }
  features = [
    { icon: '▣', title: 'Panel live', text: 'Gestión unificada de cloud y operaciones con datos conectados a tus proveedores.' },
    { icon: '⬡', title: 'Gestión de recursos', text: 'Inventario, instancias, contenedores y clústeres en una sola vista.' },
    { icon: '⟳', title: 'Automatización', text: 'Jenkins, Terraform, runbooks y programador de tareas.' },
    { icon: '⎇', title: 'Repositorios y despliegues', text: 'GitHub, GitLab, webhooks y seguimiento de despliegues.' },
    { icon: '◐', title: 'Observabilidad', text: 'Métricas, logs, alertas, incidentes y facturación.' },
    { icon: '⛊', title: 'Seguridad', text: 'Centro de seguridad, secretos, cumplimiento y control de acceso.' },
    { icon: '⊕', title: 'Usuarios y roles', text: 'RBAC en español con permisos granulares.' },
    { icon: '⚠', title: 'Alertas e incidencias', text: 'Respuesta coordinada con trazabilidad.' },
    { icon: '☰', title: 'Auditoría', text: 'Registro de actividad para cumplimiento y revisión.' },
    { icon: '☁', title: 'Proveedores externos', text: 'Conecta AWS, GCP, Azure, VPS y más cuando lo necesites.' },
  ]
}
