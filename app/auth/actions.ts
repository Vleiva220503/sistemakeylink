'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type LoginState = {
  error?: string
} | undefined

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const supabase = await createClient()

  let identifier = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)?.trim()

  if (!identifier || !password) {
    return { error: 'Completa todos los campos.' }
  }

  // Soporte de usuario corto (sin @): caja.01 → caja.01@keyling.com
  if (!identifier.includes('@')) {
    identifier = `${identifier}@keyling.com`
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  })

  if (error) {
    return { error: 'Usuario o contraseña incorrectos.' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
