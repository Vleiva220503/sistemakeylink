// lib/generate-invoice-pdf.ts
// Client-side only — uses jsPDF to generate and auto-download a professional A4 invoice
// Import from 'jspdf' and 'jspdf-autotable' which are installed as regular dependencies

export interface InvoiceItem {
  name: string
  sku: string
  quantity: number
  unitPrice: number
  discount: number // per-line discount amount
}

export interface InvoiceData {
  saleNumber: string | number
  date: Date
  registerName: string
  cashierName: string
  paymentMethod: 'cash' | 'card' | string
  items: InvoiceItem[]
  subtotal: number
  discountTotal: number
  total: number
  customerName?: string | null
  notes?: string | null
}

// Colores corporativos Mundo de Calzado — Naranja Quemado #E04B16 + Crema #F7F5F0
const BRAND = {
  primary: [26, 25, 23] as [number, number, number],        // Charcoal casi negro #1A1917
  accent: [224, 75, 22] as [number, number, number],        // Naranja Quemado #E04B16 (primary)
  accentLight: [254, 236, 227] as [number, number, number], // Naranja muy claro (tint 10%)
  gray: [110, 106, 99] as [number, number, number],         // Warm Taupe #6E6A63
  lightGray: [247, 245, 240] as [number, number, number],   // Crema cálido #F7F5F0
  white: [255, 255, 255] as [number, number, number],
  border: [224, 220, 211] as [number, number, number],      // Warm Oat Border #E0DCD3
  text: [26, 25, 23] as [number, number, number],           // Charcoal #1A1917
}

function formatHNL(amount: number): string {
  return `L ${amount.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function paymentLabel(method: string): string {
  switch (method) {
    case 'cash': return 'Efectivo'
    case 'card': return 'Tarjeta'
    case 'transfer': return 'Transferencia'
    case 'mobile_payment': return 'Pago Móvil'
    default: return method
  }
}

export async function generateInvoicePDF(data: InvoiceData): Promise<void> {
  // Dynamic import to avoid SSR issues — jsPDF is browser-only
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()  // 210mm
  const margin = 18
  const contentW = pageW - margin * 2

  // ─── HEADER BLOCK ──────────────────────────────────────────────────────────
  // Dark header band
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 0, pageW, 42, 'F')

  // Accent left bar
  doc.setFillColor(...BRAND.accent)
  doc.rect(0, 0, 6, 42, 'F')

  // Brand name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...BRAND.white)
  doc.text('MUNDO DE CALZADO', margin + 4, 16)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.accentLight)
  doc.text('Calzado · Ropa · Accesorios', margin + 4, 22)

  // Contact info (right side of header)
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.accentLight)
  const contactLines = [
    'Honduras',
    'Calzado · Ropa · Accesorios',
  ]
  contactLines.forEach((line, i) => {
    doc.text(line, pageW - margin, 14 + i * 5.5, { align: 'right' })
  })

  // FACTURA label — right side of header, bottom
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BRAND.white)
  doc.text('FACTURA', pageW - margin, 33, { align: 'right' })

  // ─── INVOICE META BOX ──────────────────────────────────────────────────────
  let y = 50

  // Two-column meta layout
  const col1x = margin
  const col2x = pageW / 2 + 4

  // Left meta box — invoice number & date
  doc.setFillColor(...BRAND.lightGray)
  doc.roundedRect(col1x, y, contentW / 2 - 4, 30, 2, 2, 'F')
  doc.setDrawColor(...BRAND.border)
  doc.roundedRect(col1x, y, contentW / 2 - 4, 30, 2, 2, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...BRAND.gray)
  doc.text('N° DE FACTURA', col1x + 6, y + 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...BRAND.accent)
  doc.text(`#${data.saleNumber}`, col1x + 6, y + 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.text)
  const dateStr = data.date.toLocaleDateString('es-HN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
  doc.text(dateStr, col1x + 6, y + 24)

  // Right meta box — register / cashier / payment
  doc.setFillColor(...BRAND.lightGray)
  doc.roundedRect(col2x, y, contentW / 2 - 4, 30, 2, 2, 'F')
  doc.setDrawColor(...BRAND.border)
  doc.roundedRect(col2x, y, contentW / 2 - 4, 30, 2, 2, 'S')

  const metaRight = [
    ['CAJA', data.registerName],
    ['CAJERO', data.cashierName],
    ['PAGO', paymentLabel(data.paymentMethod)],
  ]
  metaRight.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...BRAND.gray)
    doc.text(label, col2x + 6, y + 7 + i * 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.text)
    doc.text(value, col2x + 6 + 22, y + 7 + i * 8)
  })

  y += 36

  // Customer row (if available)
  if (data.customerName) {
    doc.setFillColor(...BRAND.accentLight)
    doc.roundedRect(col1x, y, contentW, 10, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...BRAND.accent)
    doc.text('CLIENTE:', col1x + 6, y + 6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.text)
    doc.text(data.customerName, col1x + 26, y + 6.5)
    y += 14
  } else {
    y += 4
  }

  // ─── ITEMS TABLE ───────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [[
      { content: 'DESCRIPCIÓN', styles: { halign: 'left' } },
      { content: 'SKU', styles: { halign: 'left' } },
      { content: 'CANT.', styles: { halign: 'center' } },
      { content: 'P. UNIT.', styles: { halign: 'right' } },
      { content: 'DESCUENTO', styles: { halign: 'right' } },
      { content: 'TOTAL', styles: { halign: 'right' } },
    ]],
    body: data.items.map(item => {
      const lineTotal = (item.unitPrice * item.quantity) - item.discount
      return [
        { content: item.name, styles: { halign: 'left', fontStyle: 'normal' } },
        { content: item.sku, styles: { halign: 'left', textColor: BRAND.gray, fontStyle: 'normal', fontSize: 7 } },
        { content: String(item.quantity), styles: { halign: 'center' } },
        { content: formatHNL(item.unitPrice), styles: { halign: 'right' } },
        { content: item.discount > 0 ? formatHNL(item.discount) : '—', styles: { halign: 'right', textColor: item.discount > 0 ? [220, 38, 38] : BRAND.gray } },
        { content: formatHNL(lineTotal), styles: { halign: 'right', fontStyle: 'bold' } },
      ]
    }),
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
    },
    alternateRowStyles: {
      fillColor: BRAND.lightGray,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 28 },
      2: { cellWidth: 16 },
      3: { cellWidth: 28 },
      4: { cellWidth: 26 },
      5: { cellWidth: 'auto' },
    },
  })

  // ─── TOTALS BLOCK ──────────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 6
  const totalsX = pageW - margin - 72
  const totalsW = 72

  // Subtotal row
  if (data.discountTotal > 0) {
    doc.setFillColor(...BRAND.lightGray)
    doc.rect(totalsX, finalY, totalsW, 8, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.gray)
    doc.text('Subtotal', totalsX + 5, finalY + 5.5)
    doc.text(formatHNL(data.subtotal), totalsX + totalsW - 5, finalY + 5.5, { align: 'right' })

    doc.setFillColor(...BRAND.lightGray)
    doc.rect(totalsX, finalY + 8, totalsW, 8, 'F')
    doc.setTextColor([220, 38, 38] as unknown as string)
    doc.text('Descuento', totalsX + 5, finalY + 13.5)
    doc.text(`- ${formatHNL(data.discountTotal)}`, totalsX + totalsW - 5, finalY + 13.5, { align: 'right' })

    // Total row
    doc.setFillColor(...BRAND.accent)
    doc.rect(totalsX, finalY + 16, totalsW, 11, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BRAND.white)
    doc.text('TOTAL', totalsX + 5, finalY + 23)
    doc.text(formatHNL(data.total), totalsX + totalsW - 5, finalY + 23, { align: 'right' })
  } else {
    // No discount — just total
    doc.setFillColor(...BRAND.lightGray)
    doc.rect(totalsX, finalY, totalsW, 8, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.gray)
    doc.text('Subtotal', totalsX + 5, finalY + 5.5)
    doc.text(formatHNL(data.subtotal), totalsX + totalsW - 5, finalY + 5.5, { align: 'right' })

    doc.setFillColor(...BRAND.accent)
    doc.rect(totalsX, finalY + 8, totalsW, 11, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BRAND.white)
    doc.text('TOTAL', totalsX + 5, finalY + 15)
    doc.text(formatHNL(data.total), totalsX + totalsW - 5, finalY + 15, { align: 'right' })
  }

  // Payment method badge
  const badgeY = data.discountTotal > 0 ? finalY + 29 : finalY + 21
  doc.setFillColor(...BRAND.accentLight)
  doc.roundedRect(totalsX, badgeY, totalsW, 8, 2, 2, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.accent)
  doc.text(`Pagado con: ${paymentLabel(data.paymentMethod)}`, totalsX + totalsW / 2, badgeY + 5.3, { align: 'center' })

  // ─── NOTES ─────────────────────────────────────────────────────────────────
  if (data.notes) {
    const notesY = badgeY + 14
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...BRAND.gray)
    doc.text('Notas:', margin, notesY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...BRAND.text)
    doc.text(data.notes, margin + 14, notesY)
  }

  // ─── FOOTER ────────────────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 18
  doc.setDrawColor(...BRAND.border)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY, pageW - margin, footerY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND.accent)
  doc.text('¡Gracias por su compra!', pageW / 2, footerY + 5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...BRAND.gray)
  doc.text('Mundo de Calzado · Calzado, Ropa y Accesorios · Honduras', pageW / 2, footerY + 10, { align: 'center' })

  // ─── SAVE ──────────────────────────────────────────────────────────────────
  const filename = `Factura_${String(data.saleNumber).replace(/\//g, '-')}_${
    data.date.toISOString().slice(0, 10)
  }.pdf`

  doc.save(filename)
}
