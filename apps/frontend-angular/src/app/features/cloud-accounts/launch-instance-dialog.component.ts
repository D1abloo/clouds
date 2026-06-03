import { Component, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { ToastService } from '../../core/services/toast.service'

export interface LaunchInstanceDialogData {
  accountId: string
  accountName: string
  defaultRegion?: string
}

@Component({
  selector: 'app-launch-instance-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Launch instance — {{ data.accountName }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Instance name</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Region</mat-label>
          <mat-select formControlName="region">
            @for (r of regions(); track r.id) {
              <mat-option [value]="r.id">{{ r.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Instance type</mat-label>
          <mat-select formControlName="instanceType">
            @for (t of types(); track t.id) {
              <mat-option [value]="t.id">{{ t.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Image</mat-label>
          <mat-select formControlName="imageId">
            @for (img of images(); track img.id) {
              <mat-option [value]="img.id">{{ img.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="form.invalid || launching()" (click)="handleLaunch()">
        Launch
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .form-grid { display: flex; flex-direction: column; min-width: 360px; }
    .full { width: 100%; }
  `,
})
export class LaunchInstanceDialogComponent {
  readonly data = inject<LaunchInstanceDialogData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<LaunchInstanceDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly accounts = inject(CloudAccountsService)
  private readonly toast = inject(ToastService)

  readonly launching = signal(false)
  readonly regions = signal<{ id: string; name: string }[]>([])
  readonly types = signal<{ id: string; name: string }[]>([])
  readonly images = signal<{ id: string; name: string }[]>([])

  form = this.fb.group({
    name: ['', Validators.required],
    region: [this.data.defaultRegion ?? '', Validators.required],
    instanceType: ['', Validators.required],
    imageId: ['', Validators.required],
  })

  constructor() {
    this.accounts.regions(this.data.accountId).subscribe({
      next: (r) => {
        this.regions.set(r)
        if (r.length && !this.form.value.region) this.form.patchValue({ region: r[0].id })
        this.loadCatalog()
      },
    })
    this.form.get('region')?.valueChanges.subscribe(() => this.loadCatalog())
  }

  loadCatalog = (): void => {
    const region = this.form.value.region
    if (!region) return
    this.accounts.instanceTypes(this.data.accountId, region).subscribe({
      next: (t) => {
        const list = (t as { id: string; name: string }[])
        this.types.set(list)
        if (list[0]) this.form.patchValue({ instanceType: list[0].id })
      },
    })
    this.accounts.images(this.data.accountId, region).subscribe({
      next: (imgs) => {
        const list = (imgs as { id: string; name: string }[])
        this.images.set(list)
        if (list[0]) this.form.patchValue({ imageId: list[0].id })
      },
    })
  }

  handleLaunch = (): void => {
    if (this.form.invalid) return
    this.launching.set(true)
    const v = this.form.getRawValue()
    this.accounts.launch(this.data.accountId, {
      name: v.name ?? '',
      region: v.region ?? '',
      instanceType: v.instanceType ?? '',
      imageId: v.imageId ?? '',
    })
      .subscribe({
        next: () => {
          this.launching.set(false)
          this.toast.success(`Instance ${v.name} launched`)
          this.dialogRef.close({ launched: true })
        },
        error: () => {
          this.launching.set(false)
          this.toast.error('Launch failed')
        },
      })
  }
}
