import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { PublicApiService, PublicStats } from './public-api.service'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'
import { publicAnimations } from './public.animations'

const EMPTY_STATS: PublicStats = {
  organizations: 0,
  users: 0,
  cloudAccounts: { aws: 0, gcp: 0, azure: 0, total: 0 },
  activeInstances: 0,
  totalInstances: 0,
  uptimePercent: '99.9%',
  updatedAt: new Date().toISOString(),
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  animations: publicAnimations,
  template: `
    <section class="pub-hero" @fadeUp>
      <div class="pub-wrap pub-hero__grid">
        <div class="pub-hero__copy">
          <p class="pub-hero__eyebrow">
            {{ stats().organizations }}+ organizaciones · AI Infra Studio multi-cloud
          </p>
          <h1>Lanza y gobierna infraestructura cloud con IA desde un panel operativo</h1>
          <p>
            Spendlyx conecta AWS EC2, GCP Compute Engine, Azure, IONOS y proveedores VPS
            con inventario, logs, seguridad, repositorios y automatización para equipos DevOps,
            CloudOps y startups.
          </p>
          <div class="pub-actions">
            <a routerLink="/registro" class="pub-btn pub-btn--primary">Crear cuenta gratis</a>
            <a routerLink="/login" class="pub-btn pub-btn--ghost">Iniciar sesión</a>
          </div>
          <div class="pub-hero__trust">
            <span>AWS · GCP · Azure · IONOS</span>
            <span>GitHub y GitLab</span>
            <span>Lanzar · Probar · Eliminar</span>
          </div>
        </div>
        <div class="pub-mock pub-hero__mock" aria-hidden="true">
          <span class="pub-mock__label">AI Infra Studio</span>
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

    <section class="pub-stats-bar" aria-label="Métricas en vivo">
      <div class="pub-wrap">
        <p class="pub-stats-bar__live">Datos en vivo del panel</p>
        <div class="pub-stats-bar__grid">
          <div class="pub-stats-bar__item">
            <strong>{{ formatNum(stats().organizations) }}</strong>
            <span>Organizaciones</span>
          </div>
          <div class="pub-stats-bar__item">
            <strong>{{ formatNum(stats().users) }}</strong>
            <span>Usuarios</span>
          </div>
          <div class="pub-stats-bar__item">
            <strong>{{ formatNum(stats().activeInstances) }}</strong>
            <span>Instancias activas</span>
          </div>
          <div class="pub-stats-bar__item">
            <strong>{{ stats().uptimePercent }}</strong>
            <span>Disponibilidad</span>
          </div>
        </div>
      </div>
    </section>

    <section class="pub-section pub-provider-cloud" @fadeUp>
      <div class="pub-wrap">
        <h2>Un flujo de lanzamiento para cloud pública y VPS</h2>
        <p class="sub">
          El wizard guía cada proveedor con campos propios, coste estimado, logs embebidos y acciones de prueba
          o eliminación desde el mismo contexto operativo.
        </p>
        <div class="pub-provider-grid">
          @for (provider of providers; track provider.name) {
            <article class="pub-provider">
              <span class="pub-provider__code">{{ provider.code }}</span>
              <h3>{{ provider.name }}</h3>
              <p>{{ provider.text }}</p>
            </article>
          }
        </div>
        <div class="pub-launch-strip" aria-label="Flujo de lanzamiento">
          @for (step of launchFlow; track step) {
            <span>{{ step }}</span>
          }
        </div>
      </div>
    </section>

    <section class="pub-section pub-problems" @fadeUp>
      <div class="pub-wrap">
        <div class="pub-problems__intro">
          <h2>Si esto te suena familiar, no estás solo</h2>
          <p class="sub">Tres fricciones habituales. Una plataforma pensada para operar sin saltos de contexto.</p>
        </div>
        <div class="pub-problems__grid">
          @for (p of problems; track p.num) {
            <article class="pub-problem">
              <div class="pub-problem__num">{{ p.num }}</div>
              <h3>{{ p.label }}</h3>
              <span class="pub-problem__tag">{{ p.title }}</span>
              <p>{{ p.text }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section id="funciones" class="pub-section pub-section--alt pub-section--anchor" @fadeUp>
      <div class="pub-wrap">
        <h2>Una plataforma. Tres pilares. Toda tu operación cloud.</h2>
        <p class="sub">
          Spendlyx no es otro dashboard suelto. Es un plano de control construido sobre lanzamiento,
          visibilidad, automatización y gobierno operativo.
        </p>
        <div class="pub-pillars__grid">
          @for (pillar of pillars; track pillar.num) {
            <article class="pub-pillar">
              <div class="pub-pillar__num">{{ pillar.num }}</div>
              <h3>{{ pillar.label }}</h3>
              <span class="pub-pillar__title">{{ pillar.title }}</span>
              <ul>
                @for (item of pillar.items; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="pub-section" @fadeUp>
      <div class="pub-wrap">
        <h2>Especializado por módulo. Potente por plataforma.</h2>
        <p class="sub">Los mismos módulos que ves en el sidebar del panel — listos para conectar.</p>
        <div class="pub-modules__grid">
          @for (mod of modules; track mod.title) {
            <article class="pub-module">
              <div class="pub-module__icon" aria-hidden="true">{{ mod.icon }}</div>
              <div>
                <strong>{{ mod.title }}</strong>
                <span>{{ mod.text }}</span>
              </div>
            </article>
          }
        </div>
        <div class="pub-actions" style="margin-top: 2rem">
          <a routerLink="/producto" class="pub-btn pub-btn--outline">Ver producto completo</a>
        </div>
      </div>
    </section>

    <section class="pub-section pub-section--alt" @fadeUp>
      <div class="pub-wrap">
        <h2>Del caos al control en una semana</h2>
        <p class="sub">Lo que cambia cuando Spendlyx entra a tu operación.</p>
        <div class="pub-compare">
          <div class="pub-compare__head">
            <span>Antes</span>
            <span>Con Spendlyx</span>
          </div>
          @for (row of comparisons; track row.before) {
            <div class="pub-compare__row">
              <div class="pub-compare__before">{{ row.before }}</div>
              <div class="pub-compare__after">{{ row.after }}</div>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="pub-section" @fadeUp>
      <div class="pub-wrap" style="text-align: center">
        <h2>Empieza en minutos. Sin complicaciones.</h2>
        <p class="sub" style="margin-left: auto; margin-right: auto">
          Tu operación cloud moderna en 3 pasos, con datos reales cuando conectas tus proveedores.
        </p>
        <div class="pub-steps">
          @for (step of steps; track step.num) {
            <article class="pub-step">
              <div class="pub-step__num">{{ step.num }}</div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.text }}</p>
            </article>
          }
        </div>
        <div class="pub-actions" style="justify-content: center; margin-top: 1.5rem">
          <a routerLink="/registro" class="pub-btn pub-btn--primary">Crear cuenta</a>
          <a routerLink="/contacto" class="pub-btn pub-btn--outline">Agendar demo</a>
        </div>
      </div>
    </section>

    <section id="precios" class="pub-pricing-band pub-section--anchor" @fadeUp>
      <div class="pub-wrap">
        <h2>Planes que crecen con tu equipo</h2>
        <p class="sub" style="margin: 0 auto 1.5rem">Empieza con lo que necesitas hoy. Escala cuando crezcas.</p>
        <a routerLink="/planes" class="pub-btn pub-btn--primary">Ver planes y precios</a>
      </div>
    </section>

    <section id="faq" class="pub-section pub-section--alt pub-section--anchor" @fadeUp>
      <div class="pub-wrap pub-faq">
        <h2>Preguntas frecuentes</h2>
        <p class="sub">Respuestas sobre modo PRO, seguridad y equipos multi-usuario.</p>
        @for (f of faqs; track f.q) {
          <details>
            <summary>{{ f.q }}</summary>
            <p>{{ f.a }}</p>
          </details>
        }
      </div>
    </section>

    <section class="pub-section" @fadeUp>
      <div class="pub-wrap pub-newsletter">
        <h2>Mantente al día</h2>
        <p class="sub" style="margin: 0 auto">
          Recibe novedades sobre lanzamiento de infraestructura, buenas prácticas cloud y actualizaciones de Spendlyx.
        </p>
        <form (submit)="handleNewsletter($event)" aria-label="Suscripción al boletín">
          <input
            type="email"
            name="email"
            placeholder="tu@empresa.com"
            required
            aria-label="Correo electrónico"
            autocomplete="email"
          />
          <button type="submit" class="pub-btn pub-btn--primary">Suscribirme</button>
        </form>
        <p class="pub-newsletter__hint">Sin spam. Puedes darte de baja en cualquier momento.</p>
      </div>
    </section>

    <section class="pub-section pub-cta" @fadeUp>
      <div class="pub-wrap pub-cta__inner">
        <h2>Tu operación cloud merece un panel moderno. Empieza hoy.</h2>
        <p>Crea tu cuenta, verifica tu correo y opera desde un solo lugar con tu equipo.</p>
        <div class="pub-actions">
          <a routerLink="/registro" class="pub-btn pub-btn--primary">Crear cuenta</a>
          <a routerLink="/login" class="pub-btn pub-btn--outline">Iniciar sesión</a>
        </div>
      </div>
    </section>
  `,
  styles: [
    PUBLIC_THEME,
    `
    .pub-hero__mock { min-height: 280px; }
    .pub-provider-cloud { background: #fff; }
    .pub-provider-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      margin-top: 1.5rem;
    }
    .pub-provider {
      border: 1px solid #dbeafe;
      border-radius: 14px;
      padding: 1rem;
      background: linear-gradient(160deg, #ffffff 0%, #f8fafc 100%);
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
    }
    .pub-provider__code {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 42px;
      min-height: 28px;
      border-radius: 9px;
      background: #0f172a;
      color: #bae6fd;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      margin-bottom: 0.75rem;
    }
    .pub-provider h3 { margin: 0 0 0.35rem; font-size: 0.98rem; }
    .pub-provider p { margin: 0; color: #64748b; font-size: 0.84rem; line-height: 1.55; }
    .pub-launch-strip {
      margin-top: 1.25rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      align-items: center;
    }
    .pub-launch-strip span {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #334155;
      border-radius: 999px;
      padding: 0.48rem 0.72rem;
      font-size: 0.78rem;
      font-weight: 700;
    }
    `,
  ],
})
export class HomePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  private readonly publicApi = inject(PublicApiService)

  readonly stats = signal<PublicStats>(EMPTY_STATS)

  ngOnInit(): void {
    const seo = this.route.snapshot.data['seo']
    if (seo) this.seo.apply(seo)
    this.loadStats()
  }

  formatNum = (n: number): string => {
    if (n >= 1000) return `${Math.floor(n / 100) / 10}k+`
    if (n > 0) return `${n}+`
    return '0'
  }

  handleNewsletter = (event: Event): void => {
    event.preventDefault()
    const form = event.target as HTMLFormElement
    form.reset()
  }

  private loadStats = (): void => {
    this.publicApi.getStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => this.stats.set(EMPTY_STATS),
    })
  }

  readonly problems = [
    {
      num: '01',
      label: 'Lanzamientos manuales',
      title: 'Campos, permisos y validaciones en cada consola',
      text: 'Crear una instancia exige recordar cuenta, región, red, imagen, claves SSH, etiquetas y coste. El equipo pierde trazabilidad entre tickets, scripts y consolas.',
    },
    {
      num: '02',
      label: 'Inventario incompleto',
      title: 'Cloud pública, VPS y repos en silos',
      text: 'AWS, GCP, Azure, IONOS, DigitalOcean, Hetzner, GitHub y GitLab viven separados. Nadie tiene una vista fiable del estado real de la plataforma.',
    },
    {
      num: '03',
      label: 'Señales dispersas',
      title: 'Logs, alertas, seguridad y despliegues sin hilo común',
      text: 'Cuando algo falla, métricas, logs, aprobaciones, incidencias y auditoría quedan repartidas. Diagnosticar consume más tiempo que resolver.',
    },
  ]

  readonly pillars = [
    {
      num: '01',
      label: 'Visibilidad',
      title: 'Inventario vivo y centro de salud',
      items: [
        'Tablero, centro de mando, explorador de recursos y topología',
        'Inventario unificado para cloud pública, VPS, Docker y Kubernetes',
        'Estados, regiones, IPs, tamaño y coste estimado por recurso',
        'Empty states con acciones claras cuando falta una integración',
      ],
    },
    {
      num: '02',
      label: 'Lanzamiento con IA',
      title: 'AI Infra Studio para AWS, GCP e IONOS',
      items: [
        'Wizard con formularios propios para AWS EC2, GCP Compute e IONOS VPS',
        'Coste estimado, logs embebidos y validaciones por proveedor',
        'Acciones para lanzar, probar conectividad y eliminar recursos',
        'Runbooks y tareas programadas',
      ],
    },
    {
      num: '03',
      label: 'Gobierno operativo',
      title: 'Observabilidad, seguridad y repositorios',
      items: [
        'Métricas, logs, alertas, incidentes e informes',
        'RBAC, auditoría, tokens API y gestor de secretos',
        'GitHub, GitLab, webhooks, ramas, commits y despliegues',
        'Datos de coste preparados para facturación y optimización',
      ],
    },
  ]

  readonly modules = [
    { icon: '◈', title: 'AI Infra Studio', text: 'Wizard multi-cloud para lanzar, probar y eliminar infraestructura.' },
    { icon: '☁', title: 'AWS / GCP / Azure', text: 'Cuentas cloud, regiones, redes, métricas y sincronización live.' },
    { icon: '▤', title: 'VPS e IONOS', text: 'Servidores europeos, planes VPS, datacenters y métricas por proveedor.' },
    { icon: '⎈', title: 'Kubernetes', text: 'Clústeres, namespaces y cargas de trabajo.' },
    { icon: '▣', title: 'Docker', text: 'Contenedores, imágenes y descubrimiento en hosts.' },
    { icon: '▦', title: 'Infraestructura', text: 'Instancias, red, almacenamiento, backups y capacidad.' },
    { icon: '⟳', title: 'Jenkins', text: 'Jobs, builds y despliegues automatizados.' },
    { icon: '⎇', title: 'Repositorios', text: 'GitHub, GitLab, ramas, commits y PRs.' },
    { icon: '◐', title: 'Observabilidad', text: 'Métricas, alertas, logs y facturación.' },
    { icon: '⛊', title: 'Seguridad', text: 'RBAC, auditoría, secretos y cumplimiento.' },
  ]

  readonly comparisons = [
    { before: 'Consolas separadas por proveedor', after: 'Panel multi-cloud unificado en español' },
    { before: 'Formularios repetidos para cada instancia', after: 'Wizard con proveedor preseleccionado y validaciones claras' },
    { before: 'Instancias y VPS fuera del inventario', after: 'Recursos creados visibles en Infraestructura → Instancias' },
    { before: 'Pruebas de conectividad manuales', after: 'Acción de probar con logs del proceso' },
    { before: 'Jenkins y runbooks en silos', after: 'Automatización integrada al inventario live' },
    { before: 'Repos desconectados de la infra', after: 'GitHub/GitLab vinculados a despliegues' },
    { before: 'Equipos sin roles ni permisos claros', after: 'RBAC multi-usuario por organización' },
    { before: 'Sin visibilidad de salud operativa', after: 'Dashboard, logs y alertas centralizadas' },
    { before: 'Horas perdidas en context switching', after: 'Operación coordinada desde un panel' },
  ]

  readonly steps = [
    {
      num: '01',
      title: 'Crea tu cuenta',
      text: 'Regístrate gratis, verifica tu correo y accede al panel en minutos.',
    },
    {
      num: '02',
      title: 'Conecta proveedores',
      text: 'Vincula AWS, GCP, Azure, IONOS, VPS, Jenkins y repositorios cuando lo necesites.',
    },
    {
      num: '03',
      title: 'Lanza y observa',
      text: 'Crea recursos con AI Infra Studio, prueba conectividad, consulta logs y gobierna la flota.',
    },
  ]

  readonly providers = [
    { code: 'AWS', name: 'AWS EC2', text: 'Cuenta, región, AZ, VPC, subnet, security group, key pair, AMI, tipo, disco, tags y coste.' },
    { code: 'GCP', name: 'GCP Compute Engine', text: 'Proyecto, cuenta, región, zona, VPC network, subnet, firewall, machine type, image, SSH key y labels.' },
    { code: 'ION', name: 'IONOS VPS', text: 'Cuenta IONOS, datacenter, región, plan VPS, CPU, RAM, disco, sistema operativo, SSH key y coste.' },
    { code: 'VPS', name: 'VPS multi-proveedor', text: 'DigitalOcean, Hetzner, Linode, OVH, Vultr, Scaleway y Clouding preparados en la navegación real.' },
  ]

  readonly launchFlow = ['Seleccionar proveedor', 'Validar campos', 'Estimar coste', 'Lanzar o crear', 'Ver progreso', 'Probar conectividad', 'Eliminar si procede']

  readonly faqs = [
    {
      q: '¿Qué es el modo PRO de Spendlyx?',
      a: 'Es el panel en producción con datos reales conectados a tus proveedores cloud, Jenkins, Terraform y repositorios. No es un mockup estático: cada módulo sincroniza con tus integraciones configuradas.',
    },
    {
      q: '¿Necesito configurar integraciones para empezar?',
      a: 'Puedes crear cuenta y explorar el panel de inmediato. Las secciones live muestran estados vacíos profesionales o «Configuración requerida» hasta que conectes tus servicios.',
    },
    {
      q: '¿Es seguro? ¿Dónde se guardan mis datos?',
      a: 'Las credenciales cloud se almacenan como referencias cifradas en variables de entorno y base de datos segura. El panel incluye RBAC, auditoría de acciones y verificación de email obligatoria.',
    },
    {
      q: '¿Puedo invitar a mi equipo?',
      a: 'Sí. Spendlyx soporta organizaciones, espacios de trabajo y roles diferenciados: superadministrador, administrador, operador, auditor y solo lectura.',
    },
    {
      q: '¿Cómo funciona OAuth con Google y GitHub?',
      a: 'Puedes iniciar sesión con OAuth cuando las credenciales estén configuradas en el entorno PRO. También puedes usar correo y contraseña con verificación de email.',
    },
    {
      q: '¿Qué proveedores cloud soporta?',
      a: 'AWS, GCP y Azure para cloud pública, IONOS y otros VPS para servidores, además de Docker, Kubernetes, Jenkins, GitHub y GitLab desde el mismo panel.',
    },
    {
      q: '¿Puedo exportar mis datos?',
      a: 'Sí. Puedes exportar facturación en CSV, revisar auditoría de acciones y gestionar tus integraciones sin vendor lock-in en la operación diaria.',
    },
    {
      q: '¿Cuánto tiempo toma implementarlo?',
      a: 'La configuración básica toma minutos: creas cuenta, verificas email y conectas tu primer proveedor cloud. Equipos más grandes pueden escalar usuarios y módulos progresivamente.',
    },
  ]
}
