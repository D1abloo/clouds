import { Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  selector: 'app-use-cases-page',
  template: `
    <header class="pub-page-hero">
      <div class="pub-wrap">
        <h1>Casos de uso</h1>
        <p>Cómo Spendlyx ayuda a equipos DevOps, CloudOps y startups a lanzar, observar y gobernar infraestructura.</p>
      </div>
    </header>
    <div class="pub pub-page-body">
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
  styles: [PUBLIC_THEME],
})
export class UseCasesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  ngOnInit(): void { const s = this.route.snapshot.data['seo']; if (s) this.seo.apply(s) }
  cases = [
    { title: 'Equipos DevOps', problem: 'Herramientas dispersas para lanzar, desplegar y monitorizar.', help: 'AI Infra Studio, automatización y observabilidad en el mismo panel.', benefit: 'Menos context switching, más velocidad.', workflow: 'Crear instancia → probar conectividad → desplegar desde GitHub o Jenkins.' },
    { title: 'Startups SaaS', problem: 'Crecimiento rápido sin proceso operativo maduro.', help: 'Visibilidad de recursos, coste estimado y salud desde el día uno.', benefit: 'Escala operaciones sin montar un NOC completo.', workflow: 'Registrar cuenta → conectar cloud → lanzar entorno desde AI Infra Studio.' },
    { title: 'Agencias técnicas', problem: 'Múltiples clientes con entornos separados.', help: 'Organizaciones y espacios de trabajo aislados.', benefit: 'Un solo panel, datos separados por cliente.', workflow: 'Crear org por cliente → asignar roles → operar con RBAC.' },
    { title: 'Equipos de infraestructura', problem: 'Inventario desactualizado en hojas de cálculo.', help: 'Explorador de recursos y mapa de topología.', benefit: 'Inventario live cuando conectas proveedores.', workflow: 'Sincronizar instancias → revisar en explorador → actuar desde centro de mando.' },
    { title: 'Multi-proveedor cloud', problem: 'AWS, GCP, Azure y VPS en consolas distintas.', help: 'Vistas por proveedor y acciones de lanzamiento en un solo panel.', benefit: 'Comparar y operar sin cambiar de contexto.', workflow: 'Conectar cuentas → abrir AWS/GCP/IONOS → lanzar con proveedor preseleccionado.' },
    { title: 'Gestión VPS europea', problem: 'IONOS y proveedores VPS fuera del inventario cloud.', help: 'Sección VPS con servidores, métricas, SSH y creación desde el wizard.', benefit: 'Una flota VPS gobernada junto a cloud pública.', workflow: 'Abrir IONOS → Servidores → Crear VPS IONOS → ver en Infraestructura.' },
    { title: 'Observabilidad centralizada', problem: 'Métricas y logs en silos.', help: 'Módulos de métricas, logs e incidentes integrados.', benefit: 'Correlacionar señales operativas.', workflow: 'Configurar integraciones → revisar métricas → escalar a incidente.' },
    { title: 'Control de coste operativo', problem: 'Precios y tamaños se deciden tarde o fuera del flujo.', help: 'Coste estimado durante el lanzamiento y datos preparados para facturación.', benefit: 'Mejores decisiones antes de crear recursos.', workflow: 'Elegir tipo → revisar precio/hora → lanzar → consultar facturación general.' },
    { title: 'Auditoría y seguridad', problem: 'Sin trazabilidad de quién hizo qué.', help: 'Auditoría, RBAC y centro de seguridad.', benefit: 'Cumplimiento y responsabilidad clara.', workflow: 'Asignar roles → operar → revisar logs de auditoría.' },
  ]
}
