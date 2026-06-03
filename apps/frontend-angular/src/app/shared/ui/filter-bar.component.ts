import { Component, Input, output } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  template: `
    <div class="filter-bar">
      @if (showSearch) {
        <mat-form-field appearance="outline" class="filter-bar__search">
          <mat-label>{{ searchLabel }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="searchControl" (input)="searchChange.emit(searchControl.value)" />
        </mat-form-field>
      }
      <div class="filter-bar__slots">
        <ng-content />
      </div>
      @if (showRefresh) {
        <button mat-stroked-button type="button" (click)="refreshClick.emit()">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      }
    </div>
  `,
  styles: `
    .filter-bar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;
      padding: 1rem 1.25rem 0.85rem;
    }
    .filter-bar__search { min-width: 220px; flex: 1; max-width: 360px; }
    .filter-bar__slots { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; flex: 1; }
  `,
})
export class FilterBarComponent {
  @Input() showSearch = true
  @Input() showRefresh = true
  @Input() searchLabel = 'Search'
  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly searchChange = output<string>()
  readonly refreshClick = output<void>()
}
