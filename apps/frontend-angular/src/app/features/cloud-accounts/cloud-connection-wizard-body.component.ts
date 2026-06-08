import { ChangeDetectionStrategy, Component, inject, input, OnInit, output } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatExpansionModule } from '@angular/material/expansion'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { CloudAccountWizardFacade, type WizardInitOptions } from './cloud-account-wizard.facade'
import type { ConnectionProviderId } from './cloud-account-wizard.config'

@Component({
  selector: 'app-cloud-connection-wizard-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatExpansionModule,
    BrandLogoComponent,
  ],
  templateUrl: './cloud-connection-wizard-body.component.html',
  styleUrl: './cloud-account-form-dialog.component.scss',
})
export class CloudConnectionWizardBodyComponent implements OnInit {
  readonly facade = inject(CloudAccountWizardFacade)

  readonly mode = input<'dialog' | 'page'>('page')
  readonly suggestedProvider = input<ConnectionProviderId | null>(null)
  readonly initOptions = input<WizardInitOptions>({})
  readonly cancel = output<void>()
  readonly completed = output<{ created: boolean; accountId?: string; provider?: ConnectionProviderId }>()

  ngOnInit(): void {
    const opts = this.initOptions()
    if (Object.keys(opts).length) {
      this.facade.init(opts)
    } else if (this.suggestedProvider()) {
      this.facade.init({ suggestedProvider: this.suggestedProvider()! })
    }
  }

  handleCancel = (): void => this.cancel.emit()

  handleSave = (sync: boolean): void => {
    this.facade.handleSave(sync, (res) => {
      if (res.created) {
        this.completed.emit({
          created: true,
          accountId: res.accountId,
          provider: res.provider,
        })
      }
    })
  }
}
