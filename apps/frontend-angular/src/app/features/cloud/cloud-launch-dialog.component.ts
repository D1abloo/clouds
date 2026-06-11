import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import {
  CloudLaunchWizardComponent,
  type CloudLaunchWizardData,
} from './cloud-launch-wizard.component'

export type CloudLaunchDialogData = CloudLaunchWizardData

@Component({
  selector: 'app-cloud-launch-dialog',
  standalone: true,
  imports: [MatDialogModule, CloudLaunchWizardComponent],
  template: `
    <app-cloud-launch-wizard
      [data]="data"
      [embedded]="false"
      (launched)="dialogRef.close({ launched: true })"
      (cancelled)="dialogRef.close()"
    />
  `,
})
export class CloudLaunchDialogComponent {
  readonly data = inject<CloudLaunchDialogData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<CloudLaunchDialogComponent>)
}
