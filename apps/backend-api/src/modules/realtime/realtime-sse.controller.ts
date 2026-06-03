import { Controller, Get, Res, Sse } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Response } from 'express'
import { Observable, interval, map } from 'rxjs'
import { Public } from '../../common/decorators/auth.decorators'

@ApiTags('Realtime')
@Controller('realtime')
export class RealtimeSseController {
  @Public()
  @Get('stream')
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return interval(15000).pipe(
      map(
        () =>
          ({
            data: { type: 'heartbeat', at: new Date().toISOString() },
          }) as MessageEvent,
      ),
    )
  }

  @Public()
  @Get('events')
  events(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    send('connected', { ok: true })
    const timer = setInterval(() => send('heartbeat', { at: new Date().toISOString() }), 20000)
    res.on('close', () => clearInterval(timer))
  }
}
