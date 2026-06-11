import { Injectable, inject } from '@angular/core'
import { ApiClientService } from '../../core/services/api-client.service'

export type RegisterPayload = {
  firstName: string
  lastName: string
  company: string
  email: string
  password: string
  acceptTerms: boolean
  acceptPrivacy: boolean
  marketingConsent?: boolean
  website?: string
}

export type PublicStats = {
  organizations: number
  users: number
  cloudAccounts: { aws: number; gcp: number; azure: number; total: number }
  activeInstances: number
  totalInstances: number
  uptimePercent: string
  updatedAt: string
}

export type ContactPayload = {
  name: string
  email: string
  subject: string
  reason: string
  message: string
  website?: string
}

@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private readonly api = inject(ApiClientService)

  register = (payload: RegisterPayload) =>
    this.api.post<{ message: string; email: string; expiresInHours: number }>(
      'public/register',
      payload,
    )

  verifyEmail = (token: string) =>
    this.api.get<{ verified?: boolean; alreadyVerified?: boolean; email: string }>(
      `public/verify-email?token=${encodeURIComponent(token)}`,
    )

  resendVerification = (email: string) =>
    this.api.post<{ sent: boolean; message: string }>('public/resend-verification', { email })

  contact = (payload: ContactPayload) =>
    this.api.post<{ message: string }>('public/contact', payload)

  getStats = () => this.api.get<PublicStats>('public/stats')
}
