import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { triggerBlobDownload, downloadTextFile, slugifyFilename } from '../infrastructure/infrastructure-report-export.util'
import { securitySeverityLabel } from './security.config'
import type { ComplianceReport, ComplianceViolation } from './compliance.data'

const frameworkMeta: Record<string, { label: string; color: [number, number, number]; subtitle: string }> = {
  SOC2: { label: 'SOC 2 Type II', color: [37, 99, 235], subtitle: 'AICPA Trust Services Criteria' },
  GDPR: { label: 'GDPR', color: [29, 78, 216], subtitle: 'Reglamento UE 2016/679 · Protección de datos' },
  'ISO 27001': { label: 'ISO/IEC 27001', color: [67, 56, 202], subtitle: 'Sistema de gestión de seguridad de la información' },
  FinOps: { label: 'FinOps', color: [79, 70, 229], subtitle: 'Gobernanza de costes cloud' },
}

export const buildComplianceReportText = (report: ComplianceReport, violations: ComplianceViolation[]): string => {
  const meta = frameworkMeta[report.framework] ?? { label: report.framework, color: [79, 70, 229] as [number, number, number], subtitle: '' }
  const lines = [
    '══════════════════════════════════════════════════════════════',
    '  INFORME DE CUMPLIMIENTO · CloudOps',
    `  ${meta.label}`,
    '══════════════════════════════════════════════════════════════',
    '',
    `Informe      : ${report.name}`,
    `Framework    : ${report.framework}`,
    `Periodo      : ${report.period}`,
    `Generado     : ${new Date(report.generatedAt).toLocaleString('es-ES')}`,
    `Puntuación   : ${report.score}%`,
    `Violaciones  : ${report.violationsCount}`,
    `Controles OK : ${report.passedControls} / ${report.passedControls + report.failedControls}`,
    '',
    '--- Resumen ejecutivo ---',
    report.executiveSummary,
    '',
    '--- Secciones ---',
    ...report.sections.flatMap((s) => [`• ${s.title}`, ...s.paragraphs.map((p) => `  ${p}`), '']),
    '--- Recomendaciones ---',
    ...report.recommendations.map((r, i) => `${i + 1}. ${r}`),
    '',
    '--- Violaciones relacionadas ---',
    ...violations.filter((v) => v.framework === report.framework || report.framework === 'FinOps').map(
      (v, i) => `${i + 1}. [${securitySeverityLabel(v.severity)}] ${v.rule} · ${v.resource}`,
    ),
    '',
    '--- Anexo ---',
    ...(report.appendix ?? []).map((a) => `· ${a}`),
    '',
    '[FIN DEL INFORME]',
  ]
  return lines.join('\n')
}

export const downloadComplianceReportJson = (report: ComplianceReport, violations: ComplianceViolation[]): void => {
  const payload = { exportedAt: new Date().toISOString(), report, relatedViolations: violations }
  downloadTextFile(JSON.stringify(payload, null, 2), `${slugifyFilename(report.name)}.json`, 'application/json;charset=utf-8')
}

export const downloadComplianceReportTxt = (report: ComplianceReport, violations: ComplianceViolation[]): void => {
  downloadTextFile(buildComplianceReportText(report, violations), `${slugifyFilename(report.name)}.txt`)
}

export const downloadComplianceReportPdf = async (
  report: ComplianceReport,
  violations: ComplianceViolation[],
): Promise<void> => {
  const meta = frameworkMeta[report.framework] ?? { label: report.framework, color: [79, 70, 229] as [number, number, number], subtitle: report.framework }
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 16
  const pageW = pdf.internal.pageSize.getWidth()
  let y = 18

  pdf.setFillColor(...meta.color)
  pdf.rect(margin, y - 6, pageW - margin * 2, 14, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text(meta.label, margin + 4, y + 2)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text(meta.subtitle, margin + 4, y + 6.5)
  pdf.text('CloudOps Compliance', pageW - margin - 4, y + 2, { align: 'right' })
  y += 16

  pdf.setTextColor(0, 0, 0)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  const titleLines = pdf.splitTextToSize(report.name, pageW - margin * 2)
  pdf.text(titleLines, margin, y)
  y += titleLines.length * 6 + 4

  autoTable(pdf, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.8, textColor: [40, 40, 40] },
    body: [
      ['Periodo', report.period, 'Estado', report.status === 'success' ? 'Completado' : 'En revisión'],
      ['Puntuación', `${report.score}%`, 'Violaciones', String(report.violationsCount)],
      ['Controles aprobados', String(report.passedControls), 'Controles fallidos', String(report.failedControls)],
      ['Generado', new Date(report.generatedAt).toLocaleDateString('es-ES'), 'Referencia', report.id],
    ],
    margin: { left: margin, right: margin },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38 }, 2: { fontStyle: 'bold', cellWidth: 38 } },
  })
  y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  y += 8

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text('1. Resumen ejecutivo', margin, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(50, 50, 50)
  const summaryLines = pdf.splitTextToSize(report.executiveSummary, pageW - margin * 2)
  pdf.text(summaryLines, margin, y)
  y += summaryLines.length * 4 + 8

  report.sections.forEach((section, idx) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    pdf.setTextColor(0, 0, 0)
    pdf.text(`${idx + 2}. ${section.title}`, margin, y)
    y += 5
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(50, 50, 50)
    section.paragraphs.forEach((p) => {
      const lines = pdf.splitTextToSize(p, pageW - margin * 2)
      pdf.text(lines, margin, y)
      y += lines.length * 3.8 + 2
    })
    y += 4
  })

  const related = violations.filter((v) => v.framework === report.framework)
  if (related.length) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    pdf.text('Violaciones detectadas', margin, y)
    y += 4
    autoTable(pdf, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [40, 40, 40] },
      headStyles: { fillColor: meta.color, textColor: [255, 255, 255], fontStyle: 'bold' },
      head: [['Regla', 'Recurso', 'Severidad', 'Estado']],
      body: related.map((v) => [v.rule, v.resource, securitySeverityLabel(v.severity), v.status]),
      margin: { left: margin, right: margin },
    })
    y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 15
    y += 8
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9.5)
  pdf.text('Recomendaciones', margin, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  report.recommendations.forEach((r, i) => {
    const lines = pdf.splitTextToSize(`${i + 1}. ${r}`, pageW - margin * 2)
    pdf.text(lines, margin, y)
    y += lines.length * 3.8 + 1.5
  })

  const footerY = pdf.internal.pageSize.getHeight() - 10
  pdf.setFontSize(7)
  pdf.setTextColor(120, 120, 120)
  pdf.text(`${report.id} · CloudOps · ${meta.label} · Confidencial`, margin, footerY)

  triggerBlobDownload(pdf.output('blob'), `${slugifyFilename(report.name)}.pdf`)
}
