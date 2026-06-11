import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { FormGroup, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'

@Component({
  selector: 'app-gcp-launch-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <div class="lf" [formGroup]="form()">
      <h4 class="lf__title">Google Cloud Compute Engine</h4>
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
          <mat-label>Zona</mat-label>
          <mat-select formControlName="availabilityZone">
            @for (z of zones(); track z) {
              <mat-option [value]="z">{{ z }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>VPC network</mat-label>
          <mat-select formControlName="vpcId">
            @for (v of vpcs(); track v.id) {
              <mat-option [value]="v.id">{{ v.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Subnet</mat-label>
          <mat-select formControlName="subnetId">
            @for (n of subnets(); track n.id) {
              <mat-option [value]="n.id">{{ n.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Firewall rule</mat-label>
          <mat-select formControlName="securityGroupId">
            @for (sg of securityGroups(); track sg.id) {
              <mat-option [value]="sg.id">{{ sg.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>SSH key</mat-label>
          <mat-select formControlName="keyPair">
            @for (kp of keyPairs(); track kp.id) {
              <mat-option [value]="kp.name">{{ kp.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    </div>
  `,
  styles: `
    .lf__title { margin: 0 0 0.75rem; color: var(--text-main); font-size: 0.95rem; }
    .lf__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
    @media (max-width: 720px) { .lf__grid { grid-template-columns: 1fr; } }
  `,
})
export class GcpLaunchFormComponent {
  readonly form = input.required<FormGroup>()
  readonly regions = input<{ id: string; name: string }[]>([])
  readonly zones = input<string[]>([])
  readonly vpcs = input<{ id: string; name: string }[]>([])
  readonly subnets = input<{ id: string; name: string }[]>([])
  readonly securityGroups = input<{ id: string; name: string }[]>([])
  readonly keyPairs = input<{ id: string; name: string }[]>([])
  readonly regionChange = output<void>()
}
