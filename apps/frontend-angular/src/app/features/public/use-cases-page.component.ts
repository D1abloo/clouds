import { Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  selector: 'app-use-cases-page',
  template: `
    <div class="pub pub-page">
      <div class="pub-wrap pub-page__head"><h1>Casos de uso</h1><p>Cómo Spendlyx ayuda a distintos equipos a operar con claridad.</p></div>
      <div class="pub-wrap">
        @for (c of cases; track c.title) {
          <article class="pub-card pub-case">
            <h3>{{ c.title }}</h3>
            <p><strong>Problema:</strong> {{ c.problem }}</p>
            <p><strong>Cómo ayuda Spendlyx:</strong> {{ c.help }}</p>
            <p><strong>Beneficio:</strong> {{ c.benefit }}</p>
            <p><strong>Ejemplo:</strong> {{ c.workflow }}</p>
          </article>
        }
      </div>
    </div>
  `,
  styles: [PUBLIC_THEME, `.pub-page { padding: 3rem 0; } .pub-case { margin-bottom: 1rem; } .pub-case p { margin: .35rem 0; font-size: .85rem; }`],
})
export class UseCasesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  ngOnInit(): void { const s = this.route.snapshot.data['seo']; if (s) this.seo.apply(s) }
  cases = [
    { title: 'Equipos DevOps', problem: 'Herramientas dispersas para desplegar y monitorizar.', help: 'Panel unificado con automatización y observabilidad.', benefit: 'Menos context switching, más velocidad.', workflow: 'Conectar Jenkins → revisar despliegue → ver alertas en el mismo panel.' },
    { title: 'Startups SaaS', problem: 'Crecimiento rápido sin proceso operativo maduro.', help: 'Visibilidad de recursos, costes y salud desde el día uno.', benefit: 'Escala operaciones sin contratar un NOC completo.', workflow: 'Registrar cuenta → conectar cloud → monitorizar costes en facturación.' },
    { title: 'Agencias técnicas', problem: 'Múltiples clientes con entornos separados.', help: 'Organizaciones y espacios de trabajo aislados.', benefit: 'Un solo panel, datos separados por cliente.', workflow: 'Crear org por cliente → asignar roles → operar con RBAC.' },
    { title: 'Equipos de infraestructura', problem: 'Inventario desactualizado en hojas de cálculo.', help: 'Explorador de recursos y mapa de topología.', benefit: 'Inventario live cuando conectas proveedores.', workflow: 'Sincronizar instancias → revisar en explorador → actuar desde centro de mando.' },
    { title: 'Multi-proveedor cloud', problem: 'AWS, GCP y Azure en consolas distintas.', help: 'Vistas por proveedor en un solo panel.', benefit: 'Comparar y operar sin cambiar de contexto.', workflow: 'Conectar cuentas → revisar overview por nube → unificar alertas.' },
    { title: 'Observabilidad centralizada', problem: 'Métricas y logs en silos.', help: 'Módulos de métricas, logs e incidentes integrados.', benefit: 'Correlacionar señales operativas.', workflow: 'Configurar integraciones → revisar métricas → escalar a incidente.' },
    { title: 'Control de costes', problem: 'Facturas cloud difíciles de repartir.', help: 'Facturación y optimizador de costes.', benefit: 'Visibilidad de gasto por recurso o equipo.', workflow: 'Conectar billing → revisar tendencias → optimizar recursos.' },
    { title: 'Auditoría y seguridad', problem: 'Sin trazabilidad de quién hizo qué.', help: 'Auditoría, RBAC y centro de seguridad.', benefit: 'Cumplimiento y responsabilidad clara.', workflow: 'Asignar roles → operar → revisar logs de auditoría.' },
  ]
}
