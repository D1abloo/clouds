import { Injectable, inject, signal, OnDestroy } from '@angular/core'
import { io, Socket } from 'socket.io-client'
import { environment } from '../../../environments/environment'

export type RealtimeEvent =
  | 'inventory.updated'
  | 'sync.progress'
  | 'account.updated'
  | 'dashboard.updated'
  | 'metrics.updated'
  | 'discovery.updated'
  | 'billing.updated'
  | 'jenkins.build'
  | 'alert.created'
  | 'vps.updated'
  | 'terraform.updated'
  | 'terraform.run.progress'
  | 'terraform.run.log'

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private socket: Socket | null = null
  readonly connected = signal(false)
  readonly lastEvent = signal<{ type: RealtimeEvent; payload: unknown } | null>(null)

  connect = (): void => {
    if (this.socket?.connected) return
    const base = environment.apiUrl.replace('/api/v1', '')
    this.socket = io(`${base}/realtime`, { transports: ['websocket', 'polling'] })
    this.socket.on('connect', () => this.connected.set(true))
    this.socket.on('disconnect', () => this.connected.set(false))
    const events: RealtimeEvent[] = [
      'inventory.updated',
      'sync.progress',
      'account.updated',
      'dashboard.updated',
      'metrics.updated',
      'discovery.updated',
      'billing.updated',
      'jenkins.build',
      'alert.created',
      'vps.updated',
      'terraform.updated',
      'terraform.run.progress',
      'terraform.run.log',
    ]
    events.forEach((ev) => {
      this.socket?.on(ev, (payload: unknown) => this.lastEvent.set({ type: ev, payload }))
    })
  }

  on = (event: RealtimeEvent, handler: (payload: unknown) => void): void => {
    this.connect()
    this.socket?.on(event, handler)
  }

  off = (event: RealtimeEvent, handler?: (payload: unknown) => void): void => {
    if (handler) this.socket?.off(event, handler)
    else this.socket?.off(event)
  }

  ngOnDestroy(): void {
    this.socket?.disconnect()
    this.socket = null
  }
}
