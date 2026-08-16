import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login']

// Admin-only routes — matched via prefix/regex
const ADMIN_ROUTE_PATTERNS = [
  /^\/admin/,
  /^\/reportes/,
  /^\/compras/,
  /^\/proveedores/,
  /^\/gastos/,
  /^\/inventario/, // Entire inventory section (stock, movements) — cashiers use POS/catalog
  /^\/marcas/,
  /^\/categorias/,
  /^\/productos\/nuevo/,              // Create product
  /^\/productos\/[^/]+\/editar/,      // Edit product
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT remove this call — required for token refresh
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    // If already logged in, redirect to dashboard
    if (user && pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Require authentication for all other routes
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check admin-only routes using regex patterns
  const isAdminRoute = ADMIN_ROUTE_PATTERNS.some(pattern => pattern.test(pathname))

  if (isAdminRoute) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    const profile = profileData as any

    if (!profile || profile.role !== 'admin' || !profile.is_active) {
      // Redirect non-admins to dashboard root
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
