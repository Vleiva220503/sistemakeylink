'use client'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/sidebar'
import { useSidebar } from '@/store/ui-store'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface MobileSidebarProps {
  userRole: 'admin' | 'cajero'
}

export function MobileSidebar({ userRole }: MobileSidebarProps) {
  const { isOpen, setIsOpen } = useSidebar()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="left" className="p-0 w-72 bg-card border-none">
        <VisuallyHidden>
          <SheetTitle>Menú de navegación</SheetTitle>
        </VisuallyHidden>
        <Sidebar userRole={userRole} onClose={() => setIsOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
