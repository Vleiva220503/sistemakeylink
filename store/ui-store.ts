import { create } from 'zustand'

interface SidebarStore {
  isOpen: boolean
  toggle: () => void
  setIsOpen: (isOpen: boolean) => void
}

export const useSidebar = create<SidebarStore>((set) => ({
  isOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setIsOpen: (isOpen) => set({ isOpen }),
}))
