import { Injectable, inject } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar)

  show = (message: string, type: ToastType = 'info', duration = 4000): void => {
    const panelClass = [`toast-${type}`]
    this.snackBar.open(message, 'Dismiss', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass,
    })
  }

  success = (message: string): void => this.show(message, 'success')
  error = (message: string): void => this.show(message, 'error', 6000)
  warning = (message: string): void => this.show(message, 'warning')
  info = (message: string): void => this.show(message, 'info')
}
