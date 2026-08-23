import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileClient } from './profile-client'

export default async function PerfilPage() {
  const supabase = await createClient()

  // Get active session user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Get user profile data
  const { data: profile, error: profileError } = await (supabase as any)
    .from('profiles')
    .select('username, full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Perfil de Operador</h1>
        <p className="text-muted-foreground">Administra tus datos y contraseña personales</p>
      </div>

      <ProfileClient profile={profile} isAdmin={profile.role === 'admin'} />
    </div>
  )
}
