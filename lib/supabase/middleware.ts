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
  /^\/usuarios/,
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

  // Fetch user profile if user is authenticated
  let profile: { role: string; is_active: boolean } | null = null
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    profile = (profileData as any) || null
  }

  // Handle inactive users with existing session
  if (user && profile && !profile.is_active) {
    await supabase.auth.signOut()
    if (pathname !== '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'inactive')
      return NextResponse.redirect(url)
    }
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    // If already logged in AND active, redirect to dashboard
    if (user && profile && profile.is_active && pathname === '/login') {
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
    if (!profile || profile.role !== 'admin') {
      // Redirect non-admins to dashboard root
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
