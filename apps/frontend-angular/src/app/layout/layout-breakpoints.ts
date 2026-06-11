/** Shared layout breakpoints — mobile ≤767, tablet 768–1023, desktop ≥1024 */
export const LAYOUT_BREAKPOINTS = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1023,
  desktopMin: 1024,
} as const

export const isMobileViewport = (): boolean =>
  typeof window !== 'undefined' && window.innerWidth <= LAYOUT_BREAKPOINTS.mobileMax

export const isTabletViewport = (): boolean =>
  typeof window !== 'undefined' &&
  window.innerWidth >= LAYOUT_BREAKPOINTS.tabletMin &&
  window.innerWidth <= LAYOUT_BREAKPOINTS.tabletMax

export const isCompactNavViewport = (): boolean =>
  typeof window !== 'undefined' && window.innerWidth <= LAYOUT_BREAKPOINTS.tabletMax
