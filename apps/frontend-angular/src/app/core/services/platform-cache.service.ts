import { Injectable, inject } from '@angular/core'
import { CloudCatalogCacheService } from './cloud-catalog-cache.service'
import { CloudPageCacheService } from './cloud-page-cache.service'

/** Invalida cachés en memoria del panel (cloud, catálogo) para forzar datos en vivo en PRO. */
@Injectable({ providedIn: 'root' })
export class PlatformCacheService {
  private readonly cloudPage = inject(CloudPageCacheService)
  private readonly cloudCatalog = inject(CloudCatalogCacheService)

  clearAll = (): void => {
    this.cloudPage.invalidate()
    this.cloudCatalog.clearAll()
  }
}
