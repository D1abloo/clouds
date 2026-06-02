import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'
import { Injectable } from '@nestjs/common'

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/realtime' })
@Injectable()
export class RealtimeGateway {
  @WebSocketServer()
  server: Server

  emitDiscoveryUpdate(hostRef: string, data: unknown) {
    this.server?.emit('discovery.updated', { hostRef, ...data as object })
  }

  emitMetricUpdate(resourceId: string, data: unknown) {
    this.server?.emit('metrics.updated', { resourceId, ...data as object })
  }

  emitAlert(alert: unknown) {
    this.server?.emit('alert.fired', alert)
  }

  emitBillingUpdate(data: unknown) {
    this.server?.emit('billing.updated', data)
  }

  emitJenkinsBuild(serverId: string, jobName: string, build: unknown) {
    this.server?.emit('jenkins.build', { serverId, jobName, build })
  }

  emitTerraformUpdate(runId: string, data: unknown) {
    this.server?.emit('terraform.updated', { runId, ...data as object })
  }

  emitDashboardUpdate(data: unknown) {
    this.server?.emit('dashboard.updated', data)
  }
}
