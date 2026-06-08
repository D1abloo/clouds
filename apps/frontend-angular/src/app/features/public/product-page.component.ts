import { Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  selector: 'app-product-page',
  template: `
    <div class="pub pub-page">
      <div class="pub-wrap pub-page__head"><h1>Producto Spendlyx</h1><p>Panel live para gestión cloud y operaciones — diseñado para usuarios, no para administradores de servidores.</p></div>
      <div class="pub-wrap pub-grid">
        @for (f of features; track f.title) {
          <article class="pub-card"><h3>{{ f.title }}</h3><p>{{ f.text }}</p></article>
        }
      </div>
    </div>
  `,
  styles: [PUBLIC_THEME, `.pub-page { padding: 3rem 0; } .pub-page__head { margin-bottom: 2rem; } .pub-page__head h1 { font-size: 2rem; font-weight: 800; margin: 0 0 .5rem; }`],
})
export class ProductPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  ngOnInit(): void { const s = this.route.snapshot.data['seo']; if (s) this.seo.apply(s) }
  features = [
    { title: 'Panel live', text: 'Gestión unificada de cloud y operaciones con datos conectados a tus proveedores.' },
    { title: 'Gestión de recursos', text: 'Inventario, instancias, contenedores y clústeres en una sola vista.' },
    { title: 'Automatización', text: 'Jenkins, Terraform, runbooks y programador de tareas.' },
    { title: 'Repositorios y despliegues', text: 'GitHub, GitLab, webhooks y seguimiento de despliegues.' },
    { title: 'Observabilidad', text: 'Métricas, logs, alertas, incidentes y facturación.' },
    { title: 'Seguridad', text: 'Centro de seguridad, secretos, cumplimiento y control de acceso.' },
    { title: 'Usuarios y roles', text: 'RBAC en español con permisos granulares.' },
    { title: 'Alertas e incidencias', text: 'Respuesta coordinada con trazabilidad.' },
    { title: 'Auditoría', text: 'Registro de actividad para cumplimiento y revisión.' },
    { title: 'Proveedores externos', text: 'Conecta AWS, GCP, Azure, VPS y más cuando lo necesites.' },
  ]
}
