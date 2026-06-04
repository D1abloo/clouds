/** Paleta viva para gráficos y métricas del panel */
export const CHART_PALETTE = [
  'var(--chart-vivid-1, #6366f1)',
  'var(--chart-vivid-2, #22d3ee)',
  'var(--chart-vivid-3, #a855f7)',
  'var(--chart-vivid-4, #f97316)',
  'var(--chart-vivid-5, #22c55e)',
  'var(--chart-vivid-6, #ec4899)',
  'var(--chart-vivid-7, #eab308)',
  'var(--chart-vivid-8, #3b82f6)',
] as const

export const chartColor = (index: number): string =>
  CHART_PALETTE[index % CHART_PALETTE.length]
