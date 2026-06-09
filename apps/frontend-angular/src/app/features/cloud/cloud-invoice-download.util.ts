import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fmtUsd, type CloudBillingRow, type CloudProviderUiConfig } from './cloud-provider.data'

const STATUS_LABELS: Record<NonNullable<CloudBillingRow['invoiceStatus']>, string> = {
  paid: 'Pagada',
  pending: 'Pendiente',
  open: 'Abierta',
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const buildInvoiceFilename = (invoice: CloudBillingRow, ext = 'pdf'): string => {
  const id = invoice.invoiceId ?? invoice.id ?? 'factura'
  const service = slugify(invoice.service)
  return `${id}-${service}.${ext}`
}

const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const appendInvoiceToPdf = (doc: jsPDF, invoice: CloudBillingRow, provider: CloudProviderUiConfig, pageBreak: boolean): void => {
  if (pageBreak) doc.addPage()

  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 30, 30)
  doc.text('Factura de servicio cloud', margin, y)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(provider.title, pageWidth - margin, y - 2, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(20, 20, 20)
  doc.text(invoice.service, margin, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`Nº factura: ${invoice.invoiceId ?? '—'}`, margin, y)
  doc.text(`Estado: ${STATUS_LABELS[invoice.invoiceStatus ?? 'open']}`, pageWidth / 2, y)
  doc.text(`Periodo: ${invoice.period ?? 'MTD'}`, pageWidth - margin, y, { align: 'right' })
  y += 10

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [245, 245, 245], textColor: [80, 80, 80], fontStyle: 'bold' },
    head: [['Campo', 'Valor']],
    body: [
      ['Proveedor', provider.provider],
      ['Cuenta', `${invoice.accountName ?? '—'} (${invoice.linkedAccount ?? '—'})`],
      ['Emisión', invoice.issuedAt ?? '—'],
      ['Vencimiento', invoice.dueAt ?? '—'],
      ['Contacto', invoice.billingContact ?? '—'],
      ['Método de pago', invoice.paymentMethod ?? '—'],
      ['Centro de coste', invoice.costCenter ?? '—'],
      ['SKU', invoice.sku ?? '—'],
      ['Moneda', invoice.currency ?? 'USD'],
    ],
    margin: { left: margin, right: margin },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40
  y += 6

  if (invoice.description) {
    doc.setFontSize(8)
    doc.setTextColor(90, 90, 90)
    const descLines = doc.splitTextToSize(invoice.description, pageWidth - margin * 2)
    doc.text(descLines, margin, y)
    y += descLines.length * 4 + 4
  }

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [255, 153, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['#', 'Concepto', 'Recurso', 'Región', 'Tipo uso', 'Cant.', 'P. unit.', 'Importe']],
    body: (invoice.lineItems ?? []).map((line, i) => [
      String(i + 1),
      line.description,
      line.resourceId ?? '—',
      line.region,
      line.usageType ?? '—',
      line.quantity,
      fmtUsd(line.unitPrice),
      fmtUsd(line.amount),
    ]),
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 8 },
      7: { halign: 'right' },
    },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 50
  y += 8

  const summaryX = pageWidth - margin - 70
  doc.setDrawColor(220, 220, 220)
  doc.setFillColor(252, 248, 242)
  doc.roundedRect(summaryX, y, 70, 42, 2, 2, 'FD')

  doc.setFontSize(8)
  doc.setTextColor(60, 60, 60)
  const summaryRows: [string, string][] = [
    ['Subtotal', fmtUsd(invoice.subtotal ?? invoice.cost)],
  ]
  if (invoice.discount) summaryRows.push(['Descuento RI/SP', `-${fmtUsd(invoice.discount)}`])
  if (invoice.credits) summaryRows.push(['Créditos', `-${fmtUsd(invoice.credits)}`])
  summaryRows.push(['Impuestos', fmtUsd(invoice.tax ?? 0)])

  let summaryY = y + 7
  summaryRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal')
    doc.text(label, summaryX + 4, summaryY)
    doc.text(value, summaryX + 66, summaryY, { align: 'right' })
    summaryY += 5
  })

  doc.setDrawColor(200, 200, 200)
  doc.line(summaryX + 4, summaryY, summaryX + 66, summaryY)
  summaryY += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(194, 65, 12)
  doc.text('Total a pagar', summaryX + 4, summaryY)
  doc.text(fmtUsd(invoice.total ?? invoice.cost), summaryX + 66, summaryY, { align: 'right' })

  if (invoice.notes) {
    y += 52
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(110, 110, 110)
    doc.text('Notas:', margin, y)
    const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - margin * 2)
    doc.text(noteLines, margin, y + 4)
  }

  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Generado por CloudOps · ${new Date().toLocaleString('es-ES')} · ${invoice.share ?? 0}% del gasto cloud`,
    margin,
    doc.internal.pageSize.getHeight() - 8,
  )
}

export const downloadCloudInvoicePdf = (invoice: CloudBillingRow, provider: CloudProviderUiConfig): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  appendInvoiceToPdf(doc, invoice, provider, false)
  triggerBlobDownload(doc.output('blob'), buildInvoiceFilename(invoice))
}

export const downloadAllCloudInvoicesPdf = (invoices: CloudBillingRow[], provider: CloudProviderUiConfig): string => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  invoices.forEach((invoice, index) => {
    appendInvoiceToPdf(doc, invoice, provider, index > 0)
  })
  const filename = `facturas-${provider.slug}-${new Date().toISOString().slice(0, 10)}.pdf`
  triggerBlobDownload(doc.output('blob'), filename)
  return filename
}
