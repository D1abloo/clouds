import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import type { CloudProvider } from '../../core/models/api.models'
import { CloudAccountWizardFacade } from './cloud-account-wizard.facade'
import { CloudConnectionWizardBodyComponent } from './cloud-connection-wizard-body.component'
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
    <mat-dialog-content class="cloud-account-wizard-dialog">
      <app-cloud-connection-wizard-body
        mode="dialog"
        [initOptions]="initOptions"
        (cancel)="dialogRef.close()"
        (completed)="handleCompleted($event)"
      />
    </mat-dialog-content>
  `,
  styles: `
    .cloud-account-wizard-dialog {
      padding: 0 !important;
      margin: 0;
      max-height: 92vh;
    }
  `,
})
export class CloudAccountFormDialogComponent {
  readonly data = inject<CloudAccountFormData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<CloudAccountFormDialogComponent>)

  readonly initOptions = {
    suggestedProvider: this.data.suggestedProvider ?? this.data.provider,
    scope: this.data.scope,
  }

  handleCompleted = (res: { created: boolean; accountId?: string; provider?: ConnectionProviderId }): void => {
    this.dialogRef.close(res)
  }
}
