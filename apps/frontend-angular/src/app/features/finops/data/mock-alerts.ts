export interface FinopsAlert {
  id: string
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  provider: string
  amount?: number
  createdAt: string
}

export const FINOPS_ALERTS: FinopsAlert[] = [
  { id: 'fa-01', title: 'Presupuesto AWS superado al 85 %', description: 'La cuenta prod-payments ha alcanzado el 87 % del presupuesto mensual.', severity: 'warning', provider: 'AWS', amount: 52200, createdAt: '2025-06-10T14:22:00Z' },
  { id: 'fa-02', title: 'Pico de coste BigQuery', description: 'Consultas ad-hoc en analytics-prod incrementaron el gasto un 340 % en 24 h.', severity: 'critical', provider: 'GCP', amount: 1840, createdAt: '2025-06-09T09:15:00Z' },
  { id: 'fa-03', title: 'Instancias sin etiquetar', description: '14 recursos sin centro de coste asignado en Azure westeurope.', severity: 'info', provider: 'Azure', createdAt: '2025-06-08T16:40:00Z' },
  { id: 'fa-04', title: 'RI próxima a expirar', description: '3 reservas EC2 expiran en menos de 14 días.', severity: 'warning', provider: 'AWS', createdAt: '2025-06-07T11:00:00Z' },
]
