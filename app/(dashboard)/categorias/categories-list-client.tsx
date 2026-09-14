'use client'

import { useState, useTransition } from 'react'
import { Tag, Search, RefreshCw, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CategoryForm } from './category-form'
import { DeleteWithConfirm } from '@/components/shared/delete-confirm-dialog'
import { deleteCategory, reactivateCategory } from '@/app/actions/crud'
import { toast } from 'sonner'

interface CategoryItem {
  id: string
  name: string
  slug: string
  description?: string | null
  is_active: boolean
}

interface CategoriesListClientProps {
  categories: CategoryItem[]
  productCountByCategory: Record<string, number>
}

// ─── Reactivate Button ─────────────────────────────────────────────────────────
function ReactivateCategoryButton({ categoryId }: { categoryId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleReactivate() {
    startTransition(async () => {
      const result = await reactivateCategory(categoryId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Talla reactivada correctamente')
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={isPending}
      onClick={handleReactivate}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Reactivar
    </Button>
  )
}

export function CategoriesListClient({
  categories,
  productCountByCategory,
}: CategoriesListClientProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')

  const filteredCategories = categories.filter((cat) => {
    const searchLower = search.toLowerCase()
    const matchesSearch =
      cat.name.toLowerCase().includes(searchLower) ||
      (cat.description || '').toLowerCase().includes(searchLower)

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? cat.is_active
        : !cat.is_active

    return matchesSearch && matchesStatus
  })

  const inactiveCount = categories.filter((c) => !c.is_active).length

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Directorio de Tallas
            <Badge variant="secondary" className="ml-2">
              {categories.filter((c) => c.is_active).length}
            </Badge>
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* Estado filter */}
            <select
              className="h-10 px-3 text-sm bg-background border border-border rounded-md outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label="Filtrar por estado"
            >
              <option value="active">Solo activas</option>
              <option value="inactive">
                Solo inactivas{inactiveCount > 0 ? ` (${inactiveCount})` : ''}
              </option>
              <option value="all">Todas</option>
            </select>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar talla..."
                className="pl-8 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Tag className="h-10 w-10 opacity-20" />
            <p>
              {search
                ? 'No se encontraron tallas'
                : statusFilter === 'inactive'
                ? 'No hay tallas inactivas'
                : 'No hay tallas registradas'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCategories.map((cat) => {
              const count = productCountByCategory[cat.id] || 0
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-4 px-2 hover:bg-secondary/20 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      {cat.description && (
                        <p className="text-sm text-muted-foreground">
                          {cat.description}
                        </p>
                      )}
                      {count > 0 && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {count} producto{count > 1 ? 's' : ''} activo{count > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                      {cat.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>

                    {cat.is_active ? (
                      <>
                        <CategoryForm category={cat} />
                        <DeleteWithConfirm
                          itemName={cat.name}
                          itemType="talla"
                          productCount={count}
                          onConfirm={() => deleteCategory(cat.id)}
                        />
                      </>
                    ) : (
                      <ReactivateCategoryButton categoryId={cat.id} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
