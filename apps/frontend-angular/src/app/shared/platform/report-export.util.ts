import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BRAND_LOGO_SVG } from '../theme/brand-logo-svg.data'
import type { NavLogoKey } from '../theme/nav-logo.types'
import { slugifyFilename, downloadTextFile, triggerBlobDownload } from '../../features/infrastructure/infrastructure-report-export.util'
import { cloudMeta } from './report-cloud.util'
import { reportDocumentText, type ReportDocument } from './reports.util'

const logoToGrayscaleDataUrl = (logo: NavLogoKey, size = 96): Promise<string> => {
  const def = BRAND_LOGO_SVG[logo]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${def.viewBox}">${def.paths.map((p) => `<path d="${p.d}" fill="${p.fill}"/>`).join('')}</svg>`
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas no disponible'))
        return
      }
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const imageData = ctx.getImageData(0, 0, size, size)
      for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2]
        imageData.data[i] = gray
        imageData.data[i + 1] = gray
        imageData.data[i + 2] = gray
      }
      ctx.putImageData(imageData, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Logo no cargado'))
    }
    img.src = url
  })
}

const ensureSpace = (doc: jsPDF, y: number, need: number): number => {
  const pageH = doc.internal.pageSize.getHeight()
  if (y + need > pageH - 16) {
    doc.addPage()
    return 20
  }
  return y
}

const drawPageFooter = (pdf: jsPDF, meta: ReturnType<typeof cloudMeta>, doc: ReportDocument, pageNum: number): void => {
  const pageW = pdf.internal.pageSize.getWidth()
  const footerY = pdf.internal.pageSize.getHeight() - 10
  pdf.setDrawColor(200, 200, 200)
  pdf.setLineWidth(0.2)
  pdf.line(14, footerY - 3, pageW - 14, footerY - 3)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  pdf.setTextColor(100, 100, 100)
  pdf.text(`${doc.id} · ${meta.shortLabel} · ${doc.classification}`, 14, footerY)
  pdf.text(`Página ${pageNum}`, pageW - 14, footerY, { align: 'right' })
}

export const downloadReportTxt = (doc: ReportDocument): void => {
  const meta = cloudMeta(doc.cloud)
  const header = [
    '══════════════════════════════════════════════════════════════════════',
    `  ${meta.label.toUpperCase()}`,
    `  ${doc.title}`,
    `  Referencia: ${doc.id} · Versión ${doc.version}`,
    `  Fuente: ${meta.billingSource}`,
    '══════════════════════════════════════════════════════════════════════',
    '',
  ].join('\n')
  const filename = `${slugifyFilename(`${doc.cloud}-${doc.title}`)}.txt`
  downloadTextFile(header + reportDocumentText(doc), filename)
}

export const downloadReportPdf = async (doc: ReportDocument): Promise<void> => {
  const meta = cloudMeta(doc.cloud)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 18
  const pageW = pdf.internal.pageSize.getWidth()
  let y = 20
  let pageNum = 1

  try {
    const logoData = await logoToGrayscaleDataUrl(meta.logo, 128)
    pdf.addImage(logoData, 'PNG', margin, y - 3, 12, 12)
  } catch {
    /* sin logo */
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(30, 30, 30)
  pdf.text(meta.label, margin + 15, y + 1)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(90, 90, 90)
  pdf.text(meta.productLabel, margin + 15, y + 5)
  pdf.text(`Ref. ${doc.id}`, pageW - margin, y + 1, { align: 'right' })
  pdf.text(doc.generatedAt, pageW - margin, y + 5, { align: 'right' })
  y += 14

  pdf.setDrawColor(30, 30, 30)
  pdf.setLineWidth(0.4)
  pdf.line(margin, y, pageW - margin, y)
  y += 8

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.setTextColor(0, 0, 0)
  const titleLines = pdf.splitTextToSize(doc.title, pageW - margin * 2)
  pdf.text(titleLines, margin, y)
  y += titleLines.length * 6.5 + 3

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(60, 60, 60)
  pdf.text(doc.subtitle, margin, y)
  y += 6

  autoTable(pdf, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [40, 40, 40] },
    body: [
      ['Periodo', doc.period, 'Autor', doc.author],
      ['Versión', doc.version, 'Clasificación', doc.classification],
      ['Estado', doc.status === 'success' ? 'Completado' : doc.status === 'running' ? 'En generación' : 'Detenido', 'Tipo', doc.typeLabel],
    ],
    margin: { left: margin, right: margin },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 }, 2: { fontStyle: 'bold', cellWidth: 28 } },
  })
  y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 18
  y += 10

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(0, 0, 0)
  pdf.text('1. Resumen ejecutivo', margin, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(40, 40, 40)
  const summaryLines = pdf.splitTextToSize(doc.executiveSummary, pageW - margin * 2)
  pdf.text(summaryLines, margin, y)
  y += summaryLines.length * 4 + 8

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('2. Indicadores clave', margin, y)
  y += 4

  autoTable(pdf, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: [40, 40, 40], lineColor: [180, 180, 180], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [0, 0, 0] },
    head: [['Indicador', 'Valor', 'Detalle / variación']],
    body: doc.kpis.map((k) => [k.label, k.value, k.delta ?? '—']),
    margin: { left: margin, right: margin },
  })
  y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  y += 10

  let sectionNum = 3
  for (const section of doc.sections) {
    y = ensureSpace(pdf, y, 22)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(0, 0, 0)
    pdf.text(`${sectionNum}. ${section.title.replace(/^\d+\.\s*/, '')}`, margin, y)
    sectionNum += 1
    y += 5

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(50, 50, 50)
    for (const p of section.paragraphs) {
      const lines = pdf.splitTextToSize(p, pageW - margin * 2)
      y = ensureSpace(pdf, y, lines.length * 3.6)
      pdf.text(lines, margin, y)
      y += lines.length * 3.6 + 2.5
    }

    if (section.bullets?.length) {
      for (const b of section.bullets) {
        y = ensureSpace(pdf, y, 5)
        const lines = pdf.splitTextToSize(`— ${b}`, pageW - margin * 2 - 4)
        pdf.text(lines, margin + 3, y)
        y += lines.length * 3.6 + 1
      }
      y += 2
    }

    if (section.table) {
      autoTable(pdf, {
        startY: y,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, textColor: [40, 40, 40], lineColor: [190, 190, 190], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.2, lineColor: [0, 0, 0] },
        head: [section.table.headers],
        body: section.table.rows,
        margin: { left: margin, right: margin },
      })
      y = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 15
      y += 6
    }

    if (section.highlight) {
      y = ensureSpace(pdf, y, 14)
      pdf.setDrawColor(120, 120, 120)
      pdf.setLineWidth(0.2)
      pdf.setFillColor(255, 255, 255)
      const noteLines = pdf.splitTextToSize(section.highlight, pageW - margin * 2 - 8)
      const boxH = noteLines.length * 3.8 + 6
      pdf.rect(margin, y, pageW - margin * 2, boxH, 'FD')
      pdf.setFontSize(7.5)
      pdf.setTextColor(40, 40, 40)
      pdf.text(noteLines, margin + 4, y + 5)
      y += boxH + 4
    }
  }

  y = ensureSpace(pdf, y, 28)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(0, 0, 0)
  pdf.text(`${sectionNum}. Recomendaciones`, margin, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(50, 50, 50)
  doc.recommendations.forEach((r, i) => {
    y = ensureSpace(pdf, y, 6)
    const lines = pdf.splitTextToSize(`${i + 1}. ${r}`, pageW - margin * 2 - 4)
    pdf.text(lines, margin + 2, y)
    y += lines.length * 3.6 + 1.5
  })

  if (doc.appendix?.length) {
    y = ensureSpace(pdf, y, 18)
    y += 4
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(0, 0, 0)
    pdf.text('Anexo', margin, y)
    y += 5
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(80, 80, 80)
    doc.appendix.forEach((a) => {
      y = ensureSpace(pdf, y, 4)
      pdf.text(`· ${a}`, margin + 2, y)
      y += 3.5
    })
  }

  drawPageFooter(pdf, meta, doc, pageNum)

  const filename = `${slugifyFilename(`${doc.cloud}-${doc.title}`)}.pdf`
  triggerBlobDownload(pdf.output('blob'), filename)
}
