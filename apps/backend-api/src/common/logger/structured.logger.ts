import { Injectable, LoggerService } from '@nestjs/common'

@Injectable()
export class StructuredLogger implements LoggerService {
  private format(level: string, message: unknown, context?: string) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      context: context ?? 'App',
      message: typeof message === 'string' ? message : JSON.stringify(message),
    })
  }

  log(message: unknown, context?: string) {
    console.log(this.format('info', message, context))
  }

  error(message: unknown, trace?: string, context?: string) {
    console.error(this.format('error', { message, trace }, context))
  }

  warn(message: unknown, context?: string) {
    console.warn(this.format('warn', message, context))
  }

  debug(message: unknown, context?: string) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(this.format('debug', message, context))
    }
  }

  verbose(message: unknown, context?: string) {
    this.debug(message, context)
  }
}
