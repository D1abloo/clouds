import { Injectable, signal } from '@angular/core'
import {
  acceptAllConsent,
  CookieConsentState,
  defaultConsent,
  readCookieConsent,
  rejectNonEssentialConsent,
  saveCookieConsent,
} from './cookie-consent.util'

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  readonly consent = signal<CookieConsentState | null>(readCookieConsent())
  readonly bannerVisible = signal(readCookieConsent() === null)
  readonly configOpen = signal(false)

  acceptAll = (): void => {
    this.consent.set(acceptAllConsent())
    this.bannerVisible.set(false)
    this.configOpen.set(false)
  }

  rejectNonEssential = (): void => {
    this.consent.set(rejectNonEssentialConsent())
    this.bannerVisible.set(false)
    this.configOpen.set(false)
  }

  openConfig = (): void => {
    this.configOpen.set(true)
  }

  closeConfig = (): void => {
    this.configOpen.set(false)
  }

  savePreferences = (prefs: Pick<CookieConsentState, 'analytics' | 'preferences' | 'marketing'>): void => {
    const state: CookieConsentState = {
      necessary: true,
      ...prefs,
      updatedAt: new Date().toISOString(),
    }
    saveCookieConsent(state)
    this.consent.set(state)
    this.bannerVisible.set(false)
    this.configOpen.set(false)
  }

  draftPreferences = (): CookieConsentState => this.consent() ?? defaultConsent()
}
