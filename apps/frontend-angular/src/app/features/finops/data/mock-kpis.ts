export interface FinopsKpi {
  id: string
  label: string
  value: string
  delta: string
  trend: 'up' | 'down' | 'flat'
  tone: 'savings' | 'overcost' | 'neutral' | 'electric'
  icon: string
}

export const FINOPS_KPIS: FinopsKpi[] = [
  { id: 'mtd', label: 'Gasto MTD', value: '€ 42.380', delta: '+8,2 % vs mes anterior', trend: 'up', tone: 'overcost', icon: 'payments' },
  { id: 'forecast', label: 'Previsión fin de mes', value: '€ 58.920', delta: 'Basado en tendencia 14 días', trend: 'up', tone: 'neutral', icon: 'trending_up' },
  { id: 'savings', label: 'Ahorro potencial', value: '€ 6.140', delta: '12 recomendaciones activas', trend: 'down', tone: 'savings', icon: 'savings' },
  { id: 'waste', label: 'Recursos ociosos', value: '23 instancias', delta: '€ 1.890 / mes estimado', trend: 'flat', tone: 'overcost', icon: 'dns' },
  { id: 'budget', label: 'Uso de presupuesto', value: '71 %', delta: 'Presupuesto € 60.000', trend: 'up', tone: 'electric', icon: 'account_balance' },
  { id: 'ri', label: 'Cobertura RI/SP', value: '64 %', delta: '+3 pp este trimestre', trend: 'up', tone: 'savings', icon: 'verified' },
]
