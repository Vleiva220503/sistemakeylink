'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { KeyRound, Loader2, UserRound, Users } from 'lucide-react'
import Link from 'next/link'

interface ProfileClientProps {
  profile: {
    username: string
    full_name: string | null
    role: string
  }
  isAdmin: boolean
}

export function ProfileClient({ profile, isAdmin }: ProfileClientProps) {
  const supabase = createClient()
  const [isPending, setIsPending] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!newPassword || !confirmPassword) {
      toast.error('Por favor completa ambos campos.')
      return
    }

    if (newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.')
      return
    }

    setIsPending(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Contraseña actualizada exitosamente.')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      toast.error('Ocurrió un error inesperado al actualizar la contraseña.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
      {/* Información del Operador */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            Mis Datos
          </CardTitle>
          <CardDescription>Información general de tu usuario en el sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <Label className="text-muted-foreground block text-xs">Nombre Completo</Label>
            <p className="font-bold text-base mt-0.5 text-foreground">{profile.full_name || 'No configurado'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground block text-xs">Usuario / Email</Label>
            <p className="font-bold text-base mt-0.5 text-foreground">{profile.username}</p>
          </div>
          <div>
            <Label className="text-muted-foreground block text-xs">Rol en el Sistema</Label>
            <span className="inline-block mt-1 px-2.5 py-1 bg-primary/10 border border-primary/20 text-xs font-mono font-bold uppercase tracking-wider text-primary rounded-none">
              {profile.role}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Cambiar Contraseña */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>Actualiza tus credenciales de acceso personales</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto uppercase font-bold tracking-wider"
              style={{ color: 'hsl(var(--primary-foreground))' }}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Guardar Nueva Contraseña'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* Gestión de Usuarios — solo admin */}
      {isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              Gestión de Usuarios
            </CardTitle>
            <p className="text-xs text-muted-foreground">Administra cajeros y administradores del sistema</p>
          </CardHeader>
          <CardContent>
            <Link 
              href="/usuarios" 
              className="flex items-center justify-center gap-2 h-10 px-5 text-sm font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full sm:w-auto"
            >
              <Users className="h-4 w-4" />
              Ver todos los usuarios
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
