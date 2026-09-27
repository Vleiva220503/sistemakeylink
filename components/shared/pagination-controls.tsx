'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationControlsProps {
  currentPage: number          // 0-indexed
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  className?: string
}

export function PaginationControls({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  className = '',
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = currentPage * pageSize + 1
  const to = Math.min((currentPage + 1) * pageSize, totalCount)

  if (totalCount === 0) return null

  return (
    <div className={`flex items-center justify-between gap-4 pt-4 border-t border-border ${className}`}>
      <p className="text-xs text-muted-foreground font-mono">
        Mostrando{' '}
        <span className="font-bold text-foreground">{from}–{to}</span>
        {' '}de{' '}
        <span className="font-bold text-foreground">{totalCount.toLocaleString('es')}</span>
        {' '}registros
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          aria-label="Página anterior"
          className="h-8 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Anterior</span>
        </Button>

        <span className="text-xs font-mono text-muted-foreground min-w-[60px] text-center">
          {currentPage + 1} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          aria-label="Página siguiente"
          className="h-8 px-2"
        >
          <span className="hidden sm:inline mr-1">Siguiente</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
