import { Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  selector: 'app-product-page',
  imports: [RouterLink],
  template: `
    <header class="pub-page-hero">
      <div class="pub-wrap">
        <p class="pub-product-eyebrow">Producto cloud + IA</p>
        <h1>Un plano de control para lanzar, observar y automatizar infraestructura</h1>
        <p>
          Spendlyx reúne AI Infra Studio, inventario multi-cloud, VPS, observabilidad,
          seguridad y repositorios en una navegación coherente para equipos DevOps y CloudOps.
        </p>
        <div class="pub-actions">
          <a [routerLink]="['/registro']" class="pub-btn pub-btn--primary">Crear cuenta</a>
          <a [routerLink]="['/docs']" class="pub-btn pub-btn--outline">Ver documentación</a>
        </div>
      </div>
    </header>

    <main class="pub pub-page-body pub-product">
      <section id="ai-infra-studio" class="pub-wrap pub-product-split">
        <div>
          <p class="pub-product-eyebrow">AI Infra Studio</p>
          <h2>Wizard multi-cloud conectado al sidebar real</h2>
          <p class="pub-product-copy">
            La pantalla principal vive en Automatización → AI Infra Studio y también se abre desde AWS → EC2,
            GCP y VPS → IONOS → Servidores con el proveedor preseleccionado.
          </p>
          <div class="pub-actions">
            <a [routerLink]="['/registro']" class="pub-btn pub-btn--primary">Probar el flujo</a>
            <a [routerLink]="['/contacto']" class="pub-btn pub-btn--outline">Agendar demo</a>
          </div>
        </div>
        <div class="pub-product-flow" aria-label="Flujo de lanzamiento">
          @for (step of launchFlow; track step.title) {
            <article>
              <span>{{ step.num }}</span>
              <strong>{{ step.title }}</strong>
              <p>{{ step.text }}</p>
            </article>
          }
        </div>
      </section>

      <section id="providers" class="pub-section pub-section--alt">
        <div class="pub-wrap">
          <h2>Proveedores soportados con formularios propios</h2>
          <p class="sub">No se copia la misma interfaz para todos: cada proveedor pide sus campos reales y deja coste, logs y acciones trazables.</p>
          <div class="pub-grid">
            @for (provider of providers; track provider.title) {
              <article class="pub-card pub-card--feature">
                <div class="pub-icon" aria-hidden="true">{{ provider.icon }}</div>
                <h3>{{ provider.title }}</h3>
                <p>{{ provider.text }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <section id="inventory" class="pub-section">
        <div class="pub-wrap">
          <h2>Inventario, logs y datos operativos preparados desde el primer lanzamiento</h2>
          <p class="sub">
            Los recursos creados se preparan para aparecer en Infraestructura → Instancias,
            Observabilidad → Logs y las vistas de facturación general sin crear navegación paralela.
          </p>
          <div class="pub-grid">
            @for (f of operationalFeatures; track f.title) {
              <article class="pub-card pub-card--feature">
                <div class="pub-icon" aria-hidden="true">{{ f.icon }}</div>
                <h3>{{ f.title }}</h3>
                <p>{{ f.text }}</p>
              </article>
            }
          </div>
        </div>
      </section>

      <section id="security" class="pub-section pub-section--alt">
        <div class="pub-wrap">
          <h2>Gobierno para equipos que operan infraestructura real</h2>
          <p class="sub">RBAC, auditoría, secretos, aprobaciones y repositorios conviven con el lanzamiento de infraestructura.</p>
          <div class="pub-product-rails">
            @for (rail of rails; track rail.title) {
              <article>
                <strong>{{ rail.title }}</strong>
                <span>{{ rail.text }}</span>
              </article>
            }
          </div>
        </div>
      </section>

      <section class="pub-section">
        <div class="pub-wrap pub-grid">
          @for (f of features; track f.title) {
            <article class="pub-card pub-card--feature">
              <div class="pub-icon" aria-hidden="true">{{ f.icon }}</div>
              <h3>{{ f.title }}</h3>
              <p>{{ f.text }}</p>
            </article>
          }
        </div>
      </section>
    </main>
  `,
  styles: [PUBLIC_THEME, `
    .pub-page-hero .pub-actions { margin-top: 1.25rem; }
    .pub-product-eyebrow {
      margin: 0 0 0.65rem;
      color: #0369a1;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .pub-product-split {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: minmax(0, 0.9fr) minmax(280px, 1.1fr);
      align-items: start;
      padding-bottom: clamp(2rem, 4vw, 3.5rem);
    }
    .pub-product-split h2 {
      margin: 0 0 0.75rem;
      font-size: clamp(1.45rem, 3vw, 2rem);
      line-height: 1.15;
    }
    .pub-product-copy {
      margin: 0;
      color: #64748b;
      line-height: 1.65;
    }
    .pub-product-flow {
      display: grid;
      gap: 0.75rem;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 18px;
      padding: 1rem;
      box-shadow: 0 22px 60px rgba(15, 23, 42, 0.22);
    }
    .pub-product-flow article {
      display: grid;
      grid-template-columns: 38px 1fr;
      gap: 0.25rem 0.75rem;
      align-items: start;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 0.85rem;
      background: rgba(255, 255, 255, 0.04);
    }
    .pub-product-flow span {
      grid-row: span 2;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: #0284c7;
      color: #fff;
      font-weight: 800;
      font-size: 0.78rem;
    }
    .pub-product-flow strong { font-size: 0.92rem; }
    .pub-product-flow p { margin: 0; color: #94a3b8; font-size: 0.82rem; line-height: 1.5; }
    .pub-product-rails {
      display: grid;
      gap: 0.9rem;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .pub-product-rails article {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1rem;
      border-radius: 14px;
      border: 1px solid #dbeafe;
      background: #fff;
    }
    .pub-product-rails strong { color: #0f172a; }
    .pub-product-rails span { color: #64748b; font-size: 0.86rem; line-height: 1.5; }
    @media (max-width: 820px) {
      .pub-product-split { grid-template-columns: 1fr; }
    }
  `],
})
export class ProductPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  ngOnInit(): void { const s = this.route.snapshot.data['seo']; if (s) this.seo.apply(s) }
  launchFlow = [
    { num: '01', title: 'Elegir proveedor', text: 'AWS, GCP o IONOS con entrada directa desde su sección.' },
    { num: '02', title: 'Completar campos propios', text: 'Red, región, imagen, SSH, etiquetas y tamaño según proveedor.' },
    { num: '03', title: 'Lanzar con logs', text: 'Progreso en tiempo real, coste estimado y acciones posteriores.' },
    { num: '04', title: 'Probar o eliminar', text: 'Conectividad, auditoría y limpieza controlada del recurso.' },
  ]
  providers = [
    { icon: 'AWS', title: 'AWS EC2', text: 'Cuenta, región, availability zone, VPC, subnet, security group, key pair, AMI, tipo, disco, nombre y tags.' },
    { icon: 'GCP', title: 'GCP Compute Engine', text: 'Proyecto, cuenta, región, zona, VPC network, subnet, firewall rule, machine type, boot disk, image, SSH key y labels.' },
    { icon: 'ION', title: 'IONOS VPS', text: 'Cuenta IONOS, datacenter, región, plan VPS, CPU, RAM, disco, sistema operativo, SSH key, nombre y coste.' },
  ]
  operationalFeatures = [
    { icon: 'INV', title: 'Inventario de instancias', text: 'Proveedor, nombre, región/zona, estado, IP pública, tamaño, coste estimado, creación y acciones.' },
    { icon: 'LOG', title: 'Logs de lanzamiento', text: 'Los eventos de crear, probar y eliminar se muestran en el wizard y se referencian desde Observabilidad → Logs.' },
    { icon: '€', title: 'Datos de coste', text: 'Proveedor, tipo, región, precio/hora, precio/mes, estado y etiquetas quedan preparados para facturación general.' },
  ]
  rails = [
    { title: 'Seguridad', text: 'Centro de seguridad, gestor de secretos, cumplimiento, control de acceso y auditoría.' },
    { title: 'Automatización', text: 'Jenkins, despliegues, sesiones activas, historial, runbooks, programador, catálogo y aprobaciones.' },
    { title: 'Repositorios', text: 'GitHub y GitLab con webhooks, ramas, commits, pull requests, merge requests y despliegues.' },
  ]
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
