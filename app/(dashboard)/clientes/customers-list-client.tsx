'use client'

import { useState } from 'react'
import { Users, Mail, Phone, MapPin, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClientForm } from './client-form'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  credit_limit: number
  is_active: boolean
  notes: string | null
}

interface CustomersListClientProps {
  initialCustomers: Customer[]
}

export function CustomersListClient({ initialCustomers }: CustomersListClientProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filteredCustomers = initialCustomers.filter((c) => {
    // 1. Text Search
    const searchLower = search.toLowerCase()
    const matchesSearch =
      c.name.toLowerCase().includes(searchLower) ||
      (c.email || '').toLowerCase().includes(searchLower) ||
      (c.phone || '').toLowerCase().includes(searchLower) ||
      (c.address || '').toLowerCase().includes(searchLower)

    // 2. Status Filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active)

    return matchesSearch && matchesStatus
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Directorio de Clientes ({filteredCustomers.length})</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre, email, tlf..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* Status Select */}
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
      </CardHeader>
      <CardContent>
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Users className="h-10 w-10 opacity-20" />
            <p>
              {search || statusFilter !== 'all'
                ? 'No se encontraron clientes con los filtros aplicados'
                : 'No hay clientes registrados'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile Card View (< 768px) ── */}
            <div className="block md:hidden space-y-3">
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  className={`bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm ${!c.is_active ? 'opacity-60' : ''}`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{c.name}</p>
                      {c.notes && (
                        <p className="text-muted-foreground text-[11px] truncate">{c.notes}</p>
                      )}
                    </div>
                    <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                      {c.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
                    {c.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono font-bold text-[11px] text-foreground">
                      Crédito:{' '}
                      {Number(c.credit_limit) > 0
                        ? `C$ ${Number(c.credit_limit).toFixed(2)}`
                        : '—'}
                    </span>
                    <ClientForm customer={c} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop Table View (>= 768px) ── */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Nombre</TableHead>
                    <TableHead className="whitespace-nowrap">Contacto</TableHead>
                    <TableHead className="whitespace-nowrap">Dirección</TableHead>
                    <TableHead className="whitespace-nowrap">Crédito</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((c) => (
                    <TableRow key={c.id} className={!c.is_active ? 'opacity-60' : ''}>
                      <TableCell className="whitespace-nowrap">
                        <p className="font-medium">{c.name}</p>
                        {c.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {c.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-sm">
                          {c.email && (
                            <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                              <Mail className="h-3 w-3" />
                              {c.email}
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                              <Phone className="h-3 w-3" />
                              {c.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                            <MapPin className="h-3 w-3" />
                            {c.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-sm font-medium">
                          {Number(c.credit_limit) > 0
                            ? `C$ ${Number(c.credit_limit).toFixed(2)}`
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={c.is_active ? 'default' : 'secondary'}>
                          {c.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <ClientForm customer={c} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
