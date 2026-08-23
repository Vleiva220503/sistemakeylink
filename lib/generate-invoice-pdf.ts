// lib/generate-invoice-pdf.ts
// Client-side only — uses jsPDF to generate and auto-download a professional A4 invoice
// Import from 'jspdf' and 'jspdf-autotable' which are installed as regular dependencies

export interface InvoiceItem {
  name: string
  sku: string
  talla?: string | null          // Categoría / Talla padre del producto (ej. "40")
  tallaDescription?: string | null // Descripción de la talla (ej. "Dama")
  quantity: number
  unitPrice: number
  discount: number        // per-line discount amount
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

// ─── Paleta corporativa Mundo de Calzado ────────────────────────────────────
const BRAND = {
  primary:     [26, 25, 23]     as [number, number, number], // Charcoal #1A1917
  accent:      [224, 75, 22]    as [number, number, number], // Naranja Quemado #E04B16
  accentLight: [254, 236, 227]  as [number, number, number], // Naranja tint claro
  accentMid:   [240, 130, 90]   as [number, number, number], // Naranja medio para subheader strip
  gray:        [110, 106, 99]   as [number, number, number], // Warm Taupe
  lightGray:   [247, 245, 240]  as [number, number, number], // Crema cálido
  white:       [255, 255, 255]  as [number, number, number],
  border:      [224, 220, 211]  as [number, number, number], // Warm Oat Border
  text:        [26, 25, 23]     as [number, number, number], // Charcoal
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Formatea montos en Córdobas nicaragüenses (C$) */
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
  const margin = 16
  const contentW = pageW - margin * 2               // 178 mm

  // ─── HEADER BAND (full-width dark block) ──────────────────────────────────
  const headerH = 52
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 0, pageW, headerH, 'F')

  // Naranja left accent bar (thick)
  doc.setFillColor(...BRAND.accent)
  doc.rect(0, 0, 8, headerH, 'F')

  // ── Left column: brand identity ──────────────────────────────────────────
  const leftX = margin + 2

  // "MUNDO DE CALZADO" — elemento más grande y prominente
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...BRAND.white)
  doc.text('MUNDO DE CALZADO', leftX, 18)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...BRAND.accentLight)
  doc.text('Calzado · Ropa · Accesorios', leftX, 26)

  // Ubicación
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.gray)
  doc.text('Managua, Nicaragua', leftX, 32.5)

  // ── Right column: invoice metadata ────────────────────────────────────────
  const rightX = pageW - margin

  // FACTURA label + número
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.accentLight)
  doc.text('FACTURA', rightX, 10, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...BRAND.accent)
  doc.text(`#${data.saleNumber}`, rightX, 21, { align: 'right' })

  // Fecha
  const dateStr = data.date.toLocaleDateString('es-NI', {
    timeZone: 'America/Managua',
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = data.date.toLocaleTimeString('es-NI', {
    timeZone: 'America/Managua',
    hour: '2-digit', minute: '2-digit',
  })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.white)
  doc.text(`${dateStr}  ${timeStr}`, rightX, 29, { align: 'right' })

  // Caja · Cajero · Pago — inline right
  const meta = `Caja: ${data.registerName}  ·  Cajero: ${data.cashierName}  ·  Pago: ${paymentLabel(data.paymentMethod)}`
  doc.setFontSize(7)
  doc.setTextColor(...BRAND.accentLight)
  doc.text(meta, rightX, 36, { align: 'right' })

  // ── Acento naranja narrow strip debajo del header ─────────────────────────
  doc.setFillColor(...BRAND.accent)
  doc.rect(0, headerH, pageW, 2.5, 'F')

  // ─── CUSTOMER ROW ─────────────────────────────────────────────────────────
  let y = headerH + 8

  if (data.customerName) {
    doc.setFillColor(...BRAND.accentLight)
    doc.roundedRect(margin, y, contentW, 9, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...BRAND.accent)
    doc.text('CLIENTE:', margin + 5, y + 5.8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.text)
    doc.text(data.customerName, margin + 24, y + 5.8)
    y += 13
  } else {
    y += 2
  }

  // ─── ITEMS TABLE ──────────────────────────────────────────────────────────
  // Determine if any item has a talla defined
  const hasTalla = data.items.some(i => i.talla)

  // Build columns dynamically
  const headRow = hasTalla
    ? [
        { content: 'DESCRIPCIÓN',  styles: { halign: 'left'   as const } },
        { content: 'TALLA',        styles: { halign: 'center' as const } },
        { content: 'DESC. TALLA',  styles: { halign: 'left'   as const } },
        { content: 'SKU',          styles: { halign: 'left'   as const } },
        { content: 'CANT.',        styles: { halign: 'center' as const } },
        { content: 'P. UNIT.',     styles: { halign: 'right'  as const } },
        { content: 'TOTAL',        styles: { halign: 'right'  as const } },
      ]
    : [
        { content: 'DESCRIPCIÓN',  styles: { halign: 'left'   as const } },
        { content: 'SKU',          styles: { halign: 'left'   as const } },
        { content: 'CANT.',        styles: { halign: 'center' as const } },
        { content: 'P. UNIT.',     styles: { halign: 'right'  as const } },
        { content: 'TOTAL',        styles: { halign: 'right'  as const } },
      ]

  const bodyRows = data.items.map(item => {
    const lineTotal = (item.unitPrice * item.quantity) - item.discount
    if (hasTalla) {
      return [
        { content: item.name,                                          styles: { halign: 'left'   as const } },
        { content: item.talla || '—',                                  styles: { halign: 'center' as const, fontStyle: 'bold' as const, textColor: BRAND.accent } },
        { content: item.tallaDescription || '—',                       styles: { halign: 'left'   as const, textColor: BRAND.gray, fontSize: 7.5 } },
        { content: item.sku,                                           styles: { halign: 'left'   as const, textColor: BRAND.gray, fontSize: 7 } },
        { content: String(item.quantity),                              styles: { halign: 'center' as const } },
        { content: formatNIO(item.unitPrice),                          styles: { halign: 'right'  as const } },
        { content: formatNIO(lineTotal),                               styles: { halign: 'right'  as const, fontStyle: 'bold' as const } },
      ]
    } else {
      return [
        { content: item.name,                                          styles: { halign: 'left'   as const } },
        { content: item.sku,                                           styles: { halign: 'left'   as const, textColor: BRAND.gray, fontSize: 7 } },
        { content: String(item.quantity),                              styles: { halign: 'center' as const } },
        { content: formatNIO(item.unitPrice),                          styles: { halign: 'right'  as const } },
        { content: formatNIO(lineTotal),                               styles: { halign: 'right'  as const, fontStyle: 'bold' as const } },
      ]
    }
  })

  const columnStyles: any = hasTalla
    ? {
        0: { cellWidth: 46 },
        1: { cellWidth: 12 },
        2: { cellWidth: 22 },
        3: { cellWidth: 26 },
        4: { cellWidth: 12 },
        5: { cellWidth: 26 },
        6: { cellWidth: 'auto' as const },
      }
    : {
        0: { cellWidth: 74 },
        1: { cellWidth: 30 },
        2: { cellWidth: 14 },
        3: { cellWidth: 28 },
        4: { cellWidth: 'auto' as const },
      }

  autoTable(doc, {
    startY: y,
    head: [headRow],
    body: bodyRows,
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
    columnStyles,
  })

  // ─── TOTALS BLOCK ─────────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 5
  const totalsW = 78
  const totalsX = pageW - margin - totalsW

  // Naranja accent line above totals
  doc.setDrawColor(...BRAND.accent)
  doc.setLineWidth(0.6)
  doc.line(totalsX, finalY, totalsX + totalsW, finalY)

  let ty = finalY + 4

  if (data.discountTotal > 0) {
    // Subtotal
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.gray)
    doc.text('SUBTOTAL', totalsX + 4, ty + 4)
    doc.text(formatNIO(data.subtotal), totalsX + totalsW - 4, ty + 4, { align: 'right' })
    ty += 9

    // Discount
    doc.setTextColor(220, 38, 38)
    doc.text('DESCUENTO', totalsX + 4, ty + 4)
    doc.text(`- ${formatNIO(data.discountTotal)}`, totalsX + totalsW - 4, ty + 4, { align: 'right' })
    ty += 9
  } else {
    // Subtotal row when no discount
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...BRAND.gray)
    doc.text('SUBTOTAL', totalsX + 4, ty + 4)
    doc.text(formatNIO(data.subtotal), totalsX + totalsW - 4, ty + 4, { align: 'right' })
    ty += 9
  }

  // TOTAL — orange background row
  doc.setFillColor(...BRAND.accent)
  doc.rect(totalsX, ty, totalsW, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BRAND.white)
  doc.text('TOTAL', totalsX + 5, ty + 8)
  doc.text(formatNIO(data.total), totalsX + totalsW - 5, ty + 8, { align: 'right' })
  ty += 12

  // Payment badge
  doc.setFillColor(...BRAND.accentLight)
  doc.roundedRect(totalsX, ty + 2, totalsW, 8, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.accent)
  doc.text(
    `Pagado con: ${paymentLabel(data.paymentMethod)}`,
    totalsX + totalsW / 2, ty + 7.3, { align: 'center' }
  )
  ty += 14

  // ─── NOTES ────────────────────────────────────────────────────────────────
  if (data.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...BRAND.gray)
    doc.text('NOTAS:', margin, ty)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BRAND.text)
    doc.text(data.notes, margin + 16, ty)
  }

  // ─── FOOTER ───────────────────────────────────────────────────────────────
  const footerY = pageH - 22

  // Thin accent line
  doc.setDrawColor(...BRAND.border)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY, pageW - margin, footerY)

  // Accent bar above footer text
  doc.setFillColor(...BRAND.accent)
  doc.rect(margin, footerY + 1, contentW, 1, 'F')

  // Brand name in footer
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.accent)
  doc.text('★  MUNDO DE CALZADO  ★', pageW / 2, footerY + 8, { align: 'center' })

  // Tagline / location
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.gray)
  doc.text('Calzado · Ropa · Accesorios  ·  Managua, Nicaragua', pageW / 2, footerY + 14, { align: 'center' })

  // Thank you message
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.primary)
  doc.text('¡Gracias por su preferencia! Vuelva pronto.', pageW / 2, footerY + 20, { align: 'center' })

  // ─── SAVE ─────────────────────────────────────────────────────────────────
  const filename = `Factura_${String(data.saleNumber).replace(/\//g, '-')}_${
    data.date.toISOString().slice(0, 10)
  }.pdf`

  doc.save(filename)
}
