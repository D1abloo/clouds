import { Component, Input, forwardRef, inject, signal, OnInit, output } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { TerraformService } from '../../../core/services/terraform.service'
import { TerraformTemplate } from '../../../core/models/api.models'

@Component({
  selector: 'app-instance-template-selector',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InstanceTemplateSelectorComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>Load from template (optional)</mat-label>
      <mat-select [value]="value" (selectionChange)="handleSelect($event.value)">
        <mat-option value="">— None —</mat-option>
        @for (t of templates(); track t.id) {
          <mat-option [value]="t.id">{{ t.name }} ({{ t.provider }})</mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
  styles: `.full-width { width: 100%; }`,
})
export class InstanceTemplateSelectorComponent implements ControlValueAccessor, OnInit {
  @Input() providerFilter = ''

  readonly templateSelected = output<TerraformTemplate>()

  private readonly terraform = inject(TerraformService)
  readonly templates = signal<TerraformTemplate[]>([])

  value = ''
  private onChange: (v: string) => void = () => {}
  private onTouched: () => void = () => {}

  ngOnInit(): void {
    this.terraform.listTemplates().subscribe({
      next: (rows) => {
        const filtered = this.providerFilter
          ? rows.filter((r) => r.provider === this.providerFilter)
          : rows
        this.templates.set(filtered)
      },
    })
  }

  handleSelect = (id: string): void => {
    this.value = id
    this.onChange(id)
    this.onTouched()
    const tpl = this.templates().find((t) => t.id === id)
    if (tpl) this.templateSelected.emit(tpl)
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
