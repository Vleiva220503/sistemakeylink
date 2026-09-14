import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Parallelize auth check profile fetch and open register check
  const [{ data: profileData }, { data: openRegisters }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, full_name, role, is_active, avatar_url')
      .eq('id', user.id)
      .single(),
    (supabase as any)
      .from('cash_registers')
      .select('name')
      .eq('status', 'open')
      .eq('opened_by', user.id)
      .limit(1)
  ])

  const profile = profileData as any

  if (!profile || !profile.is_active) {
    redirect('/login')
  }

  const registerName = openRegisters?.[0]?.name || undefined

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40">
        <Sidebar userRole={profile.role} />
      </div>

      <div className="flex flex-col flex-1 md:pl-64 min-w-0 overflow-hidden">
        <MobileSidebar userRole={profile.role} />
        
        <Header 
          user={{
            fullName: profile.full_name || profile.username,
            role: profile.role,
            avatarUrl: profile.avatar_url || undefined
          }}
          registerName={registerName}
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
