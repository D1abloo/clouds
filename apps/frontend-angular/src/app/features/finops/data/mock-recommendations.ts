export interface FinopsRecommendation {
  id: string
  title: string
  summary: string
  savingsMonthly: number
  effort: 'bajo' | 'medio' | 'alto'
  category: string
  provider: string
}

export const FINOPS_RECOMMENDATIONS: FinopsRecommendation[] = [
  { id: 'rec-01', title: 'Rightsizing EC2 batch-worker-night', summary: 'Reducir de c6i.2xlarge a c6i.large ahorraría ~€ 280/mes con impacto mínimo.', savingsMonthly: 280, effort: 'bajo', category: 'Rightsizing', provider: 'AWS' },
  { id: 'rec-02', title: 'Comprar RI Standard 1 año', summary: '3 instancias m6i.xlarge en eu-west-1 con uso > 70 % — ahorro estimado 38 %.', savingsMonthly: 420, effort: 'medio', category: 'Reservas', provider: 'AWS' },
  { id: 'rec-03', title: 'Eliminar volumen EBS huérfano', summary: '8 volúmenes gp3 sin adjuntar desde > 90 días.', savingsMonthly: 96, effort: 'bajo', category: 'Limpieza', provider: 'AWS' },
  { id: 'rec-04', title: 'Spot para ETL GCP', summary: 'Migrar bq-etl-runner a preemptible en ventana nocturna.', savingsMonthly: 118, effort: 'medio', category: 'Arquitectura', provider: 'GCP' },
  { id: 'rec-05', title: 'Azure Hybrid Benefit', summary: '2 VMs Windows elegibles para licencia propia.', savingsMonthly: 210, effort: 'alto', category: 'Licencias', provider: 'Azure' },
]
