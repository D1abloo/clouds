export interface FinopsReport {
  id: string
  name: string
  type: string
  schedule: string
  lastRun: string
  format: 'PDF' | 'CSV' | 'XLSX'
}

export const FINOPS_REPORTS: FinopsReport[] = [
  { id: 'rpt-01', name: 'Resumen ejecutivo mensual', type: 'Ejecutivo', schedule: '1er día del mes', lastRun: '2025-06-01T08:00:00Z', format: 'PDF' },
  { id: 'rpt-02', name: 'Desglose por centro de coste', type: 'Operativo', schedule: 'Semanal (lunes)', lastRun: '2025-06-09T07:00:00Z', format: 'XLSX' },
  { id: 'rpt-03', name: 'Facturas por proveedor', type: 'Financiero', schedule: 'Diario', lastRun: '2025-06-10T06:00:00Z', format: 'CSV' },
  { id: 'rpt-04', name: 'Recomendaciones de ahorro', type: 'Optimización', schedule: 'Quincenal', lastRun: '2025-06-01T10:00:00Z', format: 'PDF' },
]
