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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Crédito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
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
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {c.address}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {Number(c.credit_limit) > 0
                        ? `$${Number(c.credit_limit).toFixed(2)}`
                        : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? 'default' : 'secondary'}>
                      {c.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ClientForm customer={c} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
