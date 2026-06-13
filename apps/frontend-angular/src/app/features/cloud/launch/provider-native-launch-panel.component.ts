import { NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { FormGroup, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'
import type { CloudSlug } from '../cloud-provider.data'
import type { AwsImageSectionId } from '../cloud-ami-sections.util'
import type { LaunchPreflightCheck } from '../../../core/services/cloud-accounts.service'

type RegionRow = { id: string; name: string }
type NetworkRow = { id: string; name: string; cidr?: string; vpcId?: string; availabilityZone?: string }
type SecurityRow = { id: string; name: string; vpcId?: string }
type KeyPairRow = { id: string; name: string }
type ImageRow = {
  id: string
  name: string
  os?: string
  architecture?: string
  status?: string
  category?: string
}
type TypeRow = { id: string; name: string; vcpus?: number; memoryGb?: number; pricePerHour?: number; pricePerMinute?: number }
type ReviewRow = { label: string; value: string; mono?: boolean }
type CostSummary = { hourly: string; monthly: string; hint: string }

@Component({
  selector: 'app-provider-native-launch-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    NgTemplateOutlet,
    BrandLogoComponent,
  ],
  template: `
    <section class="native" [class.native--aws]="slug() === 'aws'" [class.native--azure]="slug() === 'azure'" [class.native--gcp]="slug() === 'gcp'" [class.native--clouding]="slug() === 'clouding'">
      <header class="native__topbar">
        <div class="native__brand">
          <app-brand-logo [logo]="logo()" size="lg" [glow]="true" />
          <div>
            <p>{{ consoleEyebrow() }}</p>
            <h3>{{ title() }}</h3>
            <span>{{ subtitle() }}</span>
          </div>
        </div>
        <div class="native__top-actions">
          <button mat-stroked-button type="button" (click)="previewCode.emit()">
            <mat-icon>code</mat-icon>
            {{ previewLabel() }}
          </button>
          <button mat-flat-button type="button" class="native__primary" [disabled]="primaryDisabled()" (click)="primaryAction.emit()">
            <mat-icon>rocket_launch</mat-icon>
            {{ primaryLabel() }}
          </button>
        </div>
      </header>

      <div class="native__body">
        <div class="native__main" [formGroup]="form()">
          @if (loading()) {
            <div class="native__skeleton" aria-label="Cargando catalogos">
              <span></span><span></span><span></span>
            </div>
          }

          @if (slug() === 'aws') {
            <details class="native__section" open>
              <summary><span>Name and tags</span><small>Nombre, tags recomendados y trazabilidad.</small></summary>
              <div class="native__grid">
                <mat-form-field appearance="outline" class="native__span-2">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="name" placeholder="web-prod-01" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="native__span-2">
                  <mat-label>Tags</mat-label>
                  <input matInput formControlName="tags" placeholder="created_by=ai-infra-studio,environment=test,auto_delete=true" />
                  <mat-hint>Add additional tags separated by commas</mat-hint>
                </mat-form-field>
              </div>
              <div class="native__tag-table">
                @for (tag of recommendedTags(); track tag.key) {
                  <span>{{ tag.key }}</span><code>{{ tag.value }}</code>
                }
              </div>
            </details>

            <details class="native__section" open>
              <summary><span>Application and OS Images (AMI)</span><small>Quick Start, My AMIs y catálogo validado por región.</small></summary>
              <mat-form-field appearance="outline" class="native__search">
                <mat-label>Search AMIs</mat-label>
                <input matInput [value]="imageSearch()" (input)="imageSearchChange.emit($any($event.target).value)" placeholder="Ubuntu, Amazon Linux, Windows..." />
                <mat-icon matPrefix>search</mat-icon>
              </mat-form-field>
              <nav class="native__tabs" aria-label="AMI sections">
                @for (sec of awsSections(); track sec.id) {
                  <button type="button" [class.native__tab--on]="imageSection() === sec.id" (click)="imageSectionChange.emit(sec.id)">
                    {{ sec.label }}
                  </button>
                }
              </nav>
              <div class="native__image-grid">
                @for (img of images(); track img.id) {
                  <button type="button" class="native__image" [class.native__image--on]="form().value.imageId === img.id" (click)="imageSelected.emit(img)">
                    <span class="native__os">{{ osShort(img) }}</span>
                    <strong>{{ img.name }}</strong>
                    <small>{{ img.architecture || 'x86_64' }} · {{ img.status || 'available' }}</small>
                    <code>{{ img.id }}</code>
                    <em>Verified provider</em>
                  </button>
                } @empty {
                  <p class="native__empty">No hay AMIs disponibles. Cambia de región o refresca catálogos.</p>
                }
              </div>
            </details>

            <details class="native__section" open>
              <summary><span>Instance type</span><small>Familia, vCPU, RAM y coste estimado.</small></summary>
              <mat-form-field appearance="outline" class="native__search">
                <mat-label>Search instance types</mat-label>
                <input matInput [value]="typeSearch()" (input)="typeSearchChange.emit($any($event.target).value)" />
                <mat-icon matPrefix>search</mat-icon>
              </mat-form-field>
              <div class="native__type-grid">
                @for (t of types(); track t.id) {
                  <button type="button" class="native__type" [class.native__type--on]="form().value.instanceType === t.id" (click)="typeSelected.emit(t.id)">
                    <strong>{{ t.name }}</strong>
                    <span>{{ family(t.id) }} · {{ t.vcpus || '?' }} vCPU · {{ t.memoryGb || '?' }} GB</span>
                    <small>{{ price(t) }}</small>
                  </button>
                }
              </div>
              <button mat-button type="button" (click)="previewCode.emit()"><mat-icon>compare_arrows</mat-icon>Compare instance types</button>
            </details>

            <details class="native__section" open>
              <summary><span>Key pair / login</span><small>Clave SSH requerida para acceso seguro.</small></summary>
              <div class="native__grid">
                <mat-form-field appearance="outline">
                  <mat-label>Key pair</mat-label>
                  <mat-select formControlName="keyPair">
                    @for (kp of keyPairs(); track kp.id) {
                      <mat-option [value]="kp.name">{{ kp.name }}</mat-option>
                    }
                  </mat-select>
                  <mat-hint>Required before launch</mat-hint>
                </mat-form-field>
                <button mat-stroked-button type="button" class="native__inline-btn" (click)="createDependency.emit('key')">
                  <mat-icon>vpn_key</mat-icon>Create new key pair
                </button>
              </div>
            </details>

            <ng-container *ngTemplateOutlet="networkSettings; context: { title: 'Network settings', network: 'VPC', subnet: 'Subnet', security: 'Security group' }" />
            <ng-container *ngTemplateOutlet="storageSettings; context: { title: 'Configure storage', disk: 'Root volume' }" />
            <ng-container *ngTemplateOutlet="advancedSettings; context: { title: 'Advanced details' }" />
          } @else if (slug() === 'azure') {
            <ng-container *ngTemplateOutlet="azurePanel" />
          } @else if (slug() === 'gcp') {
            <ng-container *ngTemplateOutlet="gcpPanel" />
          } @else {
            <ng-container *ngTemplateOutlet="cloudingPanel" />
          }

          @if (blocker()) {
            <aside class="native__missing" role="status">
              <mat-icon>info</mat-icon>
              <div>
                <strong>Falta completar una configuración.</strong>
                <p>{{ blocker() }}</p>
                <div>
                  <button mat-stroked-button type="button" (click)="createDependency.emit('subnet')">Crear recurso faltante</button>
                  <button mat-stroked-button type="button" (click)="runPreflight.emit()">Reintentar validación</button>
                </div>
              </div>
            </aside>
          }
        </div>

        <aside class="native__summary" aria-label="Summary">
          <h4>{{ summaryTitle() }}</h4>
          <dl>
            @for (row of summaryRows(); track row.label) {
              <div>
                <dt>{{ row.label }}</dt>
                <dd [class.native__mono]="row.mono">{{ row.value }}</dd>
              </div>
            }
          </dl>
          <div class="native__cost">
            <span>Estimated cost</span>
            <strong>{{ cost().monthly || cost().hourly || '—' }}</strong>
            <small>{{ cost().hint }}</small>
          </div>
          @if (checks().length) {
            <ul class="native__checks">
              @for (c of checks(); track c.id) {
                <li [class.native__check--error]="c.level === 'error'" [class.native__check--warn]="c.level === 'warning'">
                  <mat-icon>{{ c.level === 'ok' ? 'check_circle' : c.level === 'warning' ? 'warning' : 'error' }}</mat-icon>
                  {{ c.message }}
                </li>
              }
            </ul>
          }
          <button mat-flat-button type="button" class="native__primary native__summary-btn" [disabled]="primaryDisabled()" (click)="primaryAction.emit()">
            <mat-icon>rocket_launch</mat-icon>
            {{ primaryLabel() }}
          </button>
        </aside>
      </div>
    </section>

    <ng-template #networkSettings let-title="title" let-network="network" let-subnet="subnet" let-security="security">
      <details class="native__section" open>
        <summary><span>{{ title }}</span><small>Red, subred, IP pública y reglas de entrada.</small></summary>
        <div class="native__grid">
          <mat-form-field appearance="outline">
            <mat-label>Region</mat-label>
            <mat-select formControlName="region" (selectionChange)="regionChange.emit()">
              @for (r of regions(); track r.id) {
                <mat-option [value]="r.id">{{ r.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ slug() === 'gcp' ? 'Zone' : 'Availability zone' }}</mat-label>
            <mat-select formControlName="availabilityZone" (selectionChange)="azChange.emit()">
              @for (z of zones(); track z) {
                <mat-option [value]="z">{{ z }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ network }}</mat-label>
            <mat-select formControlName="vpcId" (selectionChange)="vpcChange.emit()">
              @for (v of vpcs(); track v.id) {
                <mat-option [value]="v.id">{{ v.name }} {{ v.cidr ? '(' + v.cidr + ')' : '' }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ subnet }}</mat-label>
            <mat-select formControlName="subnetId">
              @for (s of subnets(); track s.id) {
                <mat-option [value]="s.id">{{ s.name }} {{ s.cidr ? '(' + s.cidr + ')' : '' }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ security }}</mat-label>
            <mat-select formControlName="securityGroupId">
              @for (sg of securityGroups(); track sg.id) {
                <mat-option [value]="sg.id">{{ sg.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-slide-toggle formControlName="publicIp" color="primary">Auto-assign public IP</mat-slide-toggle>
        </div>
        <div class="native__dependency-actions">
          <button mat-stroked-button type="button" (click)="createDependency.emit('network')"><mat-icon>hub</mat-icon>Create {{ network }}</button>
          <button mat-stroked-button type="button" (click)="createDependency.emit('subnet')"><mat-icon>lan</mat-icon>Create {{ subnet }}</button>
          <button mat-stroked-button type="button" (click)="createDependency.emit('security')"><mat-icon>shield</mat-icon>Create {{ security }}</button>
        </div>
      </details>
    </ng-template>

    <ng-template #storageSettings let-title="title" let-disk="disk">
      <details class="native__section" open>
        <summary><span>{{ title }}</span><small>{{ disk }}, tipo, IOPS, throughput y cifrado.</small></summary>
        <div class="native__grid">
          <mat-form-field appearance="outline"><mat-label>Size (GB)</mat-label><input matInput type="number" formControlName="diskGb" min="8" /></mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Disk / volume type</mat-label>
            <mat-select formControlName="diskType">
              @for (vt of volumeTypes(); track vt.id) {
                <mat-option [value]="vt.id">{{ vt.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>IOPS</mat-label><input matInput type="number" formControlName="iops" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Throughput MB/s</mat-label><input matInput type="number" formControlName="throughput" /></mat-form-field>
          <mat-slide-toggle formControlName="encrypted" color="primary">Encrypted</mat-slide-toggle>
        </div>
      </details>
    </ng-template>

    <ng-template #advancedSettings let-title="title">
      <details class="native__section">
        <summary><span>{{ title }}</span><small>IAM, metadata, monitoring, protección y scripts.</small></summary>
        <div class="native__grid">
          <mat-form-field appearance="outline"><mat-label>IAM role / service account</mat-label><input matInput formControlName="iamRole" placeholder="optional" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Shutdown behavior</mat-label><mat-select formControlName="shutdownBehavior"><mat-option value="stop">Stop</mat-option><mat-option value="terminate">Terminate</mat-option></mat-select></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Metadata options</mat-label><input matInput formControlName="metadataOptions" placeholder="IMDSv2 required" /></mat-form-field>
          <mat-slide-toggle formControlName="monitoring" color="primary">Monitoring enabled</mat-slide-toggle>
          <mat-slide-toggle formControlName="terminationProtection" color="primary">Termination protection</mat-slide-toggle>
          <mat-form-field appearance="outline" class="native__span-2"><mat-label>User data / startup script</mat-label><textarea matInput rows="5" formControlName="userData"></textarea></mat-form-field>
        </div>
      </details>
    </ng-template>

    <ng-template #azurePanel>
      @for (section of azureSections(); track section) {
        <details class="native__section" [open]="section === 'Basics' || section === 'Networking' || section === 'Review + create'">
          <summary><span>{{ section }}</span><small>{{ azureHint(section) }}</small></summary>
          @if (section === 'Basics') {
            <div class="native__grid">
              <mat-form-field appearance="outline"><mat-label>Subscription</mat-label><input matInput [value]="accountName()" readonly /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Resource group</mat-label><input matInput formControlName="resourceGroup" placeholder="rg-ai-infra-studio" /></mat-form-field>
              <button mat-stroked-button type="button" class="native__inline-btn" (click)="createDependency.emit('resourceGroup')"><mat-icon>create_new_folder</mat-icon>Create resource group</button>
              <mat-form-field appearance="outline"><mat-label>Virtual machine name</mat-label><input matInput formControlName="name" placeholder="az-vm-prod-01" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Region</mat-label><mat-select formControlName="region" (selectionChange)="regionChange.emit()">@for (r of regions(); track r.id) { <mat-option [value]="r.id">{{ r.name }}</mat-option> }</mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Availability options</mat-label><mat-select formControlName="availabilityOption"><mat-option value="zone">Availability zone</mat-option><mat-option value="set">Availability set</mat-option><mat-option value="none">No infrastructure redundancy required</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Security type</mat-label><mat-select formControlName="securityType"><mat-option value="standard">Standard</mat-option><mat-option value="trusted">Trusted launch</mat-option><mat-option value="confidential">Confidential VM</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Image</mat-label><mat-select formControlName="imageId">@for (img of images(); track img.id) { <mat-option [value]="img.id">{{ img.name }}</mat-option> }</mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Size</mat-label><mat-select formControlName="instanceType">@for (t of types(); track t.id) { <mat-option [value]="t.id">{{ t.name }} · {{ t.vcpus || '?' }} vCPU · {{ t.memoryGb || '?' }} GB</mat-option> }</mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Authentication type</mat-label><mat-select formControlName="authType"><mat-option value="ssh">SSH public key</mat-option><mat-option value="password">Password</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Username</mat-label><input matInput formControlName="username" placeholder="azureuser" /></mat-form-field>
            </div>
          } @else if (section === 'Disks') {
            <ng-container *ngTemplateOutlet="storageSettings; context: { title: 'OS disk', disk: 'OS disk' }" />
          } @else if (section === 'Networking') {
            <ng-container *ngTemplateOutlet="networkSettings; context: { title: 'Networking', network: 'Virtual network', subnet: 'Subnet', security: 'NSG' }" />
            <mat-form-field appearance="outline" class="native__span-2"><mat-label>Public IP name</mat-label><input matInput formControlName="publicIpName" placeholder="pip-ai-infra-studio" /></mat-form-field>
          } @else if (section === 'Tags') {
            <mat-form-field appearance="outline" class="native__wide"><mat-label>Tags</mat-label><input matInput formControlName="tags" placeholder="environment=test,created_by=ai-infra-studio" /></mat-form-field>
          } @else if (section === 'Review + create') {
            <button mat-stroked-button type="button" (click)="runPreflight.emit()"><mat-icon>fact_check</mat-icon>Validate</button>
          } @else {
            <ng-container *ngTemplateOutlet="advancedSettings; context: { title: section }" />
          }
        </details>
      }
    </ng-template>

    <ng-template #gcpPanel>
      @for (section of gcpSections(); track section) {
        <details class="native__section" [open]="section === 'Machine configuration' || section === 'Networking' || section === 'Review'">
          <summary><span>{{ section }}</span><small>{{ gcpHint(section) }}</small></summary>
          @if (section === 'Machine configuration') {
            <div class="native__grid">
              <mat-form-field appearance="outline"><mat-label>Project</mat-label><input matInput formControlName="projectId" placeholder="gcp-project-id" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>VM name</mat-label><input matInput formControlName="name" placeholder="gce-vm-prod-01" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Region</mat-label><mat-select formControlName="region" (selectionChange)="regionChange.emit()">@for (r of regions(); track r.id) { <mat-option [value]="r.id">{{ r.name }}</mat-option> }</mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Zone</mat-label><mat-select formControlName="availabilityZone" (selectionChange)="azChange.emit()">@for (z of zones(); track z) { <mat-option [value]="z">{{ z }}</mat-option> }</mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Machine family</mat-label><mat-select formControlName="machineFamily"><mat-option value="general-purpose">General purpose</mat-option><mat-option value="compute-optimized">Compute optimized</mat-option><mat-option value="memory-optimized">Memory optimized</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Machine type</mat-label><mat-select formControlName="instanceType">@for (t of types(); track t.id) { <mat-option [value]="t.id">{{ t.name }} · {{ t.vcpus || '?' }} vCPU · {{ t.memoryGb || '?' }} GB</mat-option> }</mat-select></mat-form-field>
            </div>
          } @else if (section === 'OS and storage') {
            <mat-form-field appearance="outline" class="native__wide"><mat-label>Boot disk image</mat-label><mat-select formControlName="imageId">@for (img of images(); track img.id) { <mat-option [value]="img.id">{{ img.name }}</mat-option> }</mat-select></mat-form-field>
            <ng-container *ngTemplateOutlet="storageSettings; context: { title: 'Boot disk', disk: 'Boot disk' }" />
          } @else if (section === 'Networking') {
            <ng-container *ngTemplateOutlet="networkSettings; context: { title: 'Networking', network: 'VPC network', subnet: 'Subnetwork', security: 'Firewall rule' }" />
          } @else if (section === 'Security') {
            <mat-form-field appearance="outline" class="native__wide"><mat-label>SSH key</mat-label><mat-select formControlName="keyPair">@for (kp of keyPairs(); track kp.id) { <mat-option [value]="kp.name">{{ kp.name }}</mat-option> }</mat-select></mat-form-field>
            <button mat-stroked-button type="button" (click)="createDependency.emit('key')"><mat-icon>vpn_key</mat-icon>Create SSH key</button>
          } @else if (section === 'Review') {
            <button mat-stroked-button type="button" (click)="runPreflight.emit()"><mat-icon>fact_check</mat-icon>Validate</button>
          } @else {
            <div class="native__grid">
              <mat-form-field appearance="outline"><mat-label>Service account</mat-label><input matInput formControlName="serviceAccount" placeholder="Compute Engine default service account" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Labels</mat-label><input matInput formControlName="tags" placeholder="created_by=ai-infra-studio,environment=test" /></mat-form-field>
              <mat-form-field appearance="outline" class="native__span-2"><mat-label>Metadata</mat-label><textarea matInput rows="4" formControlName="metadata"></textarea></mat-form-field>
            </div>
          }
        </details>
      }
    </ng-template>

    <ng-template #cloudingPanel>
      @for (section of cloudingSections(); track section) {
        <details class="native__section" open>
          <summary><span>{{ section }}</span><small>{{ cloudingHint(section) }}</small></summary>
          @if (section === 'Servidor') {
            <div class="native__grid">
              <mat-form-field appearance="outline"><mat-label>Cuenta Clouding conectada</mat-label><input matInput [value]="accountName()" readonly /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Datacenter / región</mat-label><mat-select formControlName="region" (selectionChange)="regionChange.emit()">@for (r of regions(); track r.id) { <mat-option [value]="r.id">{{ r.name }}</mat-option> }</mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nombre del servidor</mat-label><input matInput formControlName="name" placeholder="clouding-app-01" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Imagen / sistema operativo</mat-label><mat-select formControlName="imageId">@for (img of images(); track img.id) { <mat-option [value]="img.id">{{ img.name }}</mat-option> }</mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Plan</mat-label><mat-select formControlName="instanceType">@for (t of types(); track t.id) { <mat-option [value]="t.id">{{ t.name }} · {{ t.vcpus || '?' }} vCPU · {{ t.memoryGb || '?' }} GB</mat-option> }</mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>SSH key</mat-label><mat-select formControlName="keyPair">@for (kp of keyPairs(); track kp.id) { <mat-option [value]="kp.name">{{ kp.name }}</mat-option> }</mat-select></mat-form-field>
            </div>
          } @else if (section === 'Red y seguridad') {
            <ng-container *ngTemplateOutlet="networkSettings; context: { title: 'Red y seguridad', network: 'Red privada', subnet: 'Config de red', security: 'Firewall' }" />
          } @else {
            <ng-container *ngTemplateOutlet="storageSettings; context: { title: 'Disco y backups', disk: 'SSD' }" />
          }
        </details>
      }
    </ng-template>
  `,
  styles: `
    .native { --native-accent: #0057d9; display: block; color: var(--text-main); }
    .native--aws { --native-accent: #ff9900; }
    .native--azure { --native-accent: #0078d4; }
    .native--gcp { --native-accent: #1a73e8; }
    .native--clouding { --native-accent: #6366f1; }
    .native__topbar { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 1rem; border: 1px solid var(--border-soft); border-radius: 12px; background: linear-gradient(135deg, #fff, color-mix(in srgb, var(--native-accent) 8%, #fff)); }
    .native__brand { display: flex; align-items: center; gap: .75rem; }
    .native__brand p, .native__brand span { margin: 0; color: var(--text-muted); font-size: .78rem; }
    .native__brand h3 { margin: .1rem 0; font-size: 1.25rem; letter-spacing: 0; }
    .native__top-actions { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: flex-end; }
    .native__body { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 1rem; margin-top: 1rem; align-items: start; }
    .native__main { display: grid; gap: .8rem; min-width: 0; }
    .native__section { border: 1px solid var(--border-soft); border-radius: 10px; background: var(--bg-card); overflow: clip; box-shadow: 0 8px 22px rgba(16, 24, 40, .045); }
    .native__section summary { display: flex; justify-content: space-between; gap: 1rem; padding: .9rem 1rem; cursor: pointer; border-left: 4px solid var(--native-accent); list-style: none; }
    .native__section summary::-webkit-details-marker { display: none; }
    .native__section summary span { font-weight: 800; }
    .native__section summary small { color: var(--text-muted); font-size: .76rem; text-align: right; }
    .native__section[open] { padding-bottom: 1rem; }
    .native__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; padding: 0 1rem; align-items: center; }
    .native__span-2, .native__wide { grid-column: 1 / -1; width: 100%; }
    .native__search { width: min(460px, calc(100% - 2rem)); margin: 0 1rem .7rem; }
    .native__tabs, .native__dependency-actions { display: flex; flex-wrap: wrap; gap: .45rem; padding: 0 1rem .75rem; }
    .native__tabs button { border: 1px solid var(--border); background: #fff; border-radius: 999px; padding: .38rem .7rem; cursor: pointer; font-weight: 700; color: var(--text-muted); }
    .native__tab--on { color: var(--native-accent) !important; border-color: var(--native-accent) !important; background: color-mix(in srgb, var(--native-accent) 10%, #fff) !important; }
    .native__image-grid, .native__type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); gap: .65rem; padding: 0 1rem; }
    .native__image, .native__type { display: grid; gap: .25rem; text-align: left; border: 1px solid var(--border); background: #fff; border-radius: 8px; padding: .8rem; cursor: pointer; min-height: 126px; }
    .native__image--on, .native__type--on { border-color: var(--native-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--native-accent) 16%, transparent); }
    .native__image code, .native__type small, .native__mono { font-family: var(--app-font-mono, ui-monospace, monospace); }
    .native__image em { font-style: normal; color: var(--success); font-weight: 800; font-size: .7rem; }
    .native__os { width: fit-content; border-radius: 999px; padding: .15rem .42rem; background: var(--primary-soft); color: var(--primary); font-size: .68rem; font-weight: 900; }
    .native__tag-table { display: grid; grid-template-columns: 180px 1fr; gap: .35rem; margin: 0 1rem; padding: .7rem; border-radius: 8px; background: var(--bg-main); font-size: .78rem; }
    .native__inline-btn { align-self: center; min-height: 48px; }
    .native__summary { position: sticky; top: 1rem; display: grid; gap: .75rem; padding: 1rem; border-radius: 12px; background: #fff; border: 1px solid color-mix(in srgb, var(--native-accent) 22%, var(--border-soft)); box-shadow: 0 14px 34px rgba(16, 24, 40, .08); }
    .native__summary h4 { margin: 0; font-size: 1rem; }
    .native__summary dl { display: grid; gap: .45rem; margin: 0; }
    .native__summary dl div { display: flex; justify-content: space-between; gap: .75rem; padding-bottom: .4rem; border-bottom: 1px solid var(--border-soft); }
    .native__summary dt { color: var(--text-muted); font-size: .73rem; }
    .native__summary dd { margin: 0; text-align: right; font-size: .78rem; font-weight: 800; max-width: 170px; overflow-wrap: anywhere; }
    .native__cost { display: grid; gap: .18rem; padding: .7rem; border-radius: 8px; background: color-mix(in srgb, var(--native-accent) 9%, #fff); }
    .native__cost span, .native__cost small { color: var(--text-muted); font-size: .72rem; }
    .native__cost strong { font-size: 1.1rem; }
    .native__checks { display: grid; gap: .4rem; margin: 0; padding: 0; list-style: none; }
    .native__checks li { display: flex; gap: .4rem; align-items: flex-start; font-size: .75rem; color: var(--success); }
    .native__check--warn { color: var(--warning) !important; }
    .native__check--error { color: var(--danger) !important; }
    .native__primary { background: var(--native-accent) !important; color: #fff !important; }
    .native__summary-btn { width: 100%; }
    .native__missing { display: flex; gap: .7rem; padding: .9rem; border-radius: 10px; background: var(--warning-soft); border: 1px solid color-mix(in srgb, var(--warning) 40%, var(--border-soft)); }
    .native__missing p { margin: .2rem 0 .65rem; color: var(--text-muted); }
    .native__skeleton { display: grid; gap: .6rem; }
    .native__skeleton span { height: 64px; border-radius: 10px; background: linear-gradient(90deg, var(--border-soft), #fff, var(--border-soft)); animation: nativePulse 1.4s ease infinite; }
    .native__empty { color: var(--text-muted); padding: 0 1rem; }
    @keyframes nativePulse { 50% { opacity: .45; } }
    @media (prefers-reduced-motion: reduce) { .native__skeleton span { animation: none; } }
    @media (max-width: 1040px) { .native__body { grid-template-columns: 1fr; } .native__summary { position: static; } }
    @media (max-width: 720px) { .native__topbar, .native__summary dl div { flex-direction: column; align-items: stretch; } .native__grid { grid-template-columns: 1fr; } .native__section summary { flex-direction: column; } .native__section summary small { text-align: left; } }
  `,
})
export class ProviderNativeLaunchPanelComponent {
  readonly slug = input.required<CloudSlug>()
  readonly logo = input.required<NavLogoKey>()
  readonly form = input.required<FormGroup>()
  readonly accountName = input('')
  readonly providerLabel = input('')
  readonly regions = input<RegionRow[]>([])
  readonly zones = input<string[]>([])
  readonly vpcs = input<NetworkRow[]>([])
  readonly subnets = input<NetworkRow[]>([])
  readonly securityGroups = input<SecurityRow[]>([])
  readonly keyPairs = input<KeyPairRow[]>([])
  readonly images = input<ImageRow[]>([])
  readonly types = input<TypeRow[]>([])
  readonly awsSections = input<{ id: AwsImageSectionId; label: string }[]>([])
  readonly imageSection = input<AwsImageSectionId>('quick_start')
  readonly imageSearch = input('')
  readonly typeSearch = input('')
  readonly volumeTypes = input<{ id: string; label: string }[]>([])
  readonly summaryRows = input<ReviewRow[]>([])
  readonly checks = input<LaunchPreflightCheck[]>([])
  readonly cost = input<CostSummary>({ hourly: '', monthly: '', hint: '' })
  readonly loading = input(false)
  readonly primaryDisabled = input(false)
  readonly blocker = input('')

  readonly regionChange = output<void>()
  readonly azChange = output<void>()
  readonly vpcChange = output<void>()
  readonly typeSelected = output<string>()
  readonly imageSelected = output<ImageRow>()
  readonly imageSearchChange = output<string>()
  readonly typeSearchChange = output<string>()
  readonly imageSectionChange = output<AwsImageSectionId>()
  readonly createDependency = output<'network' | 'subnet' | 'security' | 'key' | 'resourceGroup'>()
  readonly runPreflight = output<void>()
  readonly primaryAction = output<void>()
  readonly previewCode = output<void>()

  consoleEyebrow = (): string =>
    this.slug() === 'aws' ? 'Amazon EC2' : this.slug() === 'azure' ? 'Azure Portal' : this.slug() === 'gcp' ? 'Google Cloud Console' : 'Clouding.io'

  title = (): string =>
    this.slug() === 'aws' ? 'Launch an instance' : this.slug() === 'azure' ? 'Create a virtual machine' : this.slug() === 'gcp' ? 'Create an instance' : 'Crear servidor Clouding'

  subtitle = (): string =>
    this.slug() === 'aws'
      ? 'Configure AMI, instance type, key pair, network, storage and advanced details.'
      : this.slug() === 'azure'
        ? 'Basics, disks, networking, management, monitoring, advanced, tags and review.'
        : this.slug() === 'gcp'
          ? 'Machine configuration, boot disk, networking, security, management and review.'
          : 'Datacenter, imagen, vCPU, RAM, SSD, firewall, backups y coste estimado.'

  previewLabel = (): string => (this.slug() === 'aws' ? 'Preview code' : 'Ver configuración')
  primaryLabel = (): string =>
    this.slug() === 'aws' ? 'Launch instance' : this.slug() === 'azure' ? 'Create VM' : this.slug() === 'gcp' ? 'Create instance' : 'Crear servidor'
  summaryTitle = (): string => (this.slug() === 'azure' ? 'Review + create' : this.slug() === 'gcp' ? 'Summary' : this.slug() === 'aws' ? 'Summary' : 'Resumen')

  recommendedTags = (): { key: string; value: string }[] => [
    { key: 'created_by', value: 'ai-infra-studio' },
    { key: 'environment', value: 'test' },
    { key: 'auto_delete', value: 'true' },
  ]

  azureSections = (): string[] => ['Basics', 'Disks', 'Networking', 'Management', 'Monitoring', 'Advanced', 'Tags', 'Review + create']
  gcpSections = (): string[] => ['Machine configuration', 'OS and storage', 'Networking', 'Security', 'Management', 'Advanced options', 'Review']
  cloudingSections = (): string[] => ['Servidor', 'Red y seguridad', 'Disco y backups']

  azureHint = (section: string): string =>
    ({
      Basics: 'Subscription, resource group, nombre, región, imagen, tamaño y autenticación.',
      Disks: 'OS disk, tipo, tamaño y cifrado.',
      Networking: 'VNet, subnet, Public IP, NSG e inbound ports.',
      Tags: 'Etiquetas para FinOps y gobierno.',
      'Review + create': 'Validación final antes de crear la VM.',
    })[section] ?? 'Opciones operativas del portal Azure.'

  gcpHint = (section: string): string =>
    ({
      'Machine configuration': 'Proyecto, nombre, región, zona, familia y machine type.',
      'OS and storage': 'Boot disk, imagen y tamaño.',
      Networking: 'VPC network, subnetwork, firewall y External IP.',
      Security: 'SSH key y controles de acceso.',
      Review: 'Validación final antes de crear la instancia.',
    })[section] ?? 'Opciones avanzadas de Compute Engine.'

  cloudingHint = (section: string): string =>
    ({
      Servidor: 'Cuenta, datacenter, nombre, imagen, plan y SSH key.',
      'Red y seguridad': 'Firewall, red disponible e IP pública.',
      'Disco y backups': 'SSD, tamaño y backups si aplica.',
    })[section] ?? 'Configuración Clouding.'

  osShort = (img: ImageRow): string => {
    const raw = `${img.os ?? ''} ${img.name}`.toLowerCase()
    if (raw.includes('ubuntu')) return 'Ubuntu'
    if (raw.includes('windows')) return 'Windows'
    if (raw.includes('red hat') || raw.includes('rhel')) return 'Red Hat'
    if (raw.includes('suse')) return 'SUSE'
    if (raw.includes('debian')) return 'Debian'
    if (raw.includes('amazon')) return 'Amazon Linux'
    return 'Linux'
  }

  family = (id: string): string => id.split('.')[0]?.toUpperCase() || id.split('-')[0]?.toUpperCase() || 'GEN'

  price = (t: TypeRow): string => {
    const hourly = t.pricePerHour ?? (t.pricePerMinute != null ? t.pricePerMinute * 60 : undefined)
    return hourly != null ? `$${hourly.toFixed(4)}/h` : 'Precio bajo demanda'
  }
}
