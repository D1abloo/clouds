export type SidebarRow = {
  section: string
  label: string
  route: string
  pageStatus: 'OK' | 'WARN' | 'FAIL'
  uiStatus: 'OK' | 'WARN' | 'FAIL'
  demoStatus: 'OK' | 'WARN' | 'FAIL'
  proStatus: 'OK' | 'WARN' | 'FAIL'
  notes: string
}

export type SchemaRow = {
  table: string
  prismaModel: string | null
  status: 'OK' | 'PARTIAL' | 'MISSING'
}

export type QualityCheckRow = {
  command: string
  ok: boolean
  durationMs: number
  stderr: string
}

export type LogoRow = {
  brand: string
  status: 'OK' | 'MISSING' | 'WARN'
  notes: string
}

export type VerificationReport = {
  generatedAt: string
  recommendation: 'READY_FOR_PRO' | 'NOT_READY_FOR_PRO'
  executiveSummary: string
  sidebar: SidebarRow[]
  apiCoverage: Record<string, boolean>
  schema: SchemaRow[]
  loginSummary: string
  logos: LogoRow[]
  qualityChecks: QualityCheckRow[]
  missing: string[]
  risks: string[]
  fixed: string[]
}

export type ToolTextResult = { content: { type: 'text'; text: string }[] }

export const jsonResult = (data: unknown): ToolTextResult => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
})
