import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import type { CloudProvider } from '../../core/models/api.models'
import { CloudAccountWizardFacade } from './cloud-account-wizard.facade'
import { CloudConnectionWizardBodyComponent } from './cloud-connection-wizard-body.component'
import { CLOUD_ACCOUNT_WIZARD_DIALOG } from './cloud-account-wizard-dialog.config'
import type { ConnectionProviderId } from './cloud-account-wizard.config'

export interface CloudAccountFormData {
  suggestedProvider?: ConnectionProviderId | CloudProvider
  provider?: ConnectionProviderId | CloudProvider
  scope?: 'all' | 'cloud' | 'vps' | 'platform'
}

@Component({
  selector: 'app-cloud-account-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CloudAccountWizardFacade],
  imports: [MatDialogModule, CloudConnectionWizardBodyComponent],
  template: `
    <app-cloud-connection-wizard-body
      mode="dialog"
      [initOptions]="initOptions"
      (cancel)="dialogRef.close()"
      (completed)="handleCompleted($event)"
    />
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      max-width: 900px;
    }
  `,
})
export class CloudAccountFormDialogComponent {
  static readonly dialogConfig = CLOUD_ACCOUNT_WIZARD_DIALOG

  readonly data = inject<CloudAccountFormData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<CloudAccountFormDialogComponent>)

  readonly initOptions = {
    suggestedProvider: this.data.suggestedProvider ?? this.data.provider,
    scope: this.data.scope ?? this.inferScope(this.data.suggestedProvider ?? this.data.provider),
  }

  private inferScope(
    provider?: ConnectionProviderId | CloudProvider,
  ): 'all' | 'cloud' | 'vps' | 'platform' {
    if (!provider) return 'all'
    if (provider === 'AWS' || provider === 'GCP' || provider === 'AZURE' || provider === 'CLOUDING') {
      return 'cloud'
    }
    return 'all'
  }

  handleCompleted = (res: { created: boolean; accountId?: string; provider?: ConnectionProviderId }): void => {
    this.dialogRef.close(res)
  }
}
