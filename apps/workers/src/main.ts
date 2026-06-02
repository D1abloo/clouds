/**
 * CloudOps background workers entrypoint.
 * Stubs for Phase 13–14; wire to Redis queues / API in later phases.
 */

const log = (worker: string, message: string) => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), worker, message }))
}

export abstract class BaseWorker {
  protected running = false
  protected intervalMs: number

  constructor(
    protected readonly name: string,
    intervalMs: number,
  ) {
    this.intervalMs = intervalMs
  }

  abstract tick(): Promise<void>

  start(): void {
    if (this.running) return
    this.running = true
    log(this.name, 'started')
    void this.loop()
  }

  stop(): void {
    this.running = false
    log(this.name, 'stopped')
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        await this.tick()
      } catch (err) {
        log(this.name, `tick error: ${err instanceof Error ? err.message : String(err)}`)
      }
      await new Promise((resolve) => setTimeout(resolve, this.intervalMs))
    }
  }
}

export class DiscoveryWorker extends BaseWorker {
  constructor() {
    const ms = Number(process.env.WORKERS_DISCOVERY_INTERVAL_MS ?? 60_000)
    super('DiscoveryWorker', ms)
  }

  async tick(): Promise<void> {
    log(this.name, 'scan docker/k8s/system (stub)')
  }
}

export class MetricsCollector extends BaseWorker {
  constructor() {
    const ms = Number(process.env.WORKERS_METRICS_INTERVAL_MS ?? 30_000)
    super('MetricsCollector', ms)
  }

  async tick(): Promise<void> {
    log(this.name, 'collect metrics (stub)')
  }
}

export class BillingSyncWorker extends BaseWorker {
  constructor() {
    const ms = Number(process.env.WORKERS_BILLING_SYNC_INTERVAL_MS ?? 3_600_000)
    super('BillingSyncWorker', ms)
  }

  async tick(): Promise<void> {
    log(this.name, 'sync billing data (stub)')
  }
}

const workers: BaseWorker[] = [
  new DiscoveryWorker(),
  new MetricsCollector(),
  new BillingSyncWorker(),
]

const shutdown = () => {
  workers.forEach((w) => w.stop())
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

log('workers', `starting ${workers.length} worker(s)`)
workers.forEach((w) => w.start())
