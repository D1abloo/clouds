export const PUB_SITE_CLASS = 'pub-site'

export const bindPublicScroll = (): (() => void) => {
  document.documentElement.classList.add(PUB_SITE_CLASS)
  document.body.classList.add(PUB_SITE_CLASS)
  return () => {
    document.documentElement.classList.remove(PUB_SITE_CLASS)
    document.body.classList.remove(PUB_SITE_CLASS)
  }
}

export const scrollPublicToTop = (): void => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

export const scrollPublicAnchor = (id: string): void => {
  const el = document.getElementById(id)
  if (!el) return
  const headerOffset = 72
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset
  window.scrollTo({ top, behavior: 'smooth' })
}
