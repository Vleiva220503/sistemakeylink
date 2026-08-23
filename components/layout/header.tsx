'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Bell, Menu, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { useSidebar } from '@/store/ui-store'

interface HeaderProps {
  user: {
    fullName: string
    role: string
    avatarUrl?: string
  }
  registerName?: string
}

export function Header({ user, registerName }: HeaderProps) {
  const { toggle } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir navegación</span>
        </Button>

        {/* Mobile logo - only shows when sidebar is collapsed */}
        <div className="md:hidden flex items-center">
          <Image
            src="/logo-mundo-calzado-texto.png"
            alt="Mundo de Calzado"
            width={140}
            height={48}
            className="object-contain h-9 w-auto"
            priority
          />
        </div>

        {/* Global Search - desktop only */}

      </div>

      <div className="flex items-center gap-4">
        {registerName ? (
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1.5 bg-card border border-success/40 rounded-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-muted-foreground uppercase">CAJA:</span>
            <span className="font-bold text-success uppercase">{registerName}</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 bg-card border border-border text-muted-foreground rounded-none">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"></span>
            <span>SIN CAJA ACTIVA</span>
          </div>
        )}

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="relative h-9 w-9 border border-border bg-card p-0.5 outline-none flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage src={user.avatarUrl || ''} alt={user.fullName} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-display text-xs font-black">
                    {getInitials(user.fullName || 'Usuario')}
                  </AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent className="w-56 bg-card border-border shadow-xl" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-display font-bold text-foreground leading-none">{user.fullName || 'Usuario'}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] font-mono tracking-wider uppercase text-primary font-bold">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{user.role}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border" />
            <Link href="/perfil" className="w-full">
              <DropdownMenuItem className="cursor-pointer text-xs font-medium">
                Perfil de Operador
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem>
              <form action="/auth/signout" method="post" className="w-full">
                <button type="submit" className="w-full text-left text-destructive text-xs font-display font-bold uppercase flex items-center cursor-pointer">
                  Cerrar Sesión
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
