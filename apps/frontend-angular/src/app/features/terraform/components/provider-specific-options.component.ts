import { Component, Input, inject, signal, OnChanges, SimpleChanges } from '@angular/core'
import { FormGroup, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatIconModule } from '@angular/material/icon'
import { CloudAccountsService } from '../../../core/services/cloud-accounts.service'
import { CloudProvider } from '../../../core/models/api.models'
import { LaunchCloudProvider, PROVIDER_LAUNCH_META } from '../terraform-launch.config'

@Component({
  selector: 'app-provider-specific-options',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
  ],
  template: `
    <div class="provider-panel animate-fade-in" [style.--provider-accent]="meta.accent">
      <div class="provider-panel__banner">
        <mat-icon>{{ meta.icon }}</mat-icon>
        <div>
          <strong>{{ meta.label }}</strong>
          <span>Provider-specific configuration</span>
        </div>
      </div>

      @if (provider === 'AWS') {
        <div class="field-grid" [formGroup]="form">
          <mat-form-field appearance="outline"><mat-label>Key pair</mat-label><input matInput formControlName="keyPair" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Security Group</mat-label>
            <mat-select formControlName="securityGroupId">
              @for (sg of securityGroups(); track sg.id) {
                <mat-option [value]="sg.id">{{ sg.name ?? sg.id }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Subnet</mat-label>
            <mat-select formControlName="subnetId">
              @for (n of networks(); track n.id) {
                <mat-option [value]="n.id">{{ n.name ?? n.id }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>IAM Instance Profile</mat-label><input matInput formControlName="iamProfile" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Availability Zone</mat-label><input matInput formControlName="availabilityZone" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>EBS size (GB)</mat-label><input matInput type="number" formControlName="ebsSize" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>EBS type</mat-label>
            <mat-select formControlName="ebsType"><mat-option value="gp3">gp3</mat-option><mat-option value="gp2">gp2</mat-option><mat-option value="io1">io1</mat-option></mat-select>
          </mat-form-field>
          <mat-slide-toggle formControlName="publicIp">Assign public IP</mat-slide-toggle>
          <mat-form-field appearance="outline" class="span-2"><mat-label>User data</mat-label><textarea matInput rows="3" formControlName="userData"></textarea></mat-form-field>
          <mat-form-field appearance="outline" class="span-2"><mat-label>Tags (key=value)</mat-label><input matInput formControlName="tags" placeholder="Environment=prod,Team=platform" /></mat-form-field>
        </div>
      }

      @if (provider === 'GCP') {
        <div class="field-grid" [formGroup]="form">
          <mat-form-field appearance="outline"><mat-label>Project ID</mat-label><input matInput formControlName="projectId" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Zone</mat-label><input matInput formControlName="zone" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Subnetwork</mat-label>
            <mat-select formControlName="subnetId">
              @for (n of networks(); track n.id) {
                <mat-option [value]="n.id">{{ n.name ?? n.id }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Boot disk size (GB)</mat-label><input matInput type="number" formControlName="diskGb" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Boot disk type</mat-label>
            <mat-select formControlName="diskType"><mat-option value="pd-ssd">pd-ssd</mat-option><mat-option value="pd-standard">pd-standard</mat-option></mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Firewall tags</mat-label><input matInput formControlName="firewallTags" placeholder="http-server,https-server" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Service account</mat-label><input matInput formControlName="serviceAccount" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Scopes</mat-label><input matInput formControlName="scopes" /></mat-form-field>
          <mat-slide-toggle formControlName="publicIp">External IP</mat-slide-toggle>
          <mat-form-field appearance="outline" class="span-2"><mat-label>Startup script</mat-label><textarea matInput rows="3" formControlName="startupScript"></textarea></mat-form-field>
          <mat-form-field appearance="outline" class="span-2"><mat-label>Labels</mat-label><input matInput formControlName="labels" placeholder="env=prod,team=platform" /></mat-form-field>
        </div>
      }

      @if (provider === 'AZURE') {
        <div class="field-grid" [formGroup]="form">
          <mat-form-field appearance="outline"><mat-label>Subscription</mat-label><input matInput formControlName="subscriptionId" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Resource Group</mat-label><input matInput formControlName="resourceGroup" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Location</mat-label><input matInput formControlName="location" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Image publisher</mat-label><input matInput formControlName="imagePublisher" placeholder="Canonical" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Image offer</mat-label><input matInput formControlName="imageOffer" placeholder="0001-com-ubuntu-server-jammy" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Image SKU</mat-label><input matInput formControlName="imageSku" placeholder="22_04-lts-gen2" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Subnet</mat-label>
            <mat-select formControlName="subnetId">
              @for (n of networks(); track n.id) {
                <mat-option [value]="n.id">{{ n.name ?? n.id }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Network Security Group</mat-label>
            <mat-select formControlName="securityGroupId">
              @for (sg of securityGroups(); track sg.id) {
                <mat-option [value]="sg.id">{{ sg.name ?? sg.id }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>OS disk size (GB)</mat-label><input matInput type="number" formControlName="diskGb" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>OS disk type</mat-label>
            <mat-select formControlName="diskType"><mat-option value="Premium_LRS">Premium_LRS</mat-option><mat-option value="Standard_LRS">Standard_LRS</mat-option></mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Admin username</mat-label><input matInput formControlName="adminUsername" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>SSH public key</mat-label><textarea matInput rows="2" formControlName="sshPublicKey"></textarea></mat-form-field>
          <mat-slide-toggle formControlName="publicIp">Public IP</mat-slide-toggle>
          <mat-form-field appearance="outline" class="span-2"><mat-label>Tags</mat-label><input matInput formControlName="tags" placeholder="Environment=prod" /></mat-form-field>
        </div>
      }
    </div>
  `,
  styles: `
    .provider-panel {
      border-radius: var(--app-radius-lg);
      background: var(--app-elevated);
      box-shadow: var(--app-shadow-sm);
      overflow: hidden;
    }
    .provider-panel__banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: linear-gradient(135deg, color-mix(in srgb, var(--provider-accent) 12%, transparent), transparent);
      mat-icon { color: var(--provider-accent); }
      strong { display: block; font-size: 0.95rem; }
      span { font-size: 0.78rem; color: var(--app-text-muted); }
    }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      padding: 1.25rem;
    }
    .span-2 { grid-column: span 2; }
    @media (max-width: 720px) {
      .field-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }
  `,
})
export class ProviderSpecificOptionsComponent implements OnChanges {
  @Input({ required: true }) provider!: LaunchCloudProvider
  @Input({ required: true }) form!: FormGroup
  @Input() accountId = ''
  @Input() region = ''

  private readonly accounts = inject(CloudAccountsService)
  readonly networks = signal<{ id: string; name?: string }[]>([])
  readonly securityGroups = signal<{ id: string; name?: string }[]>([])

  get meta() {
    return PROVIDER_LAUNCH_META[this.provider]
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['accountId'] || changes['region']) && this.accountId) {
      this.loadNetworkData()
    }
  }

  loadNetworkData = (): void => {
    const region = this.region || undefined
    this.accounts.networks(this.accountId, region).subscribe({
      next: (rows) => this.networks.set(rows as { id: string; name?: string }[]),
      error: () => this.networks.set([]),
    })
    this.accounts.securityGroups(this.accountId, region).subscribe({
      next: (rows) => this.securityGroups.set(rows as { id: string; name?: string }[]),
      error: () => this.securityGroups.set([]),
    })
  }
}
