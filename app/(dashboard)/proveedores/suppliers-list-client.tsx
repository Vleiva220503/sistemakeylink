'use client'

import { useState } from 'react'
import { Building2, Globe, Phone, Mail, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SupplierForm } from './supplier-form'
import { DeleteButton } from './delete-button'

interface Supplier {
  id: string
  name: string
  legal_name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  is_active: boolean
}

interface SuppliersListClientProps {
  initialSuppliers: Supplier[]
}

export function SuppliersListClient({ initialSuppliers }: SuppliersListClientProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filteredSuppliers = initialSuppliers.filter((s) => {
    // 1. Search filter
    const searchLower = search.toLowerCase()
    const matchesSearch =
      s.name.toLowerCase().includes(searchLower) ||
      (s.legal_name || '').toLowerCase().includes(searchLower) ||
      (s.contact_name || '').toLowerCase().includes(searchLower) ||
      (s.email || '').toLowerCase().includes(searchLower) ||
      (s.phone || '').toLowerCase().includes(searchLower)

    // 2. Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && s.is_active) ||
      (statusFilter === 'inactive' && !s.is_active)

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 border rounded-xl">
        <h2 className="text-xl font-display font-bold">
          Directorio de Proveedores ({filteredSuppliers.length})
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre, contacto..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSuppliers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 border border-dashed rounded-xl">
            <Building2 className="h-10 w-10 opacity-20" />
            <p>
              {search || statusFilter !== 'all'
                ? 'No se encontraron proveedores con los filtros aplicados'
                : 'No hay proveedores registrados'}
            </p>
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <Card key={s.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      {s.legal_name && <p className="text-xs text-muted-foreground">{s.legal_name}</p>}
                    </div>
                  </div>
                  <Badge variant={s.is_active ? 'default' : 'secondary'} className="shrink-0">
                    {s.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {s.contact_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{s.contact_name}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <a href={`mailto:${s.email}`} className="hover:text-foreground truncate">{s.email}</a>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground truncate">{s.website}</a>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <SupplierForm supplier={s} />
                  <DeleteButton id={s.id} table="suppliers" redirectPath="/proveedores" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
