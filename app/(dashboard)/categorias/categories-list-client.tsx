'use client'

import { useState } from 'react'
import { Tag, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CategoryForm } from './category-form'
import { DeleteWithConfirm } from '@/components/shared/delete-confirm-dialog'
import { deleteCategory } from '@/app/actions/crud'

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

export function CategoriesListClient({
  categories,
  productCountByCategory,
}: CategoriesListClientProps) {
  const [search, setSearch] = useState('')

  const filteredCategories = categories.filter((cat) => {
    const searchLower = search.toLowerCase()
    return (
      cat.name.toLowerCase().includes(searchLower) ||
      (cat.description || '').toLowerCase().includes(searchLower)
    )
  })

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
          <div className="relative w-full md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar talla..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Tag className="h-10 w-10 opacity-20" />
            <p>
              {search ? 'No se encontraron tallas' : 'No hay tallas registradas'}
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
                    <CategoryForm category={cat} />

                    <DeleteWithConfirm
                      itemName={cat.name}
                      itemType="talla"
                      productCount={count}
                      onConfirm={() => deleteCategory(cat.id)}
                    />
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

