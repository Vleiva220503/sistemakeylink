'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ShoppingCart,
  Archive,
  CreditCard,
  PieChart,
  LogOut,
  ChevronDown,
  X,
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'

interface NavItem {
  name: string
  href?: string
  icon: any
  children?: { name: string; href: string }[]
}

const getNavigation = (isAdmin: boolean): NavItem[] => {
  const nav: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    {
      name: 'Catálogo',
      icon: Package,
      children: [
        { name: 'Productos', href: '/productos' },
        ...(isAdmin ? [
          { name: 'Tallas', href: '/categorias' },
          { name: 'Marcas', href: '/marcas' },
        ] : []),
      ],
    },
    {
      name: 'Operaciones',
      icon: ShoppingCart,
      children: [
        { name: 'Punto de Venta (POS)', href: '/ventas' },
        { name: 'Control de Caja', href: '/caja' },
        { name: 'Historial de Ventas', href: '/ventas/historial' },
        { name: 'Clientes', href: '/clientes' },
      ],
    },
  ]

  if (isAdmin) {
    nav.push(
      {
        name: 'Inventario',
        icon: Archive,
        children: [
          { name: 'Stock Actual', href: '/inventario' },
          { name: 'Movimientos', href: '/inventario/movimientos' },
        ],
      },
      {
        name: 'Compras',
        icon: ShoppingBag,
        children: [
          { name: 'Órdenes de Compra', href: '/compras' },
          { name: 'Proveedores', href: '/proveedores' },
        ],
      },
      {
        name: 'Finanzas',
        icon: CreditCard,
        children: [
          { name: 'Gastos Operativos', href: '/gastos' },
        ],
      },
      {
        name: 'Reportes',
        icon: PieChart,
        children: [
          { name: 'Reporte de Ventas', href: '/reportes/ventas' },
          { name: 'Productos Más Vendidos', href: '/reportes/productos' },
          { name: 'Valorización Inventario', href: '/reportes/inventario' },
          { name: 'Auditoría Inventario', href: '/reportes/movimientos' },
          { name: 'Reporte de Caja', href: '/reportes/caja' },
          { name: 'Rentabilidad Neta', href: '/reportes/rentabilidad' },
        ],
      }
    )
  }

  return nav
}

interface SidebarProps {
  userRole: 'admin' | 'cajero'
  onClose?: () => void
}

export function Sidebar({ userRole, onClose }: SidebarProps) {
  const pathname = usePathname()
  const navigation = useMemo(() => getNavigation(userRole === 'admin'), [userRole])
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const currentGroup = navigation.find((item: NavItem) => 
      item.children?.some((child: { name: string; href: string }) => pathname === child.href || pathname.startsWith(child.href + '/'))
    )
    if (currentGroup && !openGroups[currentGroup.name]) {
      setOpenGroups(prev => ({ ...prev, [currentGroup.name]: true }))
    }
  }, [pathname, navigation])

  const toggleGroup = (name: string) => {
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <div className="flex h-full flex-col bg-card border-r border-border w-64 selection:bg-primary/20">
      {/* Brand Header — Logo real de la tienda */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-border bg-white">
        <Link href="/" className="flex items-center group">
          <Image
            src="/logo-mundo-calzado.png"
            alt="Mundo de Calzado"
            width={180}
            height={72}
            className="object-contain h-14 w-auto group-hover:scale-105 transition-transform duration-200"
            priority
          />
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-muted-foreground hover:text-foreground ml-auto">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {(() => {
          // Gather all defined hrefs across all groups and standalone items
          const allHrefs = navigation.flatMap(n => n.href ? [n.href] : (n.children?.map(c => c.href) || []))
          // Find the exact matching href or the longest matching prefix href (excluding '/')
          const activeHref = allHrefs
            .filter(h => pathname === h || (h !== '/' && pathname.startsWith(h + '/')))
            .sort((a, b) => b.length - a.length)[0] || (allHrefs.includes(pathname) ? pathname : null)

          return navigation.map((item: NavItem) => {
            const isActive = !item.children && item.href === activeHref
            const isGroupOpen = openGroups[item.name]

            return (
              <div key={item.name} className="space-y-1">
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 rounded-none px-3 py-2 text-xs font-display font-bold uppercase tracking-wider transition-colors",
                        isGroupOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </div>
                      <ChevronDown
                        className={cn("h-3.5 w-3.5 transition-transform duration-200", isGroupOpen ? "rotate-180 text-primary" : "text-muted-foreground")}
                      />
                    </button>
                    {isGroupOpen && (
                      <div className="ml-4 pl-3 border-l-2 border-border space-y-1 my-1">
                        {item.children.map((child: { name: string; href: string }) => {
                          const isChildActive = child.href === activeHref
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              onClick={onClose}
                              className={cn(
                                "block rounded-none px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                                isChildActive
                                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                              )}
                            >
                              {child.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href || '#'}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 rounded-none px-3 py-2 text-xs font-display font-bold uppercase tracking-wider transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )}
              </div>
            )
          })
        })()}
      </div>

      {/* Footer Operator Info & Signout */}
      <div className="border-t border-border p-3 space-y-2 bg-background/40">
        <div className="px-3 py-2 rounded-none bg-background border border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>ROL: <strong className="text-foreground uppercase">{userRole}</strong></span>
          <span className="h-2 w-2 rounded-full bg-success"></span>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-none border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-display font-bold uppercase text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-150 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar Sesión
          </button>
        </form>
      </div>
    </div>
  )
}
