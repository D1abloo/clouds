export interface AlertHistoryRow {
  id: string
  severity: string
  title: string
  resource: string
  status: string
  resolvedAt: string
  duration: string
}

export interface AlertRuleRow {
  id: string
  name: string
  metric: string
  threshold: string
  severity: string
  status: string
  channels: string
}

export interface SilencedAlertRow {
  id: string
  title: string
  silencedBy: string
  until: string
  reason: string
}

export interface NotificationRouteRow {
  id: string
  channel: string
  destination: string
  severities: string
  status: string
}

export const ALERTS_HISTORY: AlertHistoryRow[] = []
export const ALERTS_RULES: AlertRuleRow[] = []
export const ALERTS_SILENCED: SilencedAlertRow[] = []
export const ALERTS_NOTIFICATIONS: NotificationRouteRow[] = []

export const severityChart = () => []
