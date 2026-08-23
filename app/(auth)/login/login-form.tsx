'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, Eye, EyeOff, User, Lock } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { login } from '@/app/auth/actions'

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()

  const isInactiveError = searchParams.get('error') === 'inactive'
  const errorMessage = state?.error || (isInactiveError ? 'Tu cuenta ha sido desactivada. Contacta al administrador.' : null)

  return (
    <div className="w-full max-w-md">
      <Card className="border-border bg-card shadow-2xl relative overflow-hidden rounded-none">
        {/* Accent bar */}
        <div className="h-1.5 w-full bg-primary" />

        {/* Logo section */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="bg-white rounded p-3 shadow-md border border-border/40 mb-2">
            <Image
              src="/logo-mundo-calzado.png"
              alt="Mundo de Calzado"
              width={200}
              height={80}
              className="object-contain h-16 w-auto"
              priority
            />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold mt-2">
            Sistema de Gestión POS
          </p>
        </div>

        <CardContent className="space-y-5 px-6 pb-4">
          <form action={formAction} className="space-y-4">

            {/* Error message */}
            {errorMessage && (
              <div className="flex items-center gap-2.5 border border-destructive/50 bg-destructive/10 px-4 py-3 text-xs text-destructive animate-in fade-in slide-in-from-top-1 font-mono font-bold rounded">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Usuario */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-display font-bold uppercase tracking-wider text-foreground">
                USUARIO / CORREO *
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  name="email"
                  type="text"
                  placeholder="caja.01  ó  key.admin"
                  autoComplete="username"
                  autoFocus
                  disabled={isPending}
                  required
                  className="pl-9 font-mono text-sm bg-background border-border focus-visible:border-primary"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-display font-bold uppercase tracking-wider text-foreground">
                CONTRASEÑA *
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isPending}
                  required
                  className="pl-9 pr-10 font-mono text-sm bg-background border-border focus-visible:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isPending}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botón */}
            <Button
              id="login-submit"
              type="submit"
              size="lg"
              className="w-full font-display font-black uppercase tracking-widest text-base h-12 shadow-lg shadow-primary/20 hover:scale-[1.01] transition-transform cursor-pointer"
              disabled={isPending}
              style={{ color: 'hsl(var(--primary-foreground))' }}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  VERIFICANDO...
                </>
              ) : (
                'ACCEDER AL SISTEMA'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border pt-4 pb-4 bg-secondary/30">
          <p className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase font-semibold">
            © 2026 MUNDO DE CALZADO — Sistema POS v2.0
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
