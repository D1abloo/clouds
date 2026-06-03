import { Component, Input, forwardRef, inject, signal, OnChanges, SimpleChanges } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { CloudAccountsService } from '../../../core/services/cloud-accounts.service'

@Component({
  selector: 'app-region-selector',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RegionSelectorComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ label }}</mat-label>
      <mat-select [value]="value" (selectionChange)="handleChange($event.value)" [disabled]="!accountId || loading()">
        @if (loading()) {
          <mat-option disabled>Loading…</mat-option>
        } @else {
          @for (r of regions(); track r.id) {
            <mat-option [value]="r.id">{{ r.name }}</mat-option>
          }
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: `.full-width { width: 100%; }`,
})
export class RegionSelectorComponent implements ControlValueAccessor, OnChanges {
  @Input() accountId = ''
  @Input() label = 'Region'

  private readonly accounts = inject(CloudAccountsService)
  readonly regions = signal<{ id: string; name: string }[]>([])
  readonly loading = signal(false)

  value = ''
  private onChange: (v: string) => void = () => {}
  private onTouched: () => void = () => {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['accountId'] && this.accountId) this.loadRegions()
  }

  loadRegions = (): void => {
    if (!this.accountId) return
    this.loading.set(true)
    this.accounts.regions(this.accountId).subscribe({
      next: (rows) => {
        this.regions.set(rows)
        this.loading.set(false)
        if (!this.value && rows[0]) this.handleChange(rows[0].id)
      },
      error: () => {
        this.regions.set([])
        this.loading.set(false)
      },
    })
  }

  handleChange = (id: string): void => {
    this.value = id
    this.onChange(id)
    this.onTouched()
  }

  writeValue(v: string): void {
    this.value = v ?? ''
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn
  }
}
