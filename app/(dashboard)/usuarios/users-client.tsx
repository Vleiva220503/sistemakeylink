'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, UserPlus, Pencil, Power, PowerOff, Loader2,
  ShieldCheck, Search, RotateCcw, UserCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import type { UserRow } from '@/app/actions/users'
import { adminCreateUser, adminUpdateUser, adminSetUserActive } from '@/app/actions/users'

interface UsersClientProps {
  initialUsers: UserRow[]
}

// ─── Create User Form Modal ───────────────────────────────────────────────────
function CreateUserModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'cajero' | 'admin'>('cajero')

  function resetForm() {
    setUsername('')
    setPassword('')
    setFullName('')
    setRole('cajero')
    setFormError(null)
  }

  function handleClose() {
    if (!isPending) {
      resetForm()
      setOpen(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!username.trim()) { setFormError('El nombre de usuario es requerido.'); return }
    if (!password || password.length < 6) { setFormError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (!fullName.trim()) { setFormError('El nombre completo es requerido.'); return }

    startTransition(async () => {
      const res = await adminCreateUser(username.trim(), password, fullName.trim(), role)
      if (res.success) {
        toast.success(res.message)
        handleClose()
        onSuccess()
      } else {
        // Show the exact message from the DB function WITHOUT closing the form
        setFormError(res.message)
      }
    })
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        style={{ color: 'hsl(var(--primary-foreground))' }}
        className="flex items-center gap-2 uppercase font-bold tracking-wider text-xs"
      >
        <UserPlus className="h-4 w-4" />
        Agregar Usuario
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display font-black uppercase">
              <UserPlus className="h-5 w-5 text-primary" />
              Nuevo Usuario
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cu-username">Nombre de Usuario</Label>
              <Input
                id="cu-username"
                placeholder="ej: cajero.01"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setFormError(null) }}
                disabled={isPending}
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">Solo letras, números y puntos. Sin espacios.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cu-password">Contraseña Inicial</Label>
              <Input
                id="cu-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cu-fullname">Nombre Completo</Label>
              <Input
                id="cu-fullname"
                placeholder="ej: Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cu-role">Rol</Label>
              <select
                id="cu-role"
                className="w-full h-10 px-3 text-sm bg-background border border-input rounded-md outline-none focus:ring-2 focus:ring-primary"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'cajero')}
                disabled={isPending}
              >
                <option value="cajero">Cajero</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Error message from DB — exact text, never auto-closes */}
            {formError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive font-medium">
                {formError}
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                style={{ color: 'hsl(var(--primary-foreground))' }}
              >
                {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creando...</> : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Edit User Form Modal ─────────────────────────────────────────────────────
function EditUserModal({ user, onSuccess }: { user: UserRow; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [fullName, setFullName] = useState(user.full_name || '')
  const [role, setRole] = useState<'admin' | 'cajero'>(user.role)
  const [newPassword, setNewPassword] = useState('')

  function handleClose() {
    if (!isPending) {
      setFullName(user.full_name || '')
      setRole(user.role)
      setNewPassword('')
      setOpen(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { toast.error('El nombre completo es requerido.'); return }

    startTransition(async () => {
      const res = await adminUpdateUser(user.username, fullName.trim(), role, newPassword || undefined)
      if (res.success) {
        toast.success(res.message)
        handleClose()
        onSuccess()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="Editar usuario"
        className="h-8 w-8"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display font-black uppercase">
              <Pencil className="h-5 w-5 text-primary" />
              Editar: {user.username}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="eu-fullname">Nombre Completo</Label>
              <Input
                id="eu-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eu-role">Rol</Label>
              <select
                id="eu-role"
                className="w-full h-10 px-3 text-sm bg-background border border-input rounded-md outline-none focus:ring-2 focus:ring-primary"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'cajero')}
                disabled={isPending}
              >
                <option value="cajero">Cajero</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eu-password">Nueva Contraseña <span className="text-muted-foreground font-normal">(vacío = no cambiar)</span></Label>
              <Input
                id="eu-password"
                type="password"
                placeholder="Dejar vacío para no cambiar"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                style={{ color: 'hsl(var(--primary-foreground))' }}
              >
                {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Toggle Active Button ─────────────────────────────────────────────────────
function ToggleActiveButton({ user, onSuccess }: { user: UserRow; onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const res = await adminSetUserActive(user.username, !user.is_active)
      if (res.success) {
        toast.success(res.message)
        onSuccess()
      } else {
        toast.error(res.message)
      }
    })
  }

  const label = user.is_active ? 'Inactivar' : 'Activar'
  const Icon = user.is_active ? PowerOff : Power

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            title={label}
            className={`h-8 w-8 ${user.is_active ? 'text-warning hover:text-warning hover:bg-warning/10' : 'text-success hover:text-success hover:bg-success/10'}`}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {user.is_active ? '¿Inactivar usuario?' : '¿Activar usuario?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user.is_active
              ? `El usuario "${user.username}" perderá acceso al sistema inmediatamente y su sesión activa será cerrada.`
              : `El usuario "${user.username}" recuperará acceso al sistema.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleToggle}
            className={user.is_active
              ? 'bg-warning hover:bg-warning/90 text-warning-foreground'
              : 'bg-success hover:bg-success/90 text-success-foreground'}
          >
            Sí, {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Main Users Client ────────────────────────────────────────────────────────
export function UsersClient({ initialUsers }: UsersClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  function refresh() { router.refresh() }

  const filtered = initialUsers.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.username.toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  const activeCount = initialUsers.filter((u) => u.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight uppercase">Gestión de Usuarios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Administra los accesos al sistema — <span className="font-semibold text-foreground">{activeCount}</span> activos de <span className="font-semibold">{initialUsers.length}</span> totales
          </p>
        </div>
        <CreateUserModal onSuccess={refresh} />
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario, nombre, rol..."
                className="pl-9 h-10 text-sm bg-background border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="gap-1.5 text-xs font-mono font-bold uppercase text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 font-display font-black text-sm uppercase tracking-wide">
            <Users className="h-5 w-5 text-primary" />
            Directorio de Usuarios ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-0">
          {/* Mobile Card View (< 768px) */}
          <div className="block md:hidden space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCircle2 className="h-10 w-10 opacity-20 mx-auto mb-3" />
                {search ? 'No se encontraron usuarios con ese criterio.' : 'No hay usuarios registrados.'}
              </div>
            ) : (
              filtered.map((u) => (
                <div key={u.username} className={`bg-background border border-border p-3.5 space-y-2.5 text-xs shadow-sm ${!u.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div>
                      <p className="font-mono font-bold text-primary text-sm">{u.username}</p>
                      <p className="text-muted-foreground text-xs">{u.full_name || 'Sin nombre'}</p>
                    </div>
                    <Badge variant={u.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-none border ${
                      u.role === 'admin'
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-secondary text-secondary-foreground border-border'
                    }`}>
                      <ShieldCheck className="h-3 w-3" />
                      {u.role === 'admin' ? 'Admin' : 'Cajero'}
                    </span>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <EditUserModal user={u} onSuccess={refresh} />
                      <ToggleActiveButton user={u} onSuccess={refresh} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Usuario</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Nombre Completo</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Rol</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Estado</TableHead>
                  <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Fecha Registro</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-center whitespace-nowrap">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <UserCircle2 className="h-10 w-10 opacity-20 mx-auto mb-3" />
                      {search ? 'No se encontraron usuarios con ese criterio.' : 'No hay usuarios registrados.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.username} className={!u.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono font-bold text-sm text-primary whitespace-nowrap">{u.username}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{u.full_name || <span className="text-muted-foreground italic">—</span>}</TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-none border ${
                          u.role === 'admin'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-secondary text-secondary-foreground border-border'
                        }`}>
                          <ShieldCheck className="h-3 w-3" />
                          {u.role === 'admin' ? 'Admin' : 'Cajero'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge variant={u.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('es-NI', {
                          timeZone: 'America/Managua',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <EditUserModal user={u} onSuccess={refresh} />
                          <ToggleActiveButton user={u} onSuccess={refresh} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
