// lib/export-utils.ts
// Client-side only export utilities.
// Uses dynamic imports to avoid SSR issues — call only from browser context (onClick handlers, etc.)

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface InventoryExportRow {
  nombre: string
  sku: string
  talla: string
  color: string
  categoria: string
  marca: string
  stock: number
  costo: number
  precio: number
  estado: string
}

export interface ProductExportRow {
  nombre: string
  sku: string
  categoria: string
  marca: string
  'stock total': number
  'costo base': number
  'precio base': number
  estado: string
}

export interface SaleExportRow {
  'N° venta': string
  fecha: string
  cajero: string
  cliente: string
  total: number
  'método de pago': string
  estado: string
}

// ─── Brand/colors shared ───────────────────────────────────────────────────────
// Colores corporativos Mundo de Calzado — Naranja Quemado #E04B16 + Crema #F7F5F0
const BRAND = {
  primary: [26, 25, 23] as [number, number, number],        // Charcoal casi negro #1A1917
  accent: [224, 75, 22] as [number, number, number],        // Naranja Quemado #E04B16
  accentLight: [254, 236, 227] as [number, number, number], // Naranja muy claro (tint 10%)
  gray: [110, 106, 99] as [number, number, number],         // Warm Taupe #6E6A63
  lightGray: [247, 245, 240] as [number, number, number],   // Crema cálido #F7F5F0
  white: [255, 255, 255] as [number, number, number],
  border: [224, 220, 211] as [number, number, number],      // Warm Oat Border #E0DCD3
  text: [26, 25, 23] as [number, number, number],           // Charcoal #1A1917
}

function formatHNL(amount: number): string {
  return `L ${Number(amount).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function nowLabel(): string {
  return new Date().toLocaleDateString('es-HN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── PDF shared header ─────────────────────────────────────────────────────────
function drawPDFHeader(doc: any, title: string) {
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18

  // Dark band
  doc.setFillColor(...BRAND.primary)
  doc.rect(0, 0, pageW, 36, 'F')

  // Accent bar
  doc.setFillColor(...BRAND.accent)
  doc.rect(0, 0, 6, 36, 'F')

  // Brand name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...BRAND.white)
  doc.text('MUNDO DE CALZADO', margin + 4, 13)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.accentLight)
  doc.text('Calzado · Ropa · Accesorios', margin + 4, 19)

  // Report title (right)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND.white)
  doc.text(title.toUpperCase(), pageW - margin, 13, { align: 'right' })

  // Generation date
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...BRAND.accentLight)
  doc.text(`Generado: ${nowLabel()}`, pageW - margin, 19, { align: 'right' })

  return 44 // startY for content
}

// ─── EXCEL EXPORTS ─────────────────────────────────────────────────────────────

export async function exportToExcel<T extends Record<string, any>>(
  rows: T[],
  filename: string,
  sheetName: string = 'Datos',
) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-width columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? '').length),
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

// ─── PDF EXPORTS ───────────────────────────────────────────────────────────────

export async function exportInventoryPDF(rows: InventoryExportRow[], isAdmin: boolean = true) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margin = 18
  const pageW = doc.internal.pageSize.getWidth()
  const contentW = pageW - margin * 2

  const startY = drawPDFHeader(doc, 'Reporte de Inventario')

  // Summary row
  const totalStock = rows.reduce((s, r) => s + r.stock, 0)
  const totalValue = rows.reduce((s, r) => s + r.stock * r.costo, 0)

  doc.setFillColor(...BRAND.accentLight)
  doc.roundedRect(margin, startY, contentW, 10, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.accent)
  doc.text(
    isAdmin
      ? `${rows.length} variantes  |  Stock total: ${totalStock} uds  |  Valor en inventario: ${formatHNL(totalValue)}`
      : `${rows.length} variantes  |  Stock total: ${totalStock} uds`,
    margin + 6, startY + 6.5,
  )

  const headers = isAdmin
    ? [['Nombre', 'SKU', 'Talla', 'Color', 'Categoría', 'Marca', 'Stock', 'Costo', 'Precio', 'Estado']]
    : [['Nombre', 'SKU', 'Talla', 'Color', 'Categoría', 'Marca', 'Stock', 'Estado']]

  const bodyData = rows.map((r) => {
    if (isAdmin) {
      return [
        r.nombre,
        r.sku,
        r.talla || '—',
        r.color || '—',
        r.categoria,
        r.marca,
        r.stock,
        formatHNL(r.costo),
        formatHNL(r.precio),
        r.estado,
      ]
    } else {
      return [
        r.nombre,
        r.sku,
        r.talla || '—',
        r.color || '—',
        r.categoria,
        r.marca,
        r.stock,
        r.estado,
      ]
    }
  })

  const colStyles = isAdmin
    ? {
        0: { cellWidth: 45 },
        1: { cellWidth: 25 },
        2: { cellWidth: 14 },
        3: { cellWidth: 18 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 14, halign: 'center' },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 22, halign: 'right' },
        9: { cellWidth: 'auto', halign: 'center' },
      }
    : {
        0: { cellWidth: 60 },
        1: { cellWidth: 35 },
        2: { cellWidth: 18 },
        3: { cellWidth: 22 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 'auto', halign: 'center' },
      }

  autoTable(doc, {
    startY: startY + 14,
    head: headers,
    body: bodyData as any[][],
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: BRAND.lightGray },
    columnStyles: colStyles as any,
    didDrawPage: (data: any) => {
      // Footer on each page
      const pageCount = (doc as any).internal.getNumberOfPages()
      const pageNum = data.pageNumber
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...BRAND.gray)
      doc.text(
        `Mundo de Calzado — Página ${pageNum} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      )
    },
  })

  const dateStr = new Date().toISOString().slice(0, 10)
  doc.save(`Inventario_${dateStr}.pdf`)
}

export async function exportSalesPDF(
  rows: SaleExportRow[],
  summary: { totalVentas: number; cantidadVentas: number; dateRange?: string },
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 18
  const pageW = doc.internal.pageSize.getWidth()
  const contentW = pageW - margin * 2

  const startY = drawPDFHeader(doc, 'Reporte de Ventas')

  // Date range label if any
  let metaY = startY
  if (summary.dateRange) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(...BRAND.gray)
    doc.text(`Período: ${summary.dateRange}`, margin, metaY)
    metaY += 6
  }

  // Summary boxes
  const boxW = (contentW - 6) / 2
  const boxH = 16

  // Box 1 — Total vendido
  doc.setFillColor(...BRAND.accent)
  doc.roundedRect(margin, metaY, boxW, boxH, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...BRAND.accentLight)
  doc.text('TOTAL VENDIDO', margin + 5, metaY + 5.5)
  doc.setFontSize(13)
  doc.setTextColor(...BRAND.white)
  doc.text(formatHNL(summary.totalVentas), margin + 5, metaY + 13)

  // Box 2 — # ventas
  doc.setFillColor(...BRAND.lightGray)
  doc.roundedRect(margin + boxW + 6, metaY, boxW, boxH, 2, 2, 'F')
  doc.setFillColor(...BRAND.border)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...BRAND.gray)
  doc.text('CANTIDAD DE VENTAS', margin + boxW + 11, metaY + 5.5)
  doc.setFontSize(13)
  doc.setTextColor(...BRAND.text)
  doc.text(String(summary.cantidadVentas), margin + boxW + 11, metaY + 13)

  autoTable(doc, {
    startY: metaY + boxH + 8,
    head: [['N° Venta', 'Fecha', 'Cajero/Caja', 'Cliente', 'Total', 'Método de Pago', 'Estado']],
    body: rows.map((r) => [
      r['N° venta'],
      r.fecha,
      r.cajero,
      r.cliente,
      formatHNL(r.total),
      r['método de pago'],
      r.estado,
    ]),
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: BRAND.lightGray },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 32 },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24 },
      6: { cellWidth: 'auto', halign: 'center' },
    },
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...BRAND.gray)
      doc.text(
        `Mundo de Calzado — Página ${data.pageNumber} de ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      )
    },
  })

  const dateStr = new Date().toISOString().slice(0, 10)
  doc.save(`Ventas_${dateStr}.pdf`)
}

// ─── TOP PRODUCTS EXPORTS ───────────────────────────────────────────────────────

export interface TopProductExportRow {
  ranking: number
  nombre: string
  sku: string
  categoria: string
  marca: string
  unidades: number
  monto: number
}

export async function exportTopProductsPDF(
  rows: TopProductExportRow[],
  summary: { dateRange: string }
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 18
  const pageW = doc.internal.pageSize.getWidth()
  const contentW = pageW - margin * 2

  const startY = drawPDFHeader(doc, 'Productos Más Vendidos')

  // Date range label
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.gray)
  doc.text(`Período: ${summary.dateRange}`, margin, startY)

  autoTable(doc, {
    startY: startY + 6,
    head: [['Rnk', 'Producto', 'SKU', 'Categoría', 'Marca', 'Uds. Vendidas', 'Ingreso Neto']],
    body: rows.map(r => [
      r.ranking,
      r.nombre,
      r.sku,
      r.categoria,
      r.marca,
      r.unidades,
      formatHNL(r.monto)
    ]),
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: BRAND.lightGray },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 32 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 'auto', halign: 'right' }
    },
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...BRAND.gray)
      doc.text(
        `Mundo de Calzado — Página ${data.pageNumber} de ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      )
    }
  })

  doc.save(`Top_Productos_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ─── INVENTORY MOVEMENTS AUDIT EXPORTS ──────────────────────────────────────────

export interface MovementExportRow {
  fecha: string
  producto: string
  sku: string
  tipo: string
  cantidad: number
  antes: number
  despues: number
  usuario: string
  notas: string
}

export async function exportInventoryMovementsPDF(
  rows: MovementExportRow[],
  summary: { dateRange: string }
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margin = 18
  const pageW = doc.internal.pageSize.getWidth()
  const contentW = pageW - margin * 2

  const startY = drawPDFHeader(doc, 'Auditoría de Movimientos')

  // Date range label
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.gray)
  doc.text(`Período: ${summary.dateRange}`, margin, startY)

  autoTable(doc, {
    startY: startY + 6,
    head: [['Fecha', 'Producto', 'SKU', 'Tipo', 'Cant.', 'Antes', 'Desp.', 'Usuario', 'Notas']],
    body: rows.map(r => [
      r.fecha,
      r.producto,
      r.sku,
      r.tipo,
      r.cantidad,
      r.antes,
      r.despues,
      r.usuario,
      r.notas || '—'
    ]),
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: BRAND.lightGray },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 50 },
      2: { cellWidth: 32 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 26 },
      8: { cellWidth: 'auto' }
    },
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...BRAND.gray)
      doc.text(
        `Mundo de Calzado — Página ${data.pageNumber} de ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      )
    }
  })

  doc.save(`Movimientos_Inventario_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ─── CASH MOVEMENTS EXPORTS ─────────────────────────────────────────────────────

export interface CashMovementExportRow {
  fecha: string
  caja: string
  tipo: string
  monto: number
  descripcion: string
  usuario: string
}

export async function exportCashMovementsPDF(
  rows: CashMovementExportRow[],
  summary: { dateRange: string; netChange: number }
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 18
  const pageW = doc.internal.pageSize.getWidth()
  const contentW = pageW - margin * 2

  const startY = drawPDFHeader(doc, 'Reporte de Caja')

  // Date range label
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.gray)
  doc.text(`Período: ${summary.dateRange}  |  Cambio Neto en Efectivo: ${formatHNL(summary.netChange)}`, margin, startY)

  autoTable(doc, {
    startY: startY + 6,
    head: [['Fecha', 'Caja', 'Tipo', 'Monto', 'Descripción', 'Usuario']],
    body: rows.map(r => [
      r.fecha,
      r.caja,
      r.tipo,
      formatHNL(r.monto),
      r.descripcion || '—',
      r.usuario
    ]),
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: BRAND.lightGray },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 26 },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 32 }
    },
    didDrawPage: (data: any) => {
      const pageCount = (doc as any).internal.getNumberOfPages()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...BRAND.gray)
      doc.text(
        `Mundo de Calzado — Página ${data.pageNumber} de ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      )
    }
  })

  doc.save(`Movimientos_Caja_${new Date().toISOString().slice(0, 10)}.pdf`)
}

