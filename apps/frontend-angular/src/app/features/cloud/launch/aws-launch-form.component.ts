import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { FormGroup, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'

@Component({
  selector: 'app-aws-launch-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <div class="lf" [formGroup]="form()">
      <h4 class="lf__title">Amazon EC2</h4>
      <div class="lf__grid">
        <mat-form-field appearance="outline">
          <mat-label>Región AWS</mat-label>
          <mat-select formControlName="region" (selectionChange)="regionChange.emit()">
            @for (r of regions(); track r.id) {
              <mat-option [value]="r.id">{{ r.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Availability Zone</mat-label>
          <mat-select formControlName="availabilityZone" (selectionChange)="azChange.emit()">
            @for (z of zones(); track z) {
              <mat-option [value]="z">{{ z }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>VPC</mat-label>
          <mat-select formControlName="vpcId" (selectionChange)="vpcChange.emit()">
            @for (v of vpcs(); track v.id) {
              <mat-option [value]="v.id">{{ v.name }} ({{ v.cidr ?? v.id }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Subnet</mat-label>
          <mat-select formControlName="subnetId">
            @for (n of subnets(); track n.id) {
              <mat-option [value]="n.id">{{ n.name }} ({{ n.cidr ?? n.id }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Security Group</mat-label>
          <mat-select formControlName="securityGroupId">
            @for (sg of securityGroups(); track sg.id) {
              <mat-option [value]="sg.id">{{ sg.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Key Pair</mat-label>
          <mat-select formControlName="keyPair">
            @for (kp of keyPairs(); track kp.id) {
              <mat-option [value]="kp.name">{{ kp.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="lf__toggle">
          <mat-slide-toggle formControlName="publicIp" color="primary">IP pública</mat-slide-toggle>
        </div>
      </div>
    </div>
  `,
  styles: `
    .lf__title { margin: 0 0 0.75rem; color: var(--text-main); font-size: 0.95rem; }
    .lf__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
    .lf__toggle { grid-column: 1 / -1; padding: 0.25rem 0; }
    @media (max-width: 720px) { .lf__grid { grid-template-columns: 1fr; } }
  `,
})
export class AwsLaunchFormComponent {
  readonly form = input.required<FormGroup>()
  readonly regions = input<{ id: string; name: string }[]>([])
  readonly zones = input<string[]>([])
  readonly vpcs = input<{ id: string; name: string; cidr?: string }[]>([])
  readonly subnets = input<{ id: string; name: string; cidr?: string }[]>([])
  readonly securityGroups = input<{ id: string; name: string }[]>([])
  readonly keyPairs = input<{ id: string; name: string }[]>([])
  readonly regionChange = output<void>()
  readonly azChange = output<void>()
  readonly vpcChange = output<void>()
}
