import { Injectable, inject } from '@angular/core'
import { Meta, Title } from '@angular/platform-browser'

export type PublicSeo = {
  title: string
  description: string
  path?: string
}

@Injectable({ providedIn: 'root' })
export class PublicSeoService {
  private readonly title = inject(Title)
  private readonly meta = inject(Meta)
  private readonly baseUrl = 'https://spendlyx.com'

  apply = (seo: PublicSeo): void => {
    const fullTitle = seo.title.includes('Spendlyx') ? seo.title : `${seo.title} | Spendlyx`
    this.title.setTitle(fullTitle)
    this.meta.updateTag({ name: 'description', content: seo.description })
    this.meta.updateTag({ property: 'og:title', content: fullTitle })
    this.meta.updateTag({ property: 'og:description', content: seo.description })
    this.meta.updateTag({ property: 'og:type', content: 'website' })
    if (seo.path) {
      this.meta.updateTag({ property: 'og:url', content: `${this.baseUrl}${seo.path}` })
      this.updateCanonical(seo.path)
    }
  }

  private updateCanonical = (path: string): void => {
    const href = `${this.baseUrl}${path}`
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    link.setAttribute('href', href)
  }
}
