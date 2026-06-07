import { Component, computed, inject, signal } from '@angular/core'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatTabsModule } from '@angular/material/tabs'
import { MatDialog } from '@angular/material/dialog'
import { SecurityCenterService, type ScanCompletionResult } from './security-center.service'
import { ToastService } from '../../core/services/toast.service'
import {
  SECURITY_ACCENT,
  SECURITY_ACCENT_BORDER,
  SECURITY_ACCENT_LIGHT,
  SECURITY_PROVIDERS,
  SECURITY_SEVERITY_OPTIONS,
  downloadBlob,
  securitySeverityLabel,
  type SecuritySeverity,
} from './security.config'
import {
  buildScanReportText,
  scanReportFilename,
  type SecurityScanReport,
} from './security-scan-report.util'
import { SecurityScanReportDialogComponent } from './security-scan-report-dialog.component'
import type { SecurityRisk } from './security-center.demo'

type ScanPhase = 'config' | 'running' | 'results'
type ScanScope = 'full' | 'critical' | 'targeted'

const SCAN_CATEGORIES = ['Red', 'IAM', 'Secretos', 'Contenedores', 'Almacenamiento', 'Cifrado'] as const

const SCAN_STEPS = [
  {
    label: 'Preparando escaneo',
    icon: 'hourglass_top',
    detail: 'Inicializando motor cloudops-posture-scanner v2.4.1 y validando credenciales de los proveedores seleccionados.',
    activities: [
      'Validando tokens de API y permisos de lectura',
      'Cargando pack de políticas CIS v1.4 y baseline interno',
      'Sincronizando inventario de recursos conectados',
    ],
  },
  {
    label: 'Analizando recursos',
    icon: 'dns',
    detail: 'Recorriendo instancias, buckets, clusters y endpoints expuestos en el inventario activo.',
    activities: [
      'Inventariando compute y almacenamiento en AWS',
      'Consultando nodos y workloads en Kubernetes',
      'Revisando contenedores Docker en hosts VPS',
    ],
  },
  {
    label: 'Detectando hallazgos',
    icon: 'gpp_maybe',
    detail: 'Correlacionando configuraciones inseguras con reglas de postura y controles de cumplimiento.',
    activities: [
      'Comparando políticas IAM con mínimo privilegio',
      'Detectando secretos expuestos en variables de entorno',
      'Marcando recursos sin cifrado en reposo',
    ],
  },
  {
    label: 'Escaneando red y puertos',
    icon: 'settings_ethernet',
    detail: 'Analizando grupos de seguridad, reglas de firewall y puertos abiertos hacia Internet.',
    activities: [
      'Evaluando SG sg-web-prod (0.0.0.0/0:22)',
      'Escaneando puertos en vps-edge-01 · 443, 8080',
      'Comprobando reglas DNAT en firewall perimetral',
    ],
  },
  {
    label: 'Revisando IAM y secretos',
    icon: 'vpn_key',
    detail: 'Auditando roles, claves de acceso, rotación de credenciales y políticas de bucket.',
    activities: [
      'Revisando clave IAM sin rotación > 90 días',
      'Analizando acceso cross-account en rol deploy-ci',
      'Verificando secretos en AWS Secrets Manager',
    ],
  },
  {
    label: 'Evaluando firewalls',
    icon: 'security',
    detail: 'Contrastando reglas activas con baseline de red y detectando excepciones permanentes.',
    activities: [
      'Auditando regla allow-all temporal en fw-dmz',
      'Validando segmentación entre subnets prod/staging',
      'Comprobando logs de cambios recientes en pfSense',
    ],
  },
  {
    label: 'Generando recomendaciones',
    icon: 'lightbulb',
    detail: 'Priorizando hallazgos por severidad, impacto y remediación automática disponible.',
    activities: [
      'Calculando delta de puntuación de riesgo',
      'Agrupando hallazgos por propietario y servicio',
      'Preparando pasos de remediación sugeridos',
    ],
  },
  {
    label: 'Escaneo completado',
    icon: 'check_circle',
    detail: 'Informe consolidado listo. Los nuevos hallazgos se añadirán al centro de seguridad.',
    activities: ['Finalizando informe de postura', 'Actualizando KPIs del centro de seguridad'],
  },
]

type ScanTargetStatus = 'pending' | 'scanning' | 'done'

interface ScanTarget {
  id: string
  provider: string
  category: string
  resource: string
  resourceType: string
  region: string
  check: string
  status: ScanTargetStatus
}

const CATEGORY_CHECKS: Record<(typeof SCAN_CATEGORIES)[number], string> = {
  Red: 'Puertos abiertos, firewalls y exposición a Internet',
  IAM: 'Roles, políticas y permisos de acceso',
  Secretos: 'Credenciales expuestas y rotación de claves',
  Contenedores: 'Imágenes, runtime y configuración de pods',
  Almacenamiento: 'Buckets, ACLs y acceso público',
  Cifrado: 'TLS, cifrado en reposo y certificados',
}

const PROVIDER_RESOURCE_CATALOG: Record<string, { resource: string; resourceType: string; region: string }[]> = {
  AWS: [
    { resource: 'ec2-web-prod-01', resourceType: 'Instancia EC2', region: 'eu-west-1' },
    { resource: 's3-logs-archive', resourceType: 'Bucket S3', region: 'us-east-1' },
    { resource: 'api-gateway-prod', resourceType: 'Load Balancer', region: 'eu-west-1' },
    { resource: 'rds-analytics', resourceType: 'Base de datos RDS', region: 'eu-west-1' },
  ],
  VPS: [
    { resource: 'vps-edge-01', resourceType: 'Servidor VPS', region: 'fra1' },
    { resource: 'vps-bastion', resourceType: 'Jump host', region: 'mad1' },
  ],
  Docker: [
    { resource: 'docker-registry', resourceType: 'Registro Docker', region: 'local' },
    { resource: 'api-container', resourceType: 'Contenedor', region: 'local' },
  ],
  Kubernetes: [
    { resource: 'k8s-cluster-prod', resourceType: 'Cluster', region: 'eu-central-1' },
    { resource: 'ingress-nginx', resourceType: 'Ingress', region: 'eu-central-1' },
  ],
  Azure: [
    { resource: 'vm-app-prod', resourceType: 'Virtual Machine', region: 'westeurope' },
    { resource: 'storage-backups', resourceType: 'Storage Account', region: 'westeurope' },
  ],
  GCP: [
    { resource: 'gke-main', resourceType: 'Cluster GKE', region: 'europe-west1' },
    { resource: 'cloud-sql-primary', resourceType: 'Cloud SQL', region: 'europe-west1' },
  ],
}

const buildScanTargets = (providers: Set<string>, categories: Set<string>): ScanTarget[] => {
  const targets: ScanTarget[] = []
  let idx = 0

  for (const provider of providers) {
    const catalog = PROVIDER_RESOURCE_CATALOG[provider] ?? [
      { resource: `${provider.toLowerCase()}-asset-01`, resourceType: 'Recurso', region: 'global' },
    ]
    for (const category of categories) {
      const entry = catalog[idx % catalog.length]
      targets.push({
        id: `target-${idx}`,
        provider,
        category,
        resource: entry.resource,
        resourceType: entry.resourceType,
        region: entry.region,
        check: CATEGORY_CHECKS[category as (typeof SCAN_CATEGORIES)[number]] ?? category,
        status: 'pending',
      })
      idx += 1
    }
  }

  if (targets.length > 0) targets[0].status = 'scanning'
  return targets.slice(0, 14)
}

const buildDemoFindings = (): SecurityRisk[] => {
  const stamp = Date.now().toString(36)
  const now = new Date().toISOString()
  return [
    {
      id: `risk-scan-${stamp}-1`,
      finding: 'Certificado TLS próximo a expirar',
      description: 'El certificado del endpoint público expira en menos de 14 días sin renovación automática configurada.',
      resource: 'api-gateway-prod',
      resourceType: 'Load Balancer',
      provider: 'AWS',
      region: 'eu-west-1',
      severity: 'high',
      status: 'warning',
      category: 'Cifrado',
      riskType: 'Caducidad de certificado',
      detectedAt: now,
      recommendation: 'Habilitar renovación automática con ACM o cert-manager',
      impact: 'Interrupción del servicio HTTPS y posible degradación de confianza',
      remediationSteps: ['Verificar cadena de renovación', 'Configurar alerta 30 días antes', 'Probar renovación en staging'],
      evidence: 'CN=api.cloudops.io\nExpires: 2026-06-18\nIssuer: Let\'s Encrypt\nAuto-renew: false',
      evidenceType: 'Certificado TLS',
      owner: 'platform-team',
      tags: ['tls', 'acm', 'scan'],
      relatedResources: ['route53-zone-prod'],
      history: [{ at: now, action: 'Detectado', user: 'security-scanner', note: 'Hallazgo registrado por escaneo manual' }],
      remediable: true,
      remediationAction: 'Renovar certificado y habilitar auto-renew',
    },
    {
      id: `risk-scan-${stamp}-2`,
      finding: 'Política S3 con listado público habilitado',
      description: 'Bucket de logs permite listado de objetos sin autenticación para usuarios anónimos.',
      resource: 's3-logs-archive',
      resourceType: 'S3 Bucket',
      provider: 'AWS',
      region: 'us-east-1',
      severity: 'medium',
      status: 'pending',
      category: 'Almacenamiento',
      riskType: 'Exposición de datos',
      detectedAt: now,
      recommendation: 'Deshabilitar ACL pública y aplicar Block Public Access',
      impact: 'Filtración de metadatos y nombres de archivos sensibles',
      remediationSteps: ['Activar Block Public Access', 'Revisar bucket policy', 'Auditar objetos expuestos'],
      evidence: 'Bucket: s3-logs-archive\nACL: public-read\nListObjects: ALLOW *',
      evidenceType: 'Política de bucket',
      owner: 'data-team',
      tags: ['s3', 'storage', 'scan'],
      relatedResources: ['cloudtrail-logs'],
      history: [{ at: now, action: 'Detectado', user: 'security-scanner', note: 'Hallazgo registrado por escaneo manual' }],
      remediable: true,
      remediationAction: 'Restringir acceso público del bucket',
    },
  ]
}

@Component({
  selector: 'app-security-scan-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatCheckboxModule, MatTabsModule],
  template: `
    <article class="sec-scan">
      <header class="sec-scan__head">
        <div class="sec-scan__icon-wrap" [class.sec-scan__icon-wrap--pulse]="phase() === 'running'">
          <mat-icon class="sec-scan__icon">radar</mat-icon>
        </div>
        <div>
          <h2>{{ phaseTitle() }}</h2>
          <p>{{ phaseSubtitle() }}</p>
        </div>
        @if (phase() !== 'running') {
          <button
            type="button"
            class="sec-scan__close"
            aria-label="Cerrar"
            [disabled]="phase() === 'running'"
            (click)="handleDismiss()"
          >
            <mat-icon>close</mat-icon>
          </button>
        }
      </header>

      <mat-dialog-content class="sec-scan__body">
        @switch (phase()) {
          @case ('config') {
            <section class="sec-scan__section">
              <h3>Alcance</h3>
              <div class="sec-scan__scope">
                @for (opt of scopeOptions; track opt.id) {
                  <label class="sec-scan__scope-opt" [class.sec-scan__scope-opt--on]="scope() === opt.id">
                    <input
                      type="radio"
                      name="scope"
                      [value]="opt.id"
                      [checked]="scope() === opt.id"
                      (change)="scope.set(opt.id)"
                    />
                    <mat-icon>{{ opt.icon }}</mat-icon>
                    <div>
                      <strong>{{ opt.label }}</strong>
                      <span>{{ opt.hint }}</span>
                    </div>
                  </label>
                }
              </div>
            </section>

            <section class="sec-scan__section">
              <h3>Proveedores <em>{{ selectedProviders().size }}/{{ providers.length }}</em></h3>
              <div class="sec-scan__chips">
                @for (p of providers; track p) {
                  <button
                    type="button"
                    class="sec-scan__chip"
                    [class.sec-scan__chip--on]="selectedProviders().has(p)"
                    (click)="toggleProvider(p)"
                  >
                    {{ p }}
                  </button>
                }
              </div>
            </section>

            <section class="sec-scan__section">
              <h3>Categorías <em>{{ selectedCategories().size }}/{{ categories.length }}</em></h3>
              <div class="sec-scan__chips">
                @for (c of categories; track c) {
                  <button
                    type="button"
                    class="sec-scan__chip"
                    [class.sec-scan__chip--on]="selectedCategories().has(c)"
                    (click)="toggleCategory(c)"
                  >
                    {{ c }}
                  </button>
                }
              </div>
            </section>

            <section class="sec-scan__section sec-scan__section--row">
              <div>
                <h3>Severidad mínima</h3>
                <div class="sec-scan__chips">
                  @for (s of severities; track s) {
                    <button
                      type="button"
                      class="sec-scan__chip sec-scan__chip--sev"
                      [attr.data-sev]="s"
                      [class.sec-scan__chip--on]="minSeverity() === s"
                      (click)="minSeverity.set(s)"
                    >
                      {{ severityLabel(s) }}
                    </button>
                  }
                </div>
              </div>
              <div class="sec-scan__schedule">
                <h3>Programación</h3>
                <label class="sec-scan__toggle">
                  <input type="checkbox" [checked]="scheduleLater()" (change)="scheduleLater.set($any($event.target).checked)" />
                  <span>Programar para más tarde</span>
                </label>
                @if (scheduleLater()) {
                  <p class="sec-scan__schedule-hint">Demo: se simulará la programación sin ejecutar ahora.</p>
                }
              </div>
            </section>

            <aside class="sec-scan__estimate">
              <mat-icon>info</mat-icon>
              <span>Se analizarán ~{{ estimatedResources() }} recursos en {{ estimatedDuration() }}.</span>
            </aside>
          }

          @case ('running') {
            <section class="sec-scan__scope-active">
              <h3>Qué se está escaneando</h3>
              <dl class="sec-scan__scope-dl">
                <div>
                  <dt>Alcance</dt>
                  <dd>{{ scopeLabel() }}</dd>
                </div>
                <div>
                  <dt>Proveedores</dt>
                  <dd>{{ activeProvidersLabel() }}</dd>
                </div>
                <div>
                  <dt>Categorías / controles</dt>
                  <dd>{{ activeCategoriesLabel() }}</dd>
                </div>
                <div>
                  <dt>Severidad mínima</dt>
                  <dd>{{ severityLabel(minSeverity()) }} o superior</dd>
                </div>
              </dl>
            </section>

            @if (currentTarget(); as target) {
              <section class="sec-scan__target-hero" aria-live="polite">
                <span class="sec-scan__target-hero-label">
                  <mat-icon>radar</mat-icon>
                  Escaneando ahora
                </span>
                <div class="sec-scan__target-card">
                  <div class="sec-scan__target-badges">
                    <span class="sec-scan__target-badge sec-scan__target-badge--provider">{{ target.provider }}</span>
                    <span class="sec-scan__target-badge sec-scan__target-badge--category">{{ target.category }}</span>
                  </div>
                  <strong class="mono sec-scan__target-name">{{ target.resource }}</strong>
                  <span class="sec-scan__target-meta">{{ target.resourceType }} · {{ target.region }}</span>
                  <p class="sec-scan__target-check">
                    <mat-icon>rule</mat-icon>
                    Comprobando: {{ target.check }}
                  </p>
                </div>
              </section>
            }

            <div class="sec-scan__progress-head">
              <span>Progreso del escaneo · {{ scanTargetsDone() }}/{{ scanTargets().length }} objetivos</span>
              <strong>{{ progress() }}%</strong>
            </div>
            <mat-progress-bar mode="determinate" [value]="progress()" class="sec-scan__bar" />

            <div class="sec-scan__live-stats">
              <article>
                <mat-icon>travel_explore</mat-icon>
                <div>
                  <strong>{{ liveResourcesScanned() }}</strong>
                  <span>Recursos analizados</span>
                </div>
              </article>
              <article>
                <mat-icon>gpp_maybe</mat-icon>
                <div>
                  <strong>{{ liveFindingsCount() }}</strong>
                  <span>Hallazgos parciales</span>
                </div>
              </article>
              <article>
                <mat-icon>schedule</mat-icon>
                <div>
                  <strong>{{ elapsedLabel() }}</strong>
                  <span>Tiempo transcurrido</span>
                </div>
              </article>
            </div>

            <section class="sec-scan__targets">
              <h3>Cola de objetivos</h3>
              <ul class="sec-scan__target-list">
                @for (t of scanTargets(); track t.id) {
                  <li
                    [class.sec-scan__target--scanning]="t.status === 'scanning'"
                    [class.sec-scan__target--done]="t.status === 'done'"
                  >
                    @if (t.status === 'done') {
                      <mat-icon class="sec-scan__target-icon sec-scan__target-icon--done">check_circle</mat-icon>
                    } @else if (t.status === 'scanning') {
                      <mat-icon class="sec-scan__target-icon sec-scan__target-icon--active">sync</mat-icon>
                    } @else {
                      <mat-icon class="sec-scan__target-icon">radio_button_unchecked</mat-icon>
                    }
                    <div class="sec-scan__target-info">
                      <strong class="mono">{{ t.resource }}</strong>
                      <span>{{ t.provider }} · {{ t.category }} · {{ t.resourceType }}</span>
                      <em>{{ t.check }}</em>
                    </div>
                    @if (t.status === 'scanning') {
                      <span class="sec-scan__target-status">En curso</span>
                    } @else if (t.status === 'done') {
                      <span class="sec-scan__target-status sec-scan__target-status--done">Listo</span>
                    }
                  </li>
                }
              </ul>
            </section>

            <section class="sec-scan__live-now">
              <div class="sec-scan__live-now-head">
                <mat-icon>{{ currentStep().icon }}</mat-icon>
                <div>
                  <strong>{{ currentStep().label }}</strong>
                  <p>{{ currentStep().detail }}</p>
                </div>
              </div>
            </section>

            <ol class="sec-scan__steps">
              @for (step of SCAN_STEPS; track step.label; let i = $index) {
                <li
                  [class.sec-scan__step--done]="stepIndex() > i"
                  [class.sec-scan__step--active]="stepIndex() === i"
                >
                  <mat-icon>{{ stepIndex() > i ? 'check_circle' : step.icon }}</mat-icon>
                  <span>{{ step.label }}</span>
                  @if (stepIndex() === i) { <em>En curso…</em> }
                  @if (stepIndex() > i) { <em>Completado</em> }
                </li>
              }
            </ol>

            <section class="sec-scan__feed" aria-live="polite" aria-label="Actividad del escaneo">
              <h3>Actividad en tiempo real</h3>
              <ul>
                @for (entry of activityLog(); track entry.id) {
                  <li [class.sec-scan__feed--finding]="entry.kind === 'finding'">
                    <time>{{ entry.time }}</time>
                    @if (entry.kind === 'finding') {
                      <mat-icon>warning</mat-icon>
                    } @else {
                      <mat-icon>chevron_right</mat-icon>
                    }
                    <span>{{ entry.message }}</span>
                  </li>
                }
              </ul>
            </section>
          }

          @case ('results') {
            @if (result(); as r) {
              @if (savedReport(); as report) {
                <aside class="sec-scan__saved">
                  <mat-icon>bookmark_added</mat-icon>
                  <span>Informe guardado · <em class="mono">{{ report.id }}</em></span>
                </aside>
              }

              <div class="sec-scan__results-grid">
                <div class="sec-scan__results-side">
                  <div class="sec-scan__score">
                    <article class="sec-scan__score-card">
                      <span>Puntuación anterior</span>
                      <strong>{{ r.previousScore }}/100</strong>
                    </article>
                    <mat-icon class="sec-scan__score-arrow">arrow_forward</mat-icon>
                    <article class="sec-scan__score-card sec-scan__score-card--new" [attr.data-delta]="r.scoreDelta < 0 ? 'down' : 'up'">
                      <span>Nueva puntuación</span>
                      <strong>{{ r.newScore }}/100</strong>
                      <em>{{ r.scoreDelta > 0 ? '+' : '' }}{{ r.scoreDelta }} pts</em>
                    </article>
                  </div>

                  <div class="sec-scan__stats">
                    <article>
                      <mat-icon>travel_explore</mat-icon>
                      <div>
                        <strong>{{ r.resourcesScanned }}</strong>
                        <span>Recursos analizados</span>
                      </div>
                    </article>
                    <article>
                      <mat-icon>gpp_maybe</mat-icon>
                      <div>
                        <strong>{{ r.totalFindings }}</strong>
                        <span>Hallazgos totales</span>
                      </div>
                    </article>
                    <article class="sec-scan__stats--highlight">
                      <mat-icon>new_releases</mat-icon>
                      <div>
                        <strong>{{ r.newFindings.length }}</strong>
                        <span>Nuevos hallazgos</span>
                      </div>
                    </article>
                  </div>

                  @if (r.newFindings.length) {
                    <section class="sec-scan__new">
                      <h3>Nuevos hallazgos detectados</h3>
                      <ul>
                        @for (f of r.newFindings; track f.id) {
                          <li>
                            <span class="sec-scan__sev" [attr.data-sev]="f.severity">{{ severityLabel(f.severity) }}</span>
                            <div>
                              <strong>{{ f.finding }}</strong>
                              <span>{{ f.resource }} · {{ f.provider }}</span>
                            </div>
                          </li>
                        }
                      </ul>
                    </section>
                  } @else {
                    <p class="sec-scan__no-new">No se detectaron hallazgos nuevos con la configuración seleccionada.</p>
                  }
                </div>

                <section class="sec-scan__report">
                  <div class="sec-scan__report-head">
                    <h3>Informe del escaneo</h3>
                    <div class="sec-scan__report-actions">
                      <button type="button" class="sec-scan__report-btn" (click)="handleOpenReportDialog()">
                        <mat-icon>open_in_full</mat-icon> Ver completo
                      </button>
                      <button type="button" class="sec-scan__report-btn" (click)="handleDownloadTxt()">
                        <mat-icon>description</mat-icon> TXT
                      </button>
                      <button type="button" class="sec-scan__report-btn" (click)="handleDownloadJson()">
                        <mat-icon>data_object</mat-icon> JSON
                      </button>
                    </div>
                  </div>
                  <mat-tab-group class="sec-scan__report-tabs" animationDuration="200ms">
                    <mat-tab label="Resumen">
                      <pre class="sec-scan__report-pre">{{ reportPreview() }}</pre>
                    </mat-tab>
                    <mat-tab label="Objetivos ({{ scanTargets().length }})">
                      <ul class="sec-scan__report-targets">
                        @for (t of scanTargets(); track t.id) {
                          <li>
                            <strong class="mono">{{ t.resource }}</strong>
                            <span>{{ t.provider }} · {{ t.category }}</span>
                            <em>{{ t.check }}</em>
                          </li>
                        }
                      </ul>
                    </mat-tab>
                    <mat-tab label="Actividad">
                      <ul class="sec-scan__report-activity">
                        @for (entry of activityLog(); track entry.id) {
                          <li [class.sec-scan__report-activity--finding]="entry.kind === 'finding'">
                            <time>{{ entry.time }}</time>
                            <span>{{ entry.message }}</span>
                          </li>
                        }
                      </ul>
                    </mat-tab>
                  </mat-tab-group>
                </section>
              </div>
            }
          }
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        @switch (phase()) {
          @case ('config') {
            <button mat-stroked-button type="button" (click)="handleDismiss()">Cancelar</button>
            <button
              mat-flat-button
              color="primary"
              type="button"
              class="sec-scan__cta"
              [disabled]="!canStart()"
              (click)="handleStart()"
            >
              <mat-icon>radar</mat-icon>
              Ejecutar escaneo
            </button>
          }
          @case ('running') {
            <button mat-stroked-button type="button" disabled>Cancelar</button>
          }
          @case ('results') {
            <button mat-stroked-button type="button" (click)="handleDownloadTxt()">
              <mat-icon>download</mat-icon> Descargar informe
            </button>
            <button mat-stroked-button type="button" (click)="handleOpenReportDialog()">
              <mat-icon>description</mat-icon> Ver informe
            </button>
            <button mat-flat-button color="primary" type="button" class="sec-scan__cta" (click)="handleClose()">
              Cerrar
            </button>
          }
        }
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-scan { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .sec-scan__head {
      display: flex; gap: 0.75rem; align-items: flex-start; padding-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0; flex-shrink: 0; position: relative;
    }
    .sec-scan__icon-wrap {
      display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 10px;
      background: ${SECURITY_ACCENT_LIGHT}; border: 1px solid ${SECURITY_ACCENT_BORDER}; flex-shrink: 0;
    }
    .sec-scan__icon-wrap--pulse { animation: sec-scan-pulse 1.6s ease-in-out infinite; }
    @keyframes sec-scan-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.25); }
      50% { box-shadow: 0 0 0 6px rgba(79, 70, 229, 0); }
    }
    .sec-scan__icon { font-size: 1.35rem; width: 1.35rem; height: 1.35rem; color: ${SECURITY_ACCENT}; }
    .sec-scan__head h2 { margin: 0; font-size: 1.05rem; font-weight: 700; line-height: 1.25; }
    .sec-scan__head p { margin: 0.2rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.45; max-width: 34rem; }
    .sec-scan__close {
      margin-left: auto; display: grid; place-items: center; width: 1.75rem; height: 1.75rem;
      border: none; border-radius: 8px; background: transparent; color: #94a3b8; cursor: pointer;
      &:hover { background: #f1f5f9; color: #475569; }
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .sec-scan__body { padding-top: 0.85rem !important; display: flex; flex-direction: column; gap: 0.85rem; }
    .sec-scan__section h3 {
      margin: 0 0 0.45rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; color: #94a3b8; display: flex; align-items: center; gap: 0.35rem;
      em { font-style: normal; font-weight: 600; color: ${SECURITY_ACCENT}; }
    }
    .sec-scan__section--row { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 0.85rem; }
    .sec-scan__scope { display: flex; flex-direction: column; gap: 0.35rem; }
    .sec-scan__scope-opt {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.65rem; border-radius: 9px;
      border: 1px solid #e2e8f0; cursor: pointer; transition: border-color 0.15s, background 0.15s;
      input { accent-color: ${SECURITY_ACCENT}; }
      mat-icon { color: #94a3b8; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      strong { display: block; font-size: 0.74rem; font-weight: 600; }
      span { display: block; font-size: 0.64rem; color: #64748b; margin-top: 0.1rem; }
      &:hover { border-color: ${SECURITY_ACCENT_BORDER}; }
    }
    .sec-scan__scope-opt--on {
      border-color: ${SECURITY_ACCENT}; background: ${SECURITY_ACCENT_LIGHT};
      mat-icon { color: ${SECURITY_ACCENT}; }
    }
    .sec-scan__chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .sec-scan__chip {
      padding: 0.3rem 0.6rem; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff;
      font-size: 0.68rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.15s;
      &:hover { border-color: ${SECURITY_ACCENT_BORDER}; }
    }
    .sec-scan__chip--on { border-color: ${SECURITY_ACCENT}; background: ${SECURITY_ACCENT_LIGHT}; color: ${SECURITY_ACCENT}; }
    .sec-scan__chip--sev[data-sev='critical'].sec-scan__chip--on { border-color: #dc2626; background: #fef2f2; color: #b91c1c; }
    .sec-scan__chip--sev[data-sev='high'].sec-scan__chip--on { border-color: #ea580c; background: #fff7ed; color: #c2410c; }
    .sec-scan__chip--sev[data-sev='medium'].sec-scan__chip--on { border-color: #d97706; background: #fffbeb; color: #b45309; }
    .sec-scan__schedule { display: flex; flex-direction: column; gap: 0.35rem; }
    .sec-scan__toggle {
      display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; color: #334155; cursor: pointer;
      input { accent-color: ${SECURITY_ACCENT}; }
    }
    .sec-scan__schedule-hint { margin: 0; font-size: 0.64rem; color: #94a3b8; }
    .sec-scan__estimate {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.65rem; border-radius: 8px;
      background: #f8fafc; border: 1px solid #e2e8f0; font-size: 0.68rem; color: #64748b;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: ${SECURITY_ACCENT}; }
    }
    .sec-scan__progress-head {
      display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #64748b;
      strong { color: ${SECURITY_ACCENT}; font-size: 0.82rem; }
    }
    .sec-scan__bar { --mdc-linear-progress-active-indicator-color: ${SECURITY_ACCENT}; border-radius: 999px; }
    .sec-scan__scope-active {
      padding: 0.6rem 0.7rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc;
      h3 {
        margin: 0 0 0.45rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.04em; color: #94a3b8;
      }
    }
    .sec-scan__scope-dl {
      margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem 0.75rem;
      div { min-width: 0; }
      dt { margin: 0; font-size: 0.58rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; }
      dd { margin: 0.12rem 0 0; font-size: 0.68rem; font-weight: 600; color: #334155; line-height: 1.4; }
    }
    .sec-scan__target-hero-label {
      display: inline-flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem;
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: ${SECURITY_ACCENT};
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    }
    .sec-scan__target-card {
      padding: 0.7rem 0.8rem; border-radius: 10px; border: 2px solid ${SECURITY_ACCENT};
      background: ${SECURITY_ACCENT_LIGHT};
    }
    .sec-scan__target-badges { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.4rem; }
    .sec-scan__target-badge {
      padding: 0.18rem 0.45rem; border-radius: 999px; font-size: 0.6rem; font-weight: 700;
    }
    .sec-scan__target-badge--provider { background: #312e81; color: #fff; }
    .sec-scan__target-badge--category { background: #fff; border: 1px solid ${SECURITY_ACCENT_BORDER}; color: #4338ca; }
    .sec-scan__target-name { display: block; font-size: 0.95rem; color: #1e1b4b; }
    .sec-scan__target-meta { display: block; margin-top: 0.15rem; font-size: 0.66rem; color: #4338ca; }
    .sec-scan__target-check {
      display: flex; align-items: flex-start; gap: 0.35rem; margin: 0.5rem 0 0; padding-top: 0.5rem;
      border-top: 1px solid ${SECURITY_ACCENT_BORDER}; font-size: 0.68rem; line-height: 1.45; color: #3730a3;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; flex-shrink: 0; margin-top: 0.05rem; }
    }
    .sec-scan__targets h3 {
      margin: 0 0 0.4rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; color: #94a3b8;
    }
    .sec-scan__target-list {
      list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem;
      max-height: 9rem; overflow-y: auto; scrollbar-width: thin;
    }
    .sec-scan__target-list li {
      display: grid; grid-template-columns: 1.1rem 1fr auto; gap: 0.45rem; align-items: start;
      padding: 0.42rem 0.5rem; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff;
    }
    .sec-scan__target--scanning {
      border-color: ${SECURITY_ACCENT} !important; background: ${SECURITY_ACCENT_LIGHT} !important;
    }
    .sec-scan__target--done { opacity: 0.72; background: #f0fdf4 !important; border-color: #bbf7d0 !important; }
    .sec-scan__target-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #cbd5e1; margin-top: 0.1rem; }
    .sec-scan__target-icon--active { color: ${SECURITY_ACCENT}; animation: sec-scan-spin 1.2s linear infinite; }
    .sec-scan__target-icon--done { color: #059669; }
    @keyframes sec-scan-spin { to { transform: rotate(360deg); } }
    .sec-scan__target-info {
      min-width: 0;
      strong { display: block; font-size: 0.7rem; color: #0f172a; }
      span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.08rem; }
      em { display: block; font-size: 0.58rem; font-style: normal; color: #94a3b8; margin-top: 0.12rem; line-height: 1.35; }
    }
    .sec-scan__target-status {
      flex-shrink: 0; font-size: 0.58rem; font-weight: 700; color: ${SECURITY_ACCENT}; padding-top: 0.1rem;
    }
    .sec-scan__target-status--done { color: #059669; }
    .sec-scan__live-stats {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem;
      article {
        display: flex; gap: 0.4rem; align-items: center; padding: 0.5rem 0.55rem; border-radius: 9px;
        border: 1px solid #e2e8f0; background: #fff;
        mat-icon { color: ${SECURITY_ACCENT}; font-size: 1rem; width: 1rem; height: 1rem; }
        strong { display: block; font-size: 0.88rem; line-height: 1.1; color: #0f172a; }
        span { display: block; font-size: 0.58rem; color: #64748b; margin-top: 0.08rem; }
      }
    }
    .sec-scan__live-now {
      padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${SECURITY_ACCENT_BORDER};
      background: ${SECURITY_ACCENT_LIGHT};
    }
    .sec-scan__live-now-head {
      display: flex; gap: 0.5rem; align-items: flex-start;
      mat-icon { color: ${SECURITY_ACCENT}; font-size: 1.15rem; width: 1.15rem; height: 1.15rem; margin-top: 0.1rem; }
      strong { display: block; font-size: 0.74rem; font-weight: 700; color: #312e81; }
      p { margin: 0.25rem 0 0; font-size: 0.68rem; line-height: 1.5; color: #4338ca; }
    }
    .sec-scan__live-resource {
      display: flex; align-items: center; gap: 0.35rem; margin-top: 0.5rem; padding-top: 0.5rem;
      border-top: 1px solid ${SECURITY_ACCENT_BORDER}; font-size: 0.66rem; color: #4338ca;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
      em { font-style: normal; font-weight: 600; }
    }
    .mono { font-family: ui-monospace, monospace; }
    .sec-scan__feed h3 {
      margin: 0 0 0.4rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; color: #94a3b8;
    }
    .sec-scan__feed ul {
      list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.28rem;
      max-height: 7.5rem; overflow-y: auto; scrollbar-width: thin;
    }
    .sec-scan__feed li {
      display: grid; grid-template-columns: 3.2rem 1rem 1fr; gap: 0.35rem; align-items: start;
      padding: 0.32rem 0.45rem; border-radius: 7px; background: #f8fafc; font-size: 0.66rem; color: #475569;
      time { font-size: 0.58rem; color: #94a3b8; font-variant-numeric: tabular-nums; padding-top: 0.05rem; }
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: #94a3b8; margin-top: 0.05rem; }
    }
    .sec-scan__feed--finding {
      background: #fff7ed !important; border: 1px solid #fed7aa;
      mat-icon { color: #ea580c !important; }
      span { color: #9a3412; font-weight: 600; }
    }
    .sec-scan__steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .sec-scan__steps li {
      display: flex; align-items: center; gap: 0.45rem; padding: 0.42rem 0.55rem; border-radius: 8px;
      font-size: 0.72rem; color: #94a3b8; background: #f8fafc; transition: background 0.2s, color 0.2s;
    }
    .sec-scan__steps li mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .sec-scan__steps li em { margin-left: auto; font-size: 0.62rem; font-style: normal; }
    .sec-scan__step--active { background: ${SECURITY_ACCENT_LIGHT} !important; color: ${SECURITY_ACCENT} !important; font-weight: 600; }
    .sec-scan__step--done { color: #059669 !important; }
    .sec-scan__step--done em { color: #64748b; }
    .sec-scan__score {
      display: grid; grid-template-columns: 1fr auto 1fr; gap: 0.5rem; align-items: center;
    }
    .sec-scan__score-card {
      padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc;
      span { display: block; font-size: 0.62rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.03em; }
      strong { display: block; margin-top: 0.2rem; font-size: 1.25rem; color: #0f172a; }
      em { display: block; margin-top: 0.15rem; font-size: 0.68rem; font-style: normal; font-weight: 600; }
    }
    .sec-scan__score-card--new[data-delta='down'] em { color: #dc2626; }
    .sec-scan__score-card--new[data-delta='up'] em { color: #059669; }
    .sec-scan__score-card--new { border-color: ${SECURITY_ACCENT_BORDER}; background: ${SECURITY_ACCENT_LIGHT}; }
    .sec-scan__score-arrow { color: #94a3b8; }
    .sec-scan__stats {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem;
      article {
        display: flex; gap: 0.4rem; align-items: center; padding: 0.55rem 0.6rem; border-radius: 9px;
        border: 1px solid #e2e8f0; background: #fff;
        mat-icon { color: ${SECURITY_ACCENT}; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
        strong { display: block; font-size: 0.95rem; line-height: 1.1; }
        span { display: block; font-size: 0.6rem; color: #64748b; margin-top: 0.1rem; }
      }
    }
    .sec-scan__stats--highlight { border-color: ${SECURITY_ACCENT_BORDER}; background: ${SECURITY_ACCENT_LIGHT}; }
    .sec-scan__new h3 { margin: 0 0 0.45rem; font-size: 0.68rem; font-weight: 700; color: #475569; }
    .sec-scan__new ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .sec-scan__new li {
      display: flex; gap: 0.45rem; align-items: flex-start; padding: 0.45rem 0.55rem; border-radius: 8px;
      border: 1px solid #e2e8f0; background: #fafafa;
      strong { display: block; font-size: 0.72rem; }
      span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.1rem; }
    }
    .sec-scan__sev {
      flex-shrink: 0; padding: 0.15rem 0.4rem; border-radius: 999px; font-size: 0.58rem; font-weight: 700;
      &[data-sev='critical'] { background: #fef2f2; color: #b91c1c; }
      &[data-sev='high'] { background: #fff7ed; color: #c2410c; }
      &[data-sev='medium'] { background: #fffbeb; color: #b45309; }
      &[data-sev='low'] { background: #f0fdf4; color: #15803d; }
      &[data-sev='info'] { background: #f8fafc; color: #64748b; }
    }
    .sec-scan__no-new {
      margin: 0; padding: 0.65rem; border-radius: 8px; background: #f0fdf4; border: 1px solid #bbf7d0;
      font-size: 0.72rem; color: #166534; text-align: center;
    }
    .sec-scan__saved {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.65rem; border-radius: 8px;
      background: #ecfdf5; border: 1px solid #bbf7d0; font-size: 0.68rem; color: #166534;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      em { font-style: normal; font-weight: 600; }
    }
    .sec-scan__results-grid {
      display: grid; grid-template-columns: minmax(240px, 0.9fr) minmax(320px, 1.4fr); gap: 0.85rem; align-items: start;
    }
    .sec-scan__results-side { display: flex; flex-direction: column; gap: 0.75rem; }
    .sec-scan__report {
      border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 0.65rem 0.75rem; min-height: 0;
    }
    .sec-scan__report-head {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.45rem;
      h3 { margin: 0; font-size: 0.68rem; font-weight: 700; color: #475569; }
    }
    .sec-scan__report-actions { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .sec-scan__report-btn {
      display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.25rem 0.45rem; border-radius: 7px;
      border: 1px solid #e2e8f0; background: #f8fafc; font: inherit; font-size: 0.6rem; font-weight: 600;
      color: #475569; cursor: pointer;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
      &:hover { border-color: ${SECURITY_ACCENT_BORDER}; color: ${SECURITY_ACCENT}; background: ${SECURITY_ACCENT_LIGHT}; }
    }
    .sec-scan__report-pre {
      margin: 0.55rem 0 0; padding: 0.75rem 0.85rem; border-radius: 8px; background: #0f172a; color: #e2e8f0;
      font-family: ui-monospace, monospace; font-size: 0.65rem; line-height: 1.55; white-space: pre-wrap;
      word-break: break-word; max-height: 16rem; overflow: auto; scrollbar-width: thin;
    }
    .sec-scan__report-targets, .sec-scan__report-activity {
      list-style: none; margin: 0.55rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem;
      max-height: 16rem; overflow-y: auto; scrollbar-width: thin;
    }
    .sec-scan__report-targets li, .sec-scan__report-activity li {
      padding: 0.4rem 0.5rem; border-radius: 7px; border: 1px solid #e2e8f0; background: #f8fafc;
    }
    .sec-scan__report-targets strong { display: block; font-size: 0.68rem; }
    .sec-scan__report-targets span { display: block; font-size: 0.6rem; color: #64748b; margin-top: 0.06rem; }
    .sec-scan__report-targets em { display: block; font-size: 0.58rem; font-style: normal; color: #94a3b8; margin-top: 0.1rem; }
    .sec-scan__report-activity li { display: grid; grid-template-columns: 3rem 1fr; gap: 0.35rem; font-size: 0.64rem; color: #475569; }
    .sec-scan__report-activity time { color: #94a3b8; font-size: 0.58rem; }
    .sec-scan__report-activity--finding { background: #fff7ed; border-color: #fed7aa; span { color: #9a3412; font-weight: 600; } }
    .sec-scan__cta mat-icon { margin-right: 0.25rem; font-size: 1rem; width: 1rem; height: 1rem; }
    @media (max-width: 760px) {
      .sec-scan__results-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .sec-scan__section--row { grid-template-columns: 1fr; }
      .sec-scan__scope-dl { grid-template-columns: 1fr; }
      .sec-scan__stats { grid-template-columns: 1fr; }
      .sec-scan__live-stats { grid-template-columns: 1fr; }
      .sec-scan__score { grid-template-columns: 1fr; }
      .sec-scan__score-arrow { display: none; }
    }
  `,
})
export class SecurityScanDialogComponent {
  readonly SCAN_STEPS = SCAN_STEPS
  readonly providers = [...SECURITY_PROVIDERS]
  readonly categories = [...SCAN_CATEGORIES]
  readonly severities = SECURITY_SEVERITY_OPTIONS
  readonly severityLabel = securitySeverityLabel
  readonly scopeOptions = [
    { id: 'full' as ScanScope, label: 'Inventario completo', hint: 'Todos los recursos conectados', icon: 'hub' },
    { id: 'critical' as ScanScope, label: 'Críticos y altos', hint: 'Solo hallazgos de alta prioridad', icon: 'priority_high' },
    { id: 'targeted' as ScanScope, label: 'Recursos filtrados', hint: 'Según proveedores y categorías', icon: 'filter_alt' },
  ]

  private readonly dialogRef = inject(MatDialogRef<SecurityScanDialogComponent>)
  private readonly dialog = inject(MatDialog)
  private readonly svc = inject(SecurityCenterService)
  private readonly toast = inject(ToastService)

  readonly phase = signal<ScanPhase>('config')
  readonly scope = signal<ScanScope>('full')
  readonly selectedProviders = signal(new Set<string>([...SECURITY_PROVIDERS]))
  readonly selectedCategories = signal(new Set<string>([...SCAN_CATEGORIES]))
  readonly minSeverity = signal<SecuritySeverity>('medium')
  readonly scheduleLater = signal(false)

  readonly stepIndex = signal(0)
  readonly progress = signal(0)
  readonly result = signal<ScanCompletionResult | null>(null)
  readonly savedReport = signal<SecurityScanReport | null>(null)
  readonly liveResourcesScanned = signal(0)
  readonly liveFindingsCount = signal(0)
  readonly elapsedSeconds = signal(0)
  readonly scanTargets = signal<ScanTarget[]>([])
  readonly activityLog = signal<{ id: string; time: string; message: string; kind: 'info' | 'finding' }[]>([])

  private timer: ReturnType<typeof setInterval> | null = null
  private tickCount = 0
  private targetIndex = 0

  readonly currentStep = computed(() => SCAN_STEPS[this.stepIndex()] ?? SCAN_STEPS[0])

  readonly currentTarget = computed(() => {
    const targets = this.scanTargets()
    return targets.find((t) => t.status === 'scanning') ?? targets[this.targetIndex] ?? null
  })

  readonly scanTargetsDone = computed(() => this.scanTargets().filter((t) => t.status === 'done').length)

  readonly activeProvidersLabel = computed(() => [...this.selectedProviders()].join(' · ') || '—')

  readonly activeCategoriesLabel = computed(() => [...this.selectedCategories()].join(' · ') || '—')

  readonly scopeLabel = computed(() => {
    const opt = this.scopeOptions.find((o) => o.id === this.scope())
    return opt?.label ?? 'Inventario completo'
  })

  readonly elapsedLabel = computed(() => {
    const s = this.elapsedSeconds()
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  })

  readonly reportPreview = computed(() => {
    const report = this.savedReport()
    if (!report) return ''
    return buildScanReportText(report)
  })

  readonly canStart = computed(
    () => this.selectedProviders().size > 0 && this.selectedCategories().size > 0,
  )

  readonly estimatedResources = computed(() => {
    const base = this.scope() === 'full' ? 142 : this.scope() === 'critical' ? 48 : 76
    const providerFactor = this.selectedProviders().size / this.providers.length
    const categoryFactor = this.selectedCategories().size / this.categories.length
    return Math.max(12, Math.round(base * providerFactor * categoryFactor))
  })

  readonly estimatedDuration = computed(() => {
    const secs = Math.max(4, Math.round(this.estimatedResources() / 18))
    return secs < 60 ? `~${secs} s` : `~${Math.ceil(secs / 60)} min`
  })

  readonly phaseTitle = computed(() => {
    if (this.phase() === 'running') return 'Escaneo en curso'
    if (this.phase() === 'results') return 'Escaneo completado'
    return 'Ejecutar escaneo de seguridad'
  })

  readonly phaseSubtitle = computed(() => {
    if (this.phase() === 'running') {
      const target = this.currentTarget()
      if (target) {
        return `Escaneando ${target.resource} en ${target.provider} — ${target.category}: ${target.check}`
      }
      return this.currentStep().detail
    }
    if (this.phase() === 'results') {
      const report = this.savedReport()
      return report
        ? `Informe ${report.id} guardado. Puedes revisarlo, descargarlo o consultarlo más tarde.`
        : 'Resumen de hallazgos y cambio en la puntuación de riesgo.'
    }
    return 'Configura el alcance, proveedores y filtros antes de iniciar.'
  })

  toggleProvider = (provider: string): void => {
    this.selectedProviders.update((set) => {
      const next = new Set(set)
      if (next.has(provider)) next.delete(provider)
      else next.add(provider)
      return next
    })
  }

  toggleCategory = (category: string): void => {
    this.selectedCategories.update((set) => {
      const next = new Set(set)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  handleStart = (): void => {
    if (!this.canStart()) return

    if (this.scheduleLater()) {
      this.toast.info('Escaneo programado — se ejecutará en la próxima ventana de mantenimiento (demo)')
      this.dialogRef.close(false)
      return
    }

    this.svc.scanning.set(true)
    this.phase.set('running')
    this.stepIndex.set(0)
    this.progress.set(0)
    this.liveResourcesScanned.set(0)
    this.liveFindingsCount.set(0)
    this.elapsedSeconds.set(0)
    this.tickCount = 0
    this.targetIndex = 0

    const targets = buildScanTargets(this.selectedProviders(), this.selectedCategories())
    this.scanTargets.set(targets)
    this.activityLog.set([])

    const providerList = this.activeProvidersLabel()
    const categoryList = this.activeCategoriesLabel()
    this.appendActivity(`Inicio: escaneo de ${providerList}`, 'info')
    this.appendActivity(`Controles activos: ${categoryList}`, 'info')

    if (targets[0]) {
      this.appendActivity(this.formatTargetScanMessage(targets[0]), 'info')
    }

    let step = 0
    this.timer = setInterval(() => {
      this.tickCount += 1
      this.elapsedSeconds.set(Math.round((this.tickCount * 650) / 1000))

      const targetResources = this.estimatedResources()
      const resourceProgress = Math.min(targetResources, Math.round((this.tickCount / (SCAN_STEPS.length * 2)) * targetResources))
      this.liveResourcesScanned.set(resourceProgress)

      if (this.tickCount % 2 === 1 && this.targetIndex < targets.length - 1) {
        this.advanceScanTarget()
      }

      if (this.tickCount % 2 === 0) {
        step += 1
        this.stepIndex.set(Math.min(step, SCAN_STEPS.length - 1))
        this.progress.set(Math.round((step / (SCAN_STEPS.length - 1)) * 100))

        if (step >= 2 && this.liveFindingsCount() === 0) {
          this.liveFindingsCount.set(1)
          const t = targets.find((x) => x.resource === 'api-gateway-prod') ?? targets[0]
          this.appendActivity(
            `Hallazgo en ${t?.resource ?? 'api-gateway-prod'} (${t?.provider ?? 'AWS'} · ${t?.category ?? 'Cifrado'}): certificado TLS próximo a expirar`,
            'finding',
          )
        }
        if (step >= 4 && this.liveFindingsCount() < 2) {
          this.liveFindingsCount.set(2)
          const t = targets.find((x) => x.resource === 's3-logs-archive') ?? targets[1]
          this.appendActivity(
            `Hallazgo en ${t?.resource ?? 's3-logs-archive'} (${t?.provider ?? 'AWS'} · ${t?.category ?? 'Almacenamiento'}): listado público habilitado`,
            'finding',
          )
        }
      }

      if (step >= SCAN_STEPS.length - 1 && this.tickCount >= (SCAN_STEPS.length - 1) * 2 + 1) {
        if (this.timer) clearInterval(this.timer)
        this.markAllTargetsDone()
        this.liveResourcesScanned.set(targetResources)
        this.appendActivity(`Escaneo finalizado en ${providerList}`, 'info')
        this.finishScan()
      }
    }, 650)
  }

  private formatTargetScanMessage = (target: ScanTarget): string =>
    `Escaneando ${target.resource} (${target.provider} · ${target.category}): ${target.check}`

  private advanceScanTarget = (): void => {
    this.scanTargets.update((rows) => {
      const next = rows.map((t) => ({ ...t }))
      if (next[this.targetIndex]) next[this.targetIndex].status = 'done'
      this.targetIndex += 1
      if (next[this.targetIndex]) {
        next[this.targetIndex].status = 'scanning'
        this.appendActivity(this.formatTargetScanMessage(next[this.targetIndex]), 'info')
      }
      return next
    })
  }

  private markAllTargetsDone = (): void => {
    this.scanTargets.update((rows) => rows.map((t) => ({ ...t, status: 'done' as ScanTargetStatus })))
  }

  private appendActivity = (message: string, kind: 'info' | 'finding'): void => {
    const now = new Date()
    const time = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    this.activityLog.update((rows) => [
      { id: `${Date.now()}-${rows.length}`, time, message, kind },
      ...rows,
    ].slice(0, 12))
  }

  private finishScan = (): void => {
    const previousScore = this.parseScore(this.svc.kpis().find((k) => k.label === 'Puntuación de riesgo')?.value)
    const newFindings = this.buildFilteredFindings()

    this.svc.completeScan({ newFindings })

    const newScore = this.parseScore(this.svc.kpis().find((k) => k.label === 'Puntuación de riesgo')?.value)
    const report: SecurityScanReport = {
      id: `scan-${Date.now().toString(36)}`,
      completedAt: new Date().toISOString(),
      scope: this.scopeLabel(),
      providers: [...this.selectedProviders()],
      categories: [...this.selectedCategories()],
      minSeverity: this.minSeverity(),
      durationSeconds: this.elapsedSeconds(),
      previousScore,
      newScore,
      scoreDelta: newScore - previousScore,
      resourcesScanned: this.estimatedResources(),
      totalFindings: this.svc.risks().length,
      newFindings,
      targets: this.scanTargets().map(({ provider, category, resource, resourceType, region, check }) => ({
        provider,
        category,
        resource,
        resourceType,
        region,
        check,
      })),
      activityLog: this.activityLog().map(({ time, message, kind }) => ({ time, message, kind })),
    }

    this.svc.saveScanReport(report)

    const completion: ScanCompletionResult = {
      previousScore,
      newScore,
      scoreDelta: newScore - previousScore,
      resourcesScanned: this.estimatedResources(),
      totalFindings: this.svc.risks().length,
      newFindings,
      report,
    }

    this.savedReport.set(report)
    this.result.set(completion)
    this.phase.set('results')
    this.toast.success(
      newFindings.length
        ? `Escaneo completado — informe guardado con ${newFindings.length} nuevos hallazgos`
        : 'Escaneo completado — informe guardado sin nuevos hallazgos',
    )
  }

  private buildFilteredFindings = (): SecurityRisk[] => {
    if (this.scope() === 'critical') {
      return buildDemoFindings().filter((f) => f.severity === 'critical' || f.severity === 'high').slice(0, 1)
    }

    const minIdx = SECURITY_SEVERITY_OPTIONS.indexOf(this.minSeverity())
    const demo = buildDemoFindings().filter((f) => {
      const sevOk = SECURITY_SEVERITY_OPTIONS.indexOf(f.severity) <= minIdx
      const providerOk = this.selectedProviders().has(f.provider)
      const categoryOk = this.selectedCategories().has(f.category)
      return sevOk && providerOk && categoryOk
    })

    return this.scope() === 'targeted' ? demo.slice(0, 1) : demo
  }

  private parseScore = (value: string | number | undefined): number => {
    if (typeof value === 'number') return value
    const match = String(value ?? '72').match(/(\d+)/)
    return match ? Number(match[1]) : 72
  }

  handleDismiss = (): void => {
    if (this.timer) clearInterval(this.timer)
    if (this.phase() === 'running') this.svc.scanning.set(false)
    this.dialogRef.close(false)
  }

  handleClose = (): void => {
    this.dialogRef.close(true)
  }

  handleDownloadTxt = (): void => {
    const report = this.savedReport()
    if (!report) return
    downloadBlob(buildScanReportText(report), scanReportFilename(report, 'txt'), 'text/plain')
    this.toast.success('Informe descargado (TXT)')
  }

  handleDownloadJson = (): void => {
    const report = this.savedReport()
    if (!report) return
    downloadBlob(JSON.stringify(report, null, 2), scanReportFilename(report, 'json'), 'application/json')
    this.toast.success('Informe descargado (JSON)')
  }

  handleOpenReportDialog = (): void => {
    const report = this.savedReport()
    if (!report) return
    this.dialog.open(SecurityScanReportDialogComponent, {
      width: 'min(920px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'sec-scan-report-dialog-panel',
      data: { report },
    })
  }
}
