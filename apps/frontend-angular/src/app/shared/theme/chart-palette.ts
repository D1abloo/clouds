/** Paleta viva para gráficos y métricas del panel */
export const CHART_PALETTE = [
  '#6366f1', // indigo
  '#22d3ee', // cyan
  '#a855f7', // purple
  '#f97316', // orange
  '#22c55e', // green
  '#ec4899', // pink
  '#eab308', // amber
  '#3b82f6', // blue
] as const

export const chartColor = (index: number): string =>
  CHART_PALETTE[index % CHART_PALETTE.length]
