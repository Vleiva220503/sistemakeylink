// lib/generate-invoice-pdf.ts
// Client-side only — uses jsPDF to generate and auto-download a clean minimal A4 invoice
// Exactly matching the clean white layout with navy blue typography

export interface InvoiceItem {
  name: string
  sku: string
  talla?: string | null          // Categoría / Talla padre del producto (ej. "40")
  tallaDescription?: string | null // Descripción de la talla (ej. "Dama")
  quantity: number
  unitPrice: number
  discount: number        // per-line discount amount
  discountType?: 'percentage' | 'fixed' | null
  discountVal?: number
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
  deliveryAmount?: number
  customerName?: string | null
  notes?: string | null
}

// ─── Paleta limpia Mundo de Calzado ─────────────────────────────────────────
const BRAND = {
  navy:        [30, 58, 138]    as [number, number, number], // Azul Marino #1E3A8A
  textDark:    [30, 41, 59]     as [number, number, number], // Slate 800 #1E293B
  textMuted:   [100, 116, 139]  as [number, number, number], // Slate 500 #64748B
  lineBlue:    [148, 163, 184]  as [number, number, number], // Slate 400 #94A3B8 line
  tableHeadBg: [241, 245, 249]  as [number, number, number], // Slate 100 #F1F5F9
  tableBorder: [226, 232, 240]  as [number, number, number], // Slate 200 #E2E8F0
  white:       [255, 255, 255]  as [number, number, number],
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNIO(amount: number): string {
  return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function paymentLabel(method: string): string {
  switch (method) {
    case 'cash':           return 'Efectivo'
    case 'card':           return 'Tarjeta'
    case 'transfer':       return 'Transferencia'
    case 'mobile_payment': return 'Pago Móvil'
    default:               return method
  }
}

// ─── Main generator ─────────────────────────────────────────────────────────

export async function generateInvoicePDF(data: InvoiceData): Promise<void> {
  const { default: jsPDF }    = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()   // 210 mm
  const pageH  = doc.internal.pageSize.getHeight()  // 297 mm
  const margin = 18
  const contentW = pageW - margin * 2               // 174 mm

  let y = 24

  // ── 1. HEADER (Clean Minimal White) ───────────────────────────────────────
  // Left: Brand title & Tagline
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...BRAND.navy)
  doc.text('MUNDO DE CALZADO', margin, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND.textMuted)
  doc.text('Calzado', margin, y)

  y += 4.5
  doc.setFontSize(8.5)
  doc.text('Managua, Nicaragua', margin, y)

  // Right: FACTURA & Sale Details
  const rightX = pageW - margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...BRAND.navy)
  doc.text('FACTURA', rightX, 24, { align: 'right' })

  const saleNumStr = String(data.saleNumber).startsWith('VTA') || String(data.saleNumber).startsWith('#')
    ? String(data.saleNumber)
    : `#VTA-${String(data.saleNumber)}`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.textDark)
  doc.text(saleNumStr, rightX, 30, { align: 'right' })

  const dateStr = data.date.toLocaleDateString('es-NI', {
    timeZone: 'America/Managua',
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = data.date.toLocaleTimeString('es-NI', {
    timeZone: 'America/Managua',
    hour: '2-digit', minute: '2-digit',
  })
  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND.textMuted)
  doc.text(`${dateStr},`, rightX, 35, { align: 'right' })
  doc.text(timeStr, rightX, 39.5, { align: 'right' })

  // Divider Line below header
  y = 46
  doc.setDrawColor(...BRAND.lineBlue)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageW - margin, y)

  // ── 2. CLIENTE & DETALLES DE LA VENTA ─────────────────────────────────────
  y += 8
  const clientName = data.customerName?.trim() || 'Cliente Estándar'

  // Left col: CLIENTE
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.navy)
  doc.text('CLIENTE', margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.textDark)
  doc.text(clientName, margin, y + 6)

  // Right col: DETALLES DE LA VENTA
  const col2X = margin + (contentW / 2) + 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.navy)
  doc.text('DETALLES DE LA VENTA', col2X, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND.textDark)
  const metaLine = `Caja: ${data.registerName}  ·  Cajero: ${data.cashierName}  ·  Pago: ${paymentLabel(data.paymentMethod)}`
  doc.text(metaLine, col2X, y + 6)

  y += 15

  // ── 3. PRODUCT TABLE ──────────────────────────────────────────────────────
  const headRow = [
    { content: 'DESCRIPCIÓN', styles: { halign: 'left'   as const } },
    { content: 'TALLA',       styles: { halign: 'center' as const } },
    { content: 'SKU',         styles: { halign: 'center' as const } },
    { content: 'CANT.',       styles: { halign: 'center' as const } },
    { content: 'P. UNIT.',    styles: { halign: 'right'  as const } },
    { content: 'TOTAL',       styles: { halign: 'right'  as const } },
  ]

  const bodyRows = data.items.map(item => {
    const lineTotal = (item.unitPrice * item.quantity) - item.discount
    let descName = item.name
    if (item.discount > 0) {
      const detailStr = item.discountType === 'percentage' ? `${item.discountVal}%` : formatNIO(item.discount)
      descName += ` (Desc. ${detailStr})`
    }
    const tallaVal = item.talla || (item as any).size || '—'

    return [
      { content: descName,                                  styles: { halign: 'left'   as const } },
      { content: tallaVal,                                  styles: { halign: 'center' as const } },
      { content: item.sku,                                  styles: { halign: 'center' as const, textColor: BRAND.textMuted } },
      { content: String(item.quantity),                     styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
      { content: formatNIO(item.unitPrice),                 styles: { halign: 'right'  as const } },
      { content: formatNIO(lineTotal),                      styles: { halign: 'right'  as const } },
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [headRow],
    body: bodyRows,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      textColor: BRAND.textDark,
      lineColor: BRAND.tableBorder,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: BRAND.tableHeadBg,
      textColor: BRAND.navy,
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: BRAND.white,
    },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 20 },
      2: { cellWidth: 32 },
      3: { cellWidth: 16 },
      4: { cellWidth: 24 },
      5: { cellWidth: 'auto' as const },
    },
  })

  // ── 4. RESUMEN DE TOTALES ─────────────────────────────────────────────────
  let finalY = (doc as any).lastAutoTable.finalY + 6
  const totalsX = pageW - margin

  // Subtotal
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND.textMuted)
  doc.text('Subtotal', totalsX - 52, finalY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND.navy)
  doc.text(formatNIO(data.subtotal), totalsX, finalY, { align: 'right' })

  // Discount (if any)
  if (data.discountTotal > 0) {
    finalY += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(220, 38, 38)
    doc.text('Descuentos', totalsX - 52, finalY)
    doc.setFont('helvetica', 'bold')
    doc.text(`- ${formatNIO(data.discountTotal)}`, totalsX, finalY, { align: 'right' })
  }

  // Delivery (if any)
  if (data.deliveryAmount && data.deliveryAmount > 0) {
    finalY += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.textMuted)
    doc.text('Delivery', totalsX - 52, finalY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND.navy)
    doc.text(`+ ${formatNIO(data.deliveryAmount)}`, totalsX, finalY, { align: 'right' })
  }

  // Line above TOTAL
  finalY += 8
  doc.setDrawColor(...BRAND.lineBlue)
  doc.setLineWidth(0.6)
  doc.line(margin, finalY, pageW - margin, finalY)

  // TOTAL
  finalY += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BRAND.navy)
  doc.text('TOTAL', margin + 70, finalY)
  doc.setFontSize(12)
  doc.text(formatNIO(data.total), totalsX, finalY, { align: 'right' })

  // Divider Line above footer
  finalY += 14
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(margin, finalY, pageW - margin, finalY)

  // ── 5. FOOTER (Clean Thank You Message) ───────────────────────────────────
  finalY += 8

  const shortFirstName = clientName !== 'Cliente Estándar' ? clientName.split(' ')[0] : ''
  const thankMsg = shortFirstName
    ? `¡Gracias por su preferencia, ${shortFirstName}!`
    : `¡Gracias por su preferencia!`

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...BRAND.navy)
  doc.text(thankMsg, pageW / 2, finalY, { align: 'center' })

  finalY += 4.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.textMuted)
  doc.text('No se aceptan devoluciones', pageW / 2, finalY, { align: 'center' })

  // ── 6. SAVE ───────────────────────────────────────────────────────────────
  const filename = `Factura_${String(data.saleNumber).replace(/\//g, '-')}_${
    data.date.toISOString().slice(0, 10)
  }.pdf`

  doc.save(filename)
}

