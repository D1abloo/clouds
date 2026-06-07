import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { PageHeaderComponent, type PageHeaderAction } from '../../shared/components/page-header/page-header.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { DemoService } from '../../core/services/demo.service'
import { ToastService } from '../../core/services/toast.service'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import {
  ADMIN_DEMO_ACCENT,
  ADMIN_DEMO_ACCENT_BORDER,
  ADMIN_DEMO_ACCENT_LIGHT,
  downloadBlob,
} from './admin.config'

@Component({
  selector: 'app-admin-demo-mode-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    StatusBadgeComponent,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container demo-page animate-fade-in">
      <app-page-header
        title="Modo demo"
        description="Datos cloud simulados para explorar CloudOps sin recursos reales AWS/GCP/Azure."
        icon="science"
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      <section class="demo-intro">
        <div class="demo-intro__main">
          <span class="demo-intro__eyebrow">Administración · Entorno de prueba</span>
          <h2 class="demo-intro__title">Datos demo de CloudOps</h2>
          <p class="demo-intro__desc">
            Carga o reinicia el dataset simulado con instancias EC2, VPS, métricas, alertas, Jenkins,
            Terraform y más. Ideal para demos, formación y evaluación de la plataforma.
          </p>
        </div>
        <ul class="demo-intro__uses">
          <li><mat-icon>cloud</mat-icon><span>Instancias AWS, GCP y Azure simuladas</span></li>
          <li><mat-icon>build</mat-icon><span>Pipelines Jenkins y workspaces Terraform</span></li>
          <li><mat-icon>warning</mat-icon><span>Alertas, incidentes y facturación de ejemplo</span></li>
        </ul>
      </section>

      <div class="demo-grid">
        <section class="table-card demo-panel">
          <h3><mat-icon>info</mat-icon> Estado del demo</h3>
          @if (demo.statusLoading()) {
            <div class="demo-status__loading" role="status">
              <mat-spinner diameter="20" />
              Cargando estado…
            </div>
          } @else {
            <dl class="demo-status">
              <div><dt>Modo demo</dt><dd><app-status-badge [value]="demo.demoMode() ? 'running' : 'stopped'" /></dd></div>
              <div><dt>Permisos</dt><dd>{{ demo.canManageDemo() ? 'Admin — puede gestionar' : 'Solo lectura' }}</dd></div>
              @if (demo.status(); as s) {
                <div><dt>Instancias</dt><dd>{{ s.instances }}</dd></div>
                <div><dt>VPS</dt><dd>{{ s.vps }}</dd></div>
                <div><dt>Alertas</dt><dd>{{ s.alerts }}</dd></div>
                <div><dt>Métricas</dt><dd>{{ s.metrics }}</dd></div>
              }
            </dl>
            @if (demo.statusOffline()) {
              <p class="demo-status__offline">
                <mat-icon>cloud_off</mat-icon>
                Backend no disponible — mostrando contadores estimados. Inicia el API o pulsa «Actualizar estado».
              </p>
            }
          }
          <div class="demo-actions">
            @if (demo.loading()) {
              <mat-spinner diameter="28" />
            } @else {
              <button type="button" class="page-action-btn page-action-btn--primary" [disabled]="!demo.canManageDemo()" (click)="handleDemoLoad()">
                <mat-icon>cloud_upload</mat-icon> Cargar datos demo
              </button>
              <button type="button" class="page-action-btn demo-reset" [disabled]="!demo.canManageDemo()" (click)="handleDemoReset()">
                <mat-icon>restart_alt</mat-icon> Reiniciar demo
              </button>
              <button type="button" class="page-action-btn" (click)="demo.refreshStatus()">
                <mat-icon>refresh</mat-icon> Actualizar estado
              </button>
            }
          </div>
          @if (!demo.canManageDemo()) {
            <p class="demo-hint">Inicia sesión como admin para cargar o resetear datos demo.</p>
          }
        </section>

        <section class="table-card demo-panel">
          <h3><mat-icon>vpn_key</mat-icon> Credenciales demo</h3>
          <dl class="demo-creds">
            <div><dt>Admin</dt><dd><code>admin&#64;cloudops.local</code> / <code>Admin1234!</code></dd></div>
            <div><dt>Demo</dt><dd><code>demo&#64;cloudops.local</code> / <code>Demo1234!</code></dd></div>
            <div><dt>Operador</dt><dd><code>ops&#64;cloudops</code> / <code>Ops1234!</code></dd></div>
          </dl>
          <button type="button" class="page-action-btn page-action-btn--sm" (click)="handleCopyCreds()">
            <mat-icon>content_copy</mat-icon> Copiar credenciales
          </button>
        </section>

        <section class="table-card demo-panel demo-panel--wide">
          <h3><mat-icon>category</mat-icon> Categorías de datos simulados</h3>
          <div class="demo-categories">
            @for (cat of categories; track cat.id) {
              <article class="demo-cat">
                <mat-icon>{{ cat.icon }}</mat-icon>
                <div>
                  <strong>{{ cat.label }}</strong>
                  <p>{{ cat.desc }}</p>
                  <span class="demo-cat__count">{{ cat.count }} registros</span>
                </div>
              </article>
            }
          </div>
        </section>

        <section class="table-card demo-panel demo-panel--wide">
          <h3><mat-icon>psychology</mat-icon> Qué se simula</h3>
          <ul class="demo-simulates">
            @for (item of simulated; track item) {
              <li><mat-icon>check_circle</mat-icon>{{ item }}</li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .demo-page { display: flex; flex-direction: column; gap: 0.65rem; overflow-y: auto; scrollbar-width: thin; --page-accent: ${ADMIN_DEMO_ACCENT}; }
    .demo-page ::ng-deep .page-action-btn--primary { background: ${ADMIN_DEMO_ACCENT}; border-color: #b45309; &:hover:not(:disabled) { background: #b45309; } }
    .demo-intro { display: flex; flex-wrap: wrap; gap: 1rem; padding: 0.75rem 1rem; border-radius: var(--app-radius-md, 10px); border: 1px solid ${ADMIN_DEMO_ACCENT_BORDER}; background: ${ADMIN_DEMO_ACCENT_LIGHT}; }
    .demo-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: ${ADMIN_DEMO_ACCENT}; }
    .demo-intro__title { margin: 0.2rem 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .demo-intro__desc { margin: 0; max-width: 38rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .demo-intro__uses { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 220px; }
    .demo-intro__uses li { display: flex; align-items: flex-start; gap: 0.35rem; font-size: 0.68rem; color: #475569; }
    .demo-intro__uses mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: ${ADMIN_DEMO_ACCENT}; flex-shrink: 0; }
    .demo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
    .demo-panel { padding: 0.85rem 1rem; }
    .demo-panel--wide { grid-column: 1 / -1; }
    .demo-panel h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.75rem; font-size: 0.85rem; font-weight: 700; color: #0f172a; }
    .demo-panel h3 mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: ${ADMIN_DEMO_ACCENT}; }
    .demo-status { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem; margin: 0 0 1rem; dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; } dd { margin: 0.1rem 0 0; font-size: 0.78rem; } }
    .demo-status__loading { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.72rem; color: #64748b; }
    .demo-status__offline {
      display: flex; align-items: flex-start; gap: 0.35rem; margin: 0 0 1rem;
      padding: 0.5rem 0.65rem; border-radius: 8px; font-size: 0.68rem; line-height: 1.45;
      color: #b45309; background: ${ADMIN_DEMO_ACCENT_LIGHT}; border: 1px solid ${ADMIN_DEMO_ACCENT_BORDER};
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; flex-shrink: 0; margin-top: 0.05rem; }
    }
    .demo-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .demo-reset { color: #b91c1c; border-color: #fecaca; }
    .demo-hint { margin: 0.75rem 0 0; font-size: 0.72rem; color: #b45309; }
    .demo-creds { margin: 0 0 0.75rem; dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; } dd { margin: 0.1rem 0 0.5rem; font-size: 0.72rem; } code { font-size: 0.68rem; padding: 0.1rem 0.3rem; border-radius: 4px; background: #f1f5f9; } }
    .demo-categories { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.5rem; }
    .demo-cat { display: flex; gap: 0.5rem; padding: 0.65rem; border-radius: 10px; border: 1px solid ${ADMIN_DEMO_ACCENT_BORDER}; background: ${ADMIN_DEMO_ACCENT_LIGHT}; }
    .demo-cat mat-icon { color: ${ADMIN_DEMO_ACCENT}; flex-shrink: 0; }
    .demo-cat strong { font-size: 0.78rem; display: block; }
    .demo-cat p { margin: 0.15rem 0; font-size: 0.65rem; color: #64748b; line-height: 1.4; }
    .demo-cat__count { font-size: 0.58rem; font-weight: 700; color: ${ADMIN_DEMO_ACCENT}; }
    .demo-simulates { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.35rem; }
    .demo-simulates li { display: flex; align-items: flex-start; gap: 0.35rem; font-size: 0.72rem; color: #475569; }
    .demo-simulates mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: #15803d; flex-shrink: 0; }
    @media (max-width: 900px) { .demo-grid { grid-template-columns: 1fr; } .demo-panel--wide { grid-column: auto; } }
  `,
})
export class AdminDemoModePageComponent implements OnInit {
  readonly demo = inject(DemoService)
  private readonly toast = inject(ToastService)
  private readonly actions = inject(PlatformActionService)

  readonly headerActions: PageHeaderAction[] = [
    { label: 'Cargar demo', icon: 'cloud_upload', primary: true },
    { label: 'Exportar estado', icon: 'download' },
    { label: 'Documentación', icon: 'menu_book' },
  ]

  readonly categories = [
    { id: 'cloud', label: 'Cloud', desc: 'EC2, Compute Engine, VMs Azure', icon: 'cloud', count: 48 },
    { id: 'vps', label: 'VPS / Bare metal', desc: 'Servidores dedicados y SSH', icon: 'storage', count: 12 },
    { id: 'k8s', label: 'Kubernetes', desc: 'Pods, deployments, ingress', icon: 'hub', count: 86 },
    { id: 'jenkins', label: 'Jenkins', desc: 'Jobs, builds y pipelines', icon: 'build', count: 24 },
    { id: 'terraform', label: 'Terraform', desc: 'Workspaces y runs', icon: 'account_tree', count: 18 },
    { id: 'alerts', label: 'Alertas', desc: 'Activas, silenciadas e historial', icon: 'warning', count: 32 },
    { id: 'billing', label: 'Facturación', desc: 'Costes multi-cloud', icon: 'payments', count: 156 },
    { id: 'repos', label: 'Repositorios', desc: 'GitHub y GitLab', icon: 'folder', count: 14 },
  ]

  readonly simulated = [
    'API REST con respuestas simuladas y latencia realista',
    'Métricas Prometheus-style con series temporales',
    'Webhooks salientes con firma HMAC-SHA256',
    'Aprobaciones y flujos de cambio con estados',
    'Auditoría de acciones de usuario y API tokens',
    'Topología de red e inventario de recursos',
    'Asistente IA (Copilot) con respuestas contextuales',
  ]

  ngOnInit(): void {
    this.demo.refreshStatus()
  }

  handleHeader = (label: string): void => {
    if (label === 'Cargar demo') {
      this.handleDemoLoad()
      return
    }
    if (label === 'Exportar estado') {
      const s = this.demo.status()
      downloadBlob(JSON.stringify(s ?? {}, null, 2), `demo-status-${Date.now()}.json`, 'application/json')
      this.toast.success('Estado del demo exportado')
      return
    }
    this.actions.runPageAction('settings', 'docs', label, { area: 'admin' })
    this.toast.info('Abriendo documentación del modo demo')
  }

  handleDemoLoad = (): void => {
    this.demo.loadDemo()
    this.actions.runPageAction('settings', 'demo-load', 'Datos demo cargados', { area: 'admin' })
  }

  handleDemoReset = (): void => {
    this.demo.resetDemo()
    this.actions.runPageAction('settings', 'demo-reset', 'Demo reiniciado', { area: 'admin' })
  }

  handleCopyCreds = (): void => {
    const text = 'admin@cloudops.local / Admin1234!\ndemo@cloudops.local / Demo1234!\nops@cloudops / Ops1234!'
    void navigator.clipboard.writeText(text).then(
      () => this.toast.success('Credenciales copiadas al portapapeles'),
      () => this.toast.info(text),
    )
  }
}
