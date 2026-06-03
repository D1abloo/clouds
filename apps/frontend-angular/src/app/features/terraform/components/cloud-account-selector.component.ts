import { Component, Input, forwardRef, inject, signal, OnInit } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { CloudAccountsService } from '../../../core/services/cloud-accounts.service'
import { CloudAccount, CloudProvider } from '../../../core/models/api.models'

@Component({
  selector: 'app-cloud-account-selector',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CloudAccountSelectorComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Cloud account</mat-label>
      <mat-select [value]="value" (selectionChange)="handleChange($event.value)" [disabled]="loading()">
        @if (loading()) {
          <mat-option disabled>Loading accounts…</mat-option>
        } @else if (accounts().length === 0) {
          <mat-option disabled>No accounts — add one in Cloud hub</mat-option>
        } @else {
          @for (a of accounts(); track a.id) {
            <mat-option [value]="a.id">{{ a.name }} ({{ a.accountId ?? a.provider }})</mat-option>
          }
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: `.full-width { width: 100%; }`,
})
export class CloudAccountSelectorComponent implements ControlValueAccessor, OnInit {
  @Input({ required: true }) provider!: CloudProvider

  private readonly accountsService = inject(CloudAccountsService)
  readonly accounts = signal<CloudAccount[]>([])
  readonly loading = signal(true)

  value = ''
  private onChange: (v: string) => void = () => {}
  private onTouched: () => void = () => {}

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.loading.set(true)
    this.accountsService.list(undefined, this.provider).subscribe({
      next: (rows) => {
        this.accounts.set(rows)
        this.loading.set(false)
        if (!this.value && rows[0]) {
          this.handleChange(rows[0].id)
        }
      },
      error: () => {
        this.accounts.set([])
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
