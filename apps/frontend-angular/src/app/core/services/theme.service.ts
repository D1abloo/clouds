import { Injectable, signal, effect } from '@angular/core'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'cloudops_theme'

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(readStoredTheme())

  constructor() {
    effect(() => {
      this.applyTheme(this.mode())
    })
  }

  toggle = (): void => {
    this.mode.update((m) => (m === 'light' ? 'dark' : 'light'))
    localStorage.setItem(THEME_KEY, this.mode())
  }

  isDark = (): boolean => this.mode() === 'dark'

  setTheme = (mode: ThemeMode): void => {
    this.mode.set(mode)
    localStorage.setItem(THEME_KEY, mode)
  }

  private applyTheme = (mode: ThemeMode): void => {
    document.body.classList.remove('light-theme', 'dark-theme')
    document.body.classList.add(`${mode}-theme`)
    document.documentElement.setAttribute('data-theme', mode)
  }
}

const readStoredTheme = (): ThemeMode => {
  const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
