import type { IntegrationDispatchPayload, IntegrationSendResult } from './integrations.types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const sendSlack = async (
  config: Record<string, unknown>,
  event: IntegrationDispatchPayload,
  live: boolean,
): Promise<IntegrationSendResult> => {
  const webhookUrl =
    (config.webhook as string | undefined) ||
    process.env.SLACK_WEBHOOK_URL ||
    process.env.SLACK_WEBHOOK_URL_DEFAULT

  const text = `*[${event.severity?.toUpperCase() ?? 'INFO'}]* ${event.title}\n${event.body}\n_Fuente: ${event.source ?? 'CloudOps'} · ${event.eventType}_`
  const payload = {
    text,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${event.title}*` },
      },
      { type: 'section', text: { type: 'mrkdwn', text: event.body } },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `${event.eventType} · ${event.source ?? 'CloudOps'}` }],
      },
    ],
  }

  if (!live || !webhookUrl) {
    await sleep(40 + Math.random() * 80)
    return { status: 'simulated', latencyMs: 65, responsePreview: JSON.stringify(payload).slice(0, 120) }
  }

  const started = Date.now()
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const latencyMs = Date.now() - started
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      return { status: 'failed', httpStatus: res.status, latencyMs, error: errText.slice(0, 500) }
    }
    return { status: 'sent', httpStatus: res.status, latencyMs }
  } catch (err) {
    return {
      status: 'failed',
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : 'Slack delivery failed',
    }
  }
}

export const sendPagerDuty = async (
  config: Record<string, unknown>,
  event: IntegrationDispatchPayload,
  live: boolean,
): Promise<IntegrationSendResult> => {
  const routingKey =
    (config.routing_key as string | undefined) ||
    process.env.PAGERDUTY_ROUTING_KEY

  const payload = {
    routing_key: routingKey ?? 'simulated-routing-key',
    event_action: event.severity === 'critical' ? 'trigger' : 'trigger',
    payload: {
      summary: event.title,
      source: event.source ?? 'cloudops',
      severity: event.severity === 'critical' ? 'critical' : event.severity === 'warning' ? 'warning' : 'info',
      custom_details: { body: event.body, eventType: event.eventType, ...event.metadata },
    },
  }

  if (!live || !routingKey) {
    await sleep(50 + Math.random() * 100)
    return { status: 'simulated', latencyMs: 90, responsePreview: payload.payload.summary }
  }

  const started = Date.now()
  try {
    const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const latencyMs = Date.now() - started
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        status: 'failed',
        httpStatus: res.status,
        latencyMs,
        error: JSON.stringify(body).slice(0, 500),
      }
    }
    return { status: 'sent', httpStatus: res.status, latencyMs, responsePreview: (body as { message?: string }).message }
  } catch (err) {
    return {
      status: 'failed',
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : 'PagerDuty delivery failed',
    }
  }
}

export const sendJira = async (
  config: Record<string, unknown>,
  event: IntegrationDispatchPayload,
  live: boolean,
): Promise<IntegrationSendResult> => {
  const baseUrl =
    (config.base_url as string | undefined) ||
    process.env.JIRA_BASE_URL ||
    `https://${config.instance ?? 'cloudops.atlassian.net'}`
  const email = (config.email as string | undefined) || process.env.JIRA_EMAIL
  const apiToken = (config.api_token as string | undefined) || process.env.JIRA_API_TOKEN
  const projectKey = (config.project as string | undefined) || 'CLOUD'

  const issuePayload = {
    fields: {
      project: { key: projectKey },
      summary: `[CloudOps] ${event.title}`,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: `${event.body}\n\nEvento: ${event.eventType}` }],
          },
        ],
      },
      issuetype: { name: event.severity === 'critical' ? 'Bug' : 'Task' },
    },
  }

  if (!live || !email || !apiToken) {
    await sleep(60 + Math.random() * 120)
    return {
      status: 'simulated',
      latencyMs: 110,
      responsePreview: `${projectKey}: simulated issue — ${event.title}`,
    }
  }

  const started = Date.now()
  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(issuePayload),
    })
    const latencyMs = Date.now() - started
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        status: 'failed',
        httpStatus: res.status,
        latencyMs,
        error: JSON.stringify(body).slice(0, 500),
      }
    }
    const key = (body as { key?: string }).key
    return { status: 'sent', httpStatus: res.status, latencyMs, responsePreview: key }
  } catch (err) {
    return {
      status: 'failed',
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : 'Jira delivery failed',
    }
  }
}
