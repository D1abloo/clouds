import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { FormGroup, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'

@Component({
  selector: 'app-ionos-vps-launch-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="lf" [formGroup]="form()">
      <h4 class="lf__title">{{ title() }}</h4>
      <div class="lf__grid">
        <mat-form-field appearance="outline">
          <mat-label>Región</mat-label>
          <mat-select formControlName="region" (selectionChange)="regionChange.emit()">
            @for (r of regions(); track r.id) {
              <mat-option [value]="r.id">{{ r.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Datacenter</mat-label>
          <mat-select formControlName="availabilityZone">
            @for (r of datacenters(); track r) {
              <mat-option [value]="r">{{ r }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Plan VPS</mat-label>
          <mat-select formControlName="instanceType" (selectionChange)="applyPlan($event.value)">
            @for (p of plans(); track p.id) {
              <mat-option [value]="p.id">{{ p.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>CPU</mat-label>
          <input matInput type="number" formControlName="cpuCores" readonly />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>RAM (GB)</mat-label>
          <input matInput type="number" formControlName="ramGb" readonly />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Disco (GB)</mat-label>
          <input matInput type="number" formControlName="diskGb" min="20" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Sistema operativo</mat-label>
          <mat-select formControlName="imageId">
            @for (img of images(); track img.id) {
              <mat-option [value]="img.id">{{ img.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>SSH key</mat-label>
          <mat-select formControlName="keyPair">
            @for (kp of keyPairs(); track kp) {
              <mat-option [value]="kp">{{ kp }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="lf__full">
          <mat-label>Nombre del VPS</mat-label>
          <input matInput formControlName="name" [placeholder]="namePlaceholder()" />
        </mat-form-field>
      </div>
    </div>
  `,
  styles: `
    .lf__title { margin: 0 0 0.75rem; color: var(--text-main); font-size: 0.95rem; }
    .lf__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
    .lf__full { grid-column: 1 / -1; }
    @media (max-width: 720px) { .lf__grid { grid-template-columns: 1fr; } }
  `,
})
export class IonosVpsLaunchFormComponent {
  readonly title = input('IONOS VPS')
  readonly form = input.required<FormGroup>()
  readonly regions = input<{ id: string; name: string }[]>([
    { id: 'de/fra', name: 'Alemania · Frankfurt' },
    { id: 'de/txl', name: 'Alemania · Berlin' },
    { id: 'es/mad', name: 'España · Madrid' },
  ])
  readonly datacenters = input<string[]>(['fra1', 'fra2', 'txl1', 'mad1'])
  readonly plans = input<{ id: string; label: string; cpu: number; ram: number; disk: number }[]>([
    { id: 'vps-s', label: 'VPS S — 1 vCPU · 2 GB', cpu: 1, ram: 2, disk: 40 },
    { id: 'vps-m', label: 'VPS M — 2 vCPU · 4 GB', cpu: 2, ram: 4, disk: 80 },
    { id: 'vps-l', label: 'VPS L — 4 vCPU · 8 GB', cpu: 4, ram: 8, disk: 160 },
    { id: 'vps-xl', label: 'VPS XL — 6 vCPU · 16 GB', cpu: 6, ram: 16, disk: 240 },
  ])
  readonly images = input<{ id: string; name: string }[]>([
    { id: 'ubuntu-24-04', name: 'Ubuntu 24.04 LTS' },
    { id: 'debian-12', name: 'Debian 12' },
    { id: 'alma-9', name: 'AlmaLinux 9' },
  ])
  readonly keyPairs = input<string[]>(['ionos-default', 'platform-ops'])
  readonly regionChange = output<void>()

  readonly namePlaceholder = (): string =>
    `${this.title().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'vps'}-01`

  applyPlan = (planId: string): void => {
    const plan = this.plans().find((p) => p.id === planId)
    if (!plan) return
    this.form().patchValue({
      cpuCores: plan.cpu,
      ramGb: plan.ram,
      diskGb: plan.disk,
      diskType: 'ssd-nvme',
    })
  }
}
