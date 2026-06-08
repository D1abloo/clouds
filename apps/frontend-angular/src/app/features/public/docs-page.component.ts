import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'
import { FormsModule } from '@angular/forms'

@Component({
  standalone: true,
  imports: [FormsModule],
  selector: 'app-docs-page',
  template: `
    <div class="pub pub-docs">
      <div class="pub-wrap pub-docs__layout">
        <aside class="pub-docs__sidebar">
          <input type="search" placeholder="Buscar en docs..." [(ngModel)]="query" aria-label="Buscar documentación" />
          @for (d of filteredDocs(); track d.id) {
            <button type="button" [class.active]="active() === d.id" (click)="active.set(d.id)">{{ d.title }}</button>
          }
        </aside>
        <article class="pub-docs__content">
          @if (current(); as doc) {
            <h1>{{ doc.title }}</h1>
            @for (p of doc.body; track p) { <p>{{ p }}</p> }
          }
        </article>
      </div>
    </div>
  `,
  styles: [PUBLIC_THEME, `
    .pub-docs { padding: 2rem 0 4rem; }
    .pub-docs__layout { display: grid; gap: 2rem; grid-template-columns: 240px 1fr; }
    .pub-docs__sidebar { display: flex; flex-direction: column; gap: .35rem; position: sticky; top: 80px; align-self: start; }
    .pub-docs__sidebar input { padding: .5rem .65rem; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: .5rem; }
    .pub-docs__sidebar button { text-align: left; padding: .45rem .65rem; border: none; background: none; border-radius: 6px; cursor: pointer; font-size: .85rem; color: #475569; }
    .pub-docs__sidebar button.active, .pub-docs__sidebar button:hover { background: #f1f5f9; color: #0284c7; }
    .pub-docs__content h1 { font-size: 1.75rem; margin: 0 0 1rem; }
    .pub-docs__content p { line-height: 1.65; color: #475569; margin: 0 0 .85rem; }
    @media (max-width: 768px) { .pub-docs__layout { grid-template-columns: 1fr; } .pub-docs__sidebar { position: static; } }
  `],
})
export class DocsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  query = ''
  active = signal('intro')

  readonly docs = [
    { id: 'intro', title: 'Qué es Spendlyx', body: ['Spendlyx es un panel live para gestionar cloud, infraestructura, automatización y observabilidad.', 'Está pensado para equipos operativos que necesitan una vista unificada en español.'] },
    { id: 'panel', title: 'Para qué sirve el panel', body: ['Centraliza recursos, alertas, despliegues, repositorios y costes.', 'Cuando una integración no está configurada, verás «Configuración requerida» en lugar de datos simulados.'] },
    { id: 'register', title: 'Cómo crear una cuenta', body: ['Ve a Crear cuenta, completa el formulario y acepta términos y privacidad.', 'Recibirás un correo de validación válido 24 horas.'] },
    { id: 'login', title: 'Cómo iniciar sesión', body: ['Usa email y contraseña, o Google/GitHub si están configurados.', 'Si tu cuenta no está verificada, solicita un nuevo enlace desde Reenviar verificación.'] },
    { id: 'integrations', title: 'Cómo conectar una integración', body: ['Desde Configuración o la sección del proveedor, añade credenciales OAuth o API.', 'El panel mostrará estado de conexión y última sincronización.'] },
    { id: 'dashboard', title: 'Cómo interpretar el tablero', body: ['El tablero resume KPIs operativos y actividad reciente.', 'Usa el selector de rango temporal para acotar métricas.'] },
    { id: 'command', title: 'Centro de mando', body: ['Ejecuta acciones operativas aprobadas con trazabilidad.', 'Revisa acciones recientes en el historial del módulo.'] },
    { id: 'resources', title: 'Revisar recursos', body: ['Explorador y mapa de topología muestran inventario conectado.', 'Filtra por proveedor, tipo o estado.'] },
    { id: 'cloud', title: 'Ver nubes conectadas', body: ['Secciones AWS, GCP y Azure con overview por cuenta.', 'Estado vacío si no hay credenciales configuradas.'] },
    { id: 'infra', title: 'Gestionar infraestructura', body: ['Instancias, VPS, Docker, Kubernetes y red desde Infraestructura.', 'Operaciones disponibles según tu rol RBAC.'] },
    { id: 'deploy', title: 'Revisar despliegues', body: ['Módulo Despliegues y repositorios muestran pipelines y releases.', 'Conecta Jenkins o GitHub para datos live.'] },
    { id: 'obs', title: 'Logs y métricas', body: ['Observabilidad agrupa métricas, logs e informes.', 'Configura fuentes externas para datos en tiempo real.'] },
    { id: 'alerts', title: 'Alertas e incidencias', body: ['Alertas activas e incidentes abiertos en su sección.', 'Escalar desde alerta a incidente cuando aplique.'] },
    { id: 'billing', title: 'Facturación y costes', body: ['Revisa gasto cloud y recomendaciones del optimizador.', 'Requiere cuentas cloud conectadas.'] },
    { id: 'users', title: 'Usuarios y roles', body: ['Administración → Usuarios y Roles para gestionar acceso.', 'Roles: superadministrador, administrador, operador, auditor, solo lectura.'] },
    { id: 'tokens', title: 'Tokens API', body: ['Crea tokens con alcance limitado para automatización.', 'Revoca tokens que ya no uses.'] },
    { id: 'audit', title: 'Auditoría', body: ['Registro de actividad con usuario, acción y timestamp.', 'Filtra por recurso o periodo.'] },
    { id: 'faq', title: 'Preguntas frecuentes', body: ['¿Sin integración? Verás estados vacíos o configuración requerida.', '¿Problemas de acceso? Verifica email o contacta info@spendlyx.com.'] },
    { id: 'best', title: 'Buenas prácticas', body: ['Usa roles mínimos necesarios.', 'Rota tokens API periódicamente.', 'Revisa auditoría tras cambios críticos.'] },
  ]

  filteredDocs = (): typeof this.docs => {
    const q = this.query.trim().toLowerCase()
    if (!q) return this.docs
    return this.docs.filter((d) => d.title.toLowerCase().includes(q) || d.body.some((b) => b.toLowerCase().includes(q)))
  }

  current = computed(() => this.docs.find((d) => d.id === this.active()) ?? this.docs[0])

  ngOnInit(): void { const s = this.route.snapshot.data['seo']; if (s) this.seo.apply(s) }
}
