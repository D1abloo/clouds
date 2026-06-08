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
