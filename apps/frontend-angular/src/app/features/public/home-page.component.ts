import { Component, inject, OnInit } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ActivatedRoute } from '@angular/router'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'
import { publicAnimations } from './public.animations'

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  animations: publicAnimations,
  template: `
    <section class="pub-hero" @fadeUp>
      <div class="pub-wrap pub-hero__grid">
        <div class="pub-hero__copy">
          <p class="pub-hero__eyebrow">Panel PRO multi-usuario</p>
          <h1>Gestiona tu cloud, operaciones e infraestructura desde un solo panel</h1>
          <p>
            Spendlyx centraliza recursos, automatización, repositorios y observabilidad para equipos
            que necesitan control operativo real — sin perder visibilidad ni trazabilidad.
          </p>
          <div class="pub-actions">
            <a routerLink="/registro" class="pub-btn pub-btn--primary">Crear cuenta</a>
            <a routerLink="/login" class="pub-btn pub-btn--ghost">Iniciar sesión</a>
          </div>
          <div class="pub-hero__stats">
            <div class="pub-hero__stat"><strong>Multi-cloud</strong><span>AWS · GCP · Azure</span></div>
            <div class="pub-hero__stat"><strong>RBAC</strong><span>Roles y permisos</span></div>
            <div class="pub-hero__stat"><strong>En español</strong><span>Panel y documentación</span></div>
          </div>
        </div>
        <div class="pub-mock pub-hero__mock" aria-hidden="true">
          <span class="pub-mock__label">Vista ilustrativa del panel</span>
          <div class="pub-mock__chrome">
            <span class="pub-mock__dot pub-mock__dot--r"></span>
            <span class="pub-mock__dot pub-mock__dot--y"></span>
            <span class="pub-mock__dot pub-mock__dot--g"></span>
          </div>
          <div class="pub-mock__body">
            <div class="pub-mock__sidebar">
              <div class="pub-mock__nav pub-mock__nav--active"></div>
              <div class="pub-mock__nav"></div>
              <div class="pub-mock__nav"></div>
              <div class="pub-mock__nav"></div>
            </div>
            <div class="pub-mock__main">
              <div class="pub-mock__kpis">
                <div class="pub-mock__kpi"></div>
                <div class="pub-mock__kpi"></div>
                <div class="pub-mock__kpi"></div>
              </div>
              <div class="pub-mock__chart"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    @for (block of sections; track block.title) {
      <section class="pub-section" [class.pub-section--alt]="block.alt" @fadeUp>
        <div class="pub-wrap">
          <h2>{{ block.title }}</h2>
          <p class="sub">{{ block.sub }}</p>
          <div class="pub-grid">
            @for (item of block.items; track item.title) {
              <article class="pub-card pub-card--feature">
                <div class="pub-icon" aria-hidden="true">{{ item.icon }}</div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.text }}</p>
              </article>
            }
          </div>
          @if (block.mock) {
            <div class="pub-mock pub-section__mock" aria-hidden="true">
              <span class="pub-mock__label">{{ block.mock }}</span>
              <div class="pub-mock__chrome">
                <span class="pub-mock__dot pub-mock__dot--r"></span>
                <span class="pub-mock__dot pub-mock__dot--y"></span>
                <span class="pub-mock__dot pub-mock__dot--g"></span>
              </div>
              <div class="pub-mock__main" style="padding: 1rem">
                <div class="pub-mock__bar pub-mock__bar--w80"></div>
                <div class="pub-mock__bar pub-mock__bar--w60"></div>
                <div class="pub-mock__bar pub-mock__bar--w40"></div>
                <div class="pub-mock__chart" style="min-height: 48px; margin-top: 0.35rem"></div>
              </div>
            </div>
          }
        </div>
      </section>
    }

    <section class="pub-section pub-section--alt" @fadeUp>
      <div class="pub-wrap pub-faq">
        <h2>Preguntas frecuentes</h2>
        <p class="sub">Respuestas rápidas antes de crear tu cuenta.</p>
        @for (f of faqs; track f.q) {
          <details>
            <summary>{{ f.q }}</summary>
            <p>{{ f.a }}</p>
          </details>
        }
      </div>
    </section>

    <section class="pub-section pub-cta" @fadeUp>
      <div class="pub-wrap pub-cta__inner">
        <h2>Empieza con Spendlyx hoy</h2>
        <p>Crea tu cuenta, valida tu correo y accede al panel live para tu equipo.</p>
        <div class="pub-actions">
          <a routerLink="/registro" class="pub-btn pub-btn--primary">Crear cuenta</a>
          <a routerLink="/contacto" class="pub-btn pub-btn--outline">Contactar</a>
        </div>
      </div>
    </section>
  `,
  styles: [
    PUBLIC_THEME,
    `
    .pub-hero__mock { min-height: 280px; }
    .pub-section__mock { margin-top: 2rem; max-width: 520px; }
    `,
  ],
})
export class HomePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)

  ngOnInit(): void {
    const seo = this.route.snapshot.data['seo']
    if (seo) this.seo.apply(seo)
  }

  readonly sections = [
    {
      title: '¿Qué es Spendlyx?',
      sub: 'Un panel live diseñado para equipos que operan infraestructura y servicios cloud con responsabilidad compartida.',
      alt: false,
      items: [
        { icon: '◈', title: 'Visión unificada', text: 'Recursos, alertas y operaciones en una interfaz coherente en español.' },
        { icon: '◆', title: 'Modo PRO', text: 'Datos reales conectados a tus proveedores cuando configuras las integraciones.' },
        { icon: '◇', title: 'Multi-usuario', text: 'Organizaciones, roles y permisos para colaborar con control.' },
      ],
    },
    {
      title: '¿Para quién es?',
      sub: 'Equipos que necesitan operar con claridad, no con hojas de cálculo dispersas.',
      alt: true,
      items: [
        { icon: '⚙', title: 'DevOps y SRE', text: 'Orquesta despliegues, revisa salud y responde a incidentes.' },
        { icon: '▲', title: 'Startups SaaS', text: 'Escala operaciones sin perder visibilidad de costes y recursos.' },
        { icon: '◉', title: 'Agencias técnicas', text: 'Gestiona múltiples clientes con espacios de trabajo separados.' },
      ],
    },
    {
      title: 'Capacidades del panel',
      sub: 'Representación del funcionamiento — conecta tus proveedores para ver datos live.',
      alt: false,
      mock: 'Ejemplo visual',
      items: [
        { icon: '▣', title: 'Tablero', text: 'KPIs operativos y actividad reciente de tu entorno.' },
        { icon: '◎', title: 'Centro de mando', text: 'Acciones rápidas sobre recursos con trazabilidad.' },
        { icon: '⬡', title: 'Explorador', text: 'Inventario unificado de recursos conectados.' },
      ],
    },
    {
      title: 'Nubes e infraestructura',
      sub: 'AWS, GCP, Azure, VPS, contenedores y clústeres — visibilidad centralizada.',
      alt: true,
      items: [
        { icon: '☁', title: 'Multi-cloud', text: 'Conecta cuentas y revisa estado por proveedor.' },
        { icon: '▤', title: 'Infraestructura', text: 'Instancias, redes, almacenamiento y copias de seguridad.' },
        { icon: '●', title: 'Estado live', text: 'Sincronización y estados vacíos claros cuando falta configuración.' },
      ],
    },
    {
      title: 'Automatización y repositorios',
      sub: 'Pipelines, Terraform, runbooks y despliegues en un flujo operativo.',
      alt: false,
      items: [
        { icon: '⟳', title: 'CI/CD', text: 'Jenkins, despliegues y aprobaciones integradas.' },
        { icon: '▦', title: 'IaC', text: 'Workspaces Terraform con historial de ejecuciones.' },
        { icon: '⎇', title: 'Git', text: 'GitHub y GitLab con visibilidad de ramas, PRs y webhooks.' },
      ],
    },
    {
      title: 'Observabilidad y seguridad',
      sub: 'Métricas, alertas, auditoría y control de acceso para operar con confianza.',
      alt: true,
      items: [
        { icon: '◐', title: 'Observabilidad', text: 'Métricas, logs, facturación y optimización de costes.' },
        { icon: '⛊', title: 'Seguridad', text: 'Centro de seguridad, secretos, cumplimiento y políticas.' },
        { icon: '☰', title: 'Auditoría', text: 'Trazabilidad de acciones y cambios relevantes.' },
      ],
    },
    {
      title: 'Colaboración multi-usuario',
      sub: 'Organizaciones, espacios de trabajo y roles RBAC en español.',
      alt: false,
      items: [
        { icon: '⊞', title: 'Organizaciones', text: 'Aislamiento de datos entre equipos y clientes.' },
        { icon: '⊕', title: 'Roles', text: 'Superadministrador, administrador, operador, auditor y solo lectura.' },
        { icon: '⌁', title: 'Tokens API', text: 'Automatización segura con alcance controlado.' },
      ],
    },
    {
      title: 'Confianza y seguridad',
      sub: 'Diseñado para producción con autenticación verificada y OAuth opcional.',
      alt: true,
      items: [
        { icon: '✉', title: 'Verificación email', text: 'Cuentas activadas tras validar correo profesional.' },
        { icon: '⎈', title: 'OAuth', text: 'Google y GitHub cuando configures las credenciales.' },
        { icon: '⛨', title: 'RBAC', text: 'Permisos granulares por rol en todo el panel.' },
      ],
    },
  ]

  readonly faqs = [
    { q: '¿Necesito configurar integraciones para empezar?', a: 'Puedes crear cuenta y explorar el panel. Las secciones live muestran estado de conexión o «Configuración requerida» hasta conectar proveedores.' },
    { q: '¿Es un demo?', a: 'No. Spendlyx en producción es un panel PRO multi-usuario con datos reales cuando conectas tus servicios.' },
    { q: '¿Puedo invitar a mi equipo?', a: 'Sí. La arquitectura multi-usuario permite organizaciones, membresías y roles diferenciados.' },
    { q: '¿Cómo obtengo acceso PRO?', a: 'Regístrate, verifica tu email y contacta con nosotros si necesitas ampliar capacidades o usuarios.' },
  ]
}
