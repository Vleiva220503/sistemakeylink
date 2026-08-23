import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersClient } from './users-client'
import type { UserRow } from '@/app/actions/users'

export default async function UsuariosPage() {
  const supabase = await createClient()

  // Verify session exists
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify admin role (middleware also guards this, but double-check)
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  // Load user list using the already-authenticated supabase client (same session)
  // We query profiles directly instead of the RPC to avoid session context issues
  let users: UserRow[] = []
  let loadError: string | null = null

  try {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('username, full_name, role, is_active, created_at')
      .order('username', { ascending: true })

    if (error) {
      loadError = error.message
      console.error('[UsuariosPage] Error loading users:', error.message)
    } else {
      users = (data as UserRow[]) || []
    }
  } catch (err) {
    loadError = 'Error inesperado al cargar los usuarios.'
    console.error('[UsuariosPage] Unexpected error:', err)
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <p className="text-sm font-mono">No se pudieron cargar los usuarios. Intenta recargar la página.</p>
        <p className="text-xs opacity-60 font-mono">{loadError}</p>
      </div>
    )
  }

  return <UsersClient initialUsers={users} />
}
