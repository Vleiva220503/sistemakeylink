import type { Metadata } from 'next'
import { Barlow_Condensed, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700', '800', '900'],
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'MUNDO DE CALZADO — Tienda & POS',
  description: 'Plataforma oficial de gestión y ventas de Mundo de Calzado. Sistema de inventario, POS y reportes.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${barlowCondensed.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        {children}
        <Toaster richColors position="top-right" theme="light" />
      </body>
    </html>
  )
}
