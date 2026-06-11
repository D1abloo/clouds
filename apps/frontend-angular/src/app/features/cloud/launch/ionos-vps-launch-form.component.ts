import { ChangeDetectionStrategy, Component, input } from '@angular/core'
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
      <h4 class="lf__title">IONOS VPS</h4>
      <div class="lf__grid">
        <mat-form-field appearance="outline">
          <mat-label>Datacenter / región</mat-label>
          <mat-select formControlName="region">
            @for (r of datacenters(); track r) {
              <mat-option [value]="r">{{ r }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Plan VPS</mat-label>
          <mat-select formControlName="instanceType">
            @for (p of plans(); track p.id) {
              <mat-option [value]="p.id">{{ p.label }}</mat-option>
            }
          </mat-select>
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
          <input matInput formControlName="name" placeholder="ionos-test-01" />
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
  readonly form = input.required<FormGroup>()
  readonly datacenters = input<string[]>(['eu-central-1', 'eu-central-2', 'us-east-1'])
  readonly plans = input<{ id: string; label: string }[]>([
    { id: 'vps-s', label: 'VPS S — 1 vCPU · 1 GB' },
    { id: 'vps-m', label: 'VPS M — 2 vCPU · 2 GB' },
    { id: 'vps-l', label: 'VPS L — 4 vCPU · 4 GB' },
  ])
  readonly images = input<{ id: string; name: string }[]>([
    { id: 'ubuntu-22', name: 'Ubuntu 22.04' },
    { id: 'debian-12', name: 'Debian 12' },
  ])
  readonly keyPairs = input<string[]>(['default', 'ionos-key'])
}
