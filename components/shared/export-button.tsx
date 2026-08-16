// components/shared/export-button.tsx
'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface ExportButtonProps {
  onExportExcel: () => Promise<void> | void
  onExportPDF: () => Promise<void> | void
  className?: string
}

export function ExportButton({ onExportExcel, onExportPDF, className }: ExportButtonProps) {
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    try {
      await onExportExcel()
      toast.success('Reporte de Excel generado correctamente.')
    } catch (error) {
      console.error('Error al exportar Excel:', error)
      toast.error('Error al generar el reporte de Excel.')
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPDF = async () => {
    setIsExportingPDF(true)
    try {
      await onExportPDF()
      toast.success('Reporte PDF generado correctamente.')
    } catch (error) {
      console.error('Error al exportar PDF:', error)
      toast.error('Error al generar el reporte PDF.')
    } finally {
      setIsExportingPDF(false)
    }
  }

  const isPending = isExportingExcel || isExportingPDF

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={handleExportExcel} disabled={isPending}>
          <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
          <span>Excel (.xlsx)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isPending}>
          <FileText className="mr-2 h-4 w-4 text-rose-600" />
          <span>PDF (.pdf)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
