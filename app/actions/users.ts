'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface RpcResult {
  success: boolean
  message: string
  user_id?: string
}

// ─── Admin List Users ─────────────────────────────────────────────────────────

export interface UserRow {
  username: string
  full_name: string | null
  role: 'admin' | 'cajero'
  is_active: boolean
  created_at: string
}

export async function adminListUsers(): Promise<{ data: UserRow[] | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('admin_list_users')
  if (error) return { data: null, error: error.message }
  return { data: data as UserRow[], error: null }
}

// ─── Admin Create User ────────────────────────────────────────────────────────

export async function adminCreateUser(
  username: string,
  password: string,
  fullName: string,
  role: 'admin' | 'cajero',
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('admin_create_user', {
    p_username: username,
    p_password: password,
    p_full_name: fullName,
    p_role: role,
  })
  if (error) return { success: false, message: error.message }
  const result = data as RpcResult
  if (result.success) revalidatePath('/usuarios')
  return { success: result.success, message: result.message }
}

// ─── Admin Update User ────────────────────────────────────────────────────────

export async function adminUpdateUser(
  username: string,
  fullName: string,
  role: 'admin' | 'cajero',
  newPassword?: string,
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('admin_update_user', {
    p_username: username,
    p_new_full_name: fullName || null,
    p_new_role: role || null,
    p_new_password: newPassword && newPassword.trim() !== '' ? newPassword : null,
  })
  if (error) return { success: false, message: error.message }
  const result = data as RpcResult
  if (result.success) revalidatePath('/usuarios')
  return { success: result.success, message: result.message }
}

// ─── Admin Set User Active ────────────────────────────────────────────────────

export async function adminSetUserActive(
  username: string,
  isActive: boolean,
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any).rpc('admin_set_user_active', {
    p_username: username,
    p_is_active: isActive,
  })
  if (error) return { success: false, message: error.message }
  const result = data as RpcResult
  if (result.success) revalidatePath('/usuarios')
  return { success: result.success, message: result.message }
}
