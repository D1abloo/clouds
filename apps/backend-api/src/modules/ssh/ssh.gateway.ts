import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Injectable } from '@nestjs/common'
import { isDangerousCommand } from '../ssh/command-validator'

@WebSocketGateway({ namespace: '/ssh', cors: { origin: '*' } })
@Injectable()
export class SshGateway {
  @WebSocketServer()
  server: Server

  @SubscribeMessage('terminal:input')
  handleInput(@MessageBody() data: { sessionId: string; input: string }, @ConnectedSocket() client: Socket) {
    if (isDangerousCommand(data.input)) {
      client.emit('terminal:warning', { message: 'Dangerous command detected', input: data.input })
      return
    }
    // TODO: Forward to real SSH session via ssh2
    client.emit('terminal:output', { data: `[Mock SSH] ${data.input}\r\n` })
  }

  @SubscribeMessage('terminal:connect')
  handleConnect(@MessageBody() data: { vpsId: string }, @ConnectedSocket() client: Socket) {
    client.emit('terminal:status', { connected: true, vpsId: data.vpsId, message: 'Mock SSH session connected' })
  }
}
