export type CookieCategory = 'necessary' | 'analytics' | 'preferences' | 'marketing'

export type CookieConsentState = {
  necessary: true
  analytics: boolean
  preferences: boolean
  marketing: boolean
  updatedAt: string
}

const STORAGE_KEY = 'spendlyx_cookie_consent'

export const defaultConsent = (): CookieConsentState => ({
  necessary: true,
  analytics: false,
  preferences: false,
  marketing: false,
  updatedAt: new Date().toISOString(),
})

export const readCookieConsent = (): CookieConsentState | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CookieConsentState
  } catch {
    return null
  }
}

export const saveCookieConsent = (state: CookieConsentState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const acceptAllConsent = (): CookieConsentState => {
  const state: CookieConsentState = {
    necessary: true,
    analytics: true,
    preferences: true,
    marketing: true,
    updatedAt: new Date().toISOString(),
  }
  saveCookieConsent(state)
  return state
}

export const rejectNonEssentialConsent = (): CookieConsentState => {
  const state = defaultConsent()
  saveCookieConsent(state)
  return state
}
