import { Component, inject, OnInit } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { ThemeService } from './core/services/theme.service'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<div class="app-root"><router-outlet /></div>`,
})
export class AppComponent implements OnInit {
  private readonly theme = inject(ThemeService)

  ngOnInit(): void {
    this.theme.setTheme(this.theme.mode())
  }
}
