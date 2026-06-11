export interface FinopsCostCenter {
  id: string
  name: string
  owner: string
  budget: number
  spent: number
  providers: string[]
}

export const FINOPS_COST_CENTERS: FinopsCostCenter[] = [
  { id: 'cc-payments', name: 'Pagos y checkout', owner: 'Equipo Payments', budget: 25000, spent: 21480, providers: ['AWS', 'GCP'] },
  { id: 'cc-analytics', name: 'Analytics y BI', owner: 'Data Platform', budget: 12000, spent: 10840, providers: ['GCP'] },
  { id: 'cc-portal', name: 'Portal cliente', owner: 'Frontend Platform', budget: 8000, spent: 5620, providers: ['Azure', 'AWS'] },
  { id: 'cc-platform', name: 'Plataforma interna', owner: 'SRE', budget: 15000, spent: 4440, providers: ['AWS', 'Azure', 'GCP'] },
]
