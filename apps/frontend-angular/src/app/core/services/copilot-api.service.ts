import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import { ApiClientService } from './api-client.service'
import type {
  CopilotChatResponse,
  CopilotSettings,
  CopilotStatus,
  CopilotTask,
  UpdateCopilotSettingsPayload,
} from '../models/api.models'

@Injectable({ providedIn: 'root' })
export class CopilotApiService {
  private readonly api = inject(ApiClientService)

  getStatus(): Observable<CopilotStatus> {
    return this.api.get<CopilotStatus>('copilot/status')
  }

  getSettings(): Observable<CopilotSettings> {
    return this.api.get<CopilotSettings>('copilot/settings')
  }

  updateSettings(payload: UpdateCopilotSettingsPayload): Observable<CopilotSettings> {
    return this.api.put<CopilotSettings>('copilot/settings', payload)
  }

  testConnection(): Observable<{ ok: boolean; message: string }> {
    return this.api.post<{ ok: boolean; message: string }>('copilot/settings/test')
  }

  chat(message: string, threadId?: string): Observable<CopilotChatResponse> {
    return this.api.post<CopilotChatResponse>('copilot/chat', { message, threadId })
  }

  createTask(prompt: string): Observable<CopilotTask> {
    return this.api.post<CopilotTask>('copilot/tasks', { prompt })
  }

  listTasks(): Observable<CopilotTask[]> {
    return this.api.get<CopilotTask[]>('copilot/tasks')
  }
}
