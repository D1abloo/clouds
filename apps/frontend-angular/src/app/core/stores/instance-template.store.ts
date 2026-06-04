import { Injectable, inject, signal } from '@angular/core'
import { TerraformService } from '../services/terraform.service'
import { CloudProvider, TerraformTemplate } from '../models/api.models'

export interface SaveTemplatePayload {
  name: string
  provider: CloudProvider
  config: Record<string, unknown>
}

@Injectable({ providedIn: 'root' })
export class InstanceTemplateStore {
  private readonly terraform = inject(TerraformService)

  private readonly _templates = signal<TerraformTemplate[]>([])
  readonly templates = this._templates.asReadonly()

  constructor() {
    this.load()
  }

  load = (): void => {
    this.terraform.listTemplates().subscribe({
      next: (list) => this._templates.set(list),
      error: () => this._templates.set([]),
    })
  }

  save = (payload: SaveTemplatePayload): void => {
    this.terraform.saveTemplate(payload.name, payload.provider, payload.config).subscribe({
      next: () => this.load(),
    })
  }
}
