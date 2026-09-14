#!/usr/bin/env ts-node
/**
 * scripts/reset-products.ts
 *
 * Script de EMERGENCIA para vaciar todos los datos de productos del sistema.
 * Elimina (con cascada) variantes, imágenes, movimientos y registros de inventario
 * asociados a los productos de la tienda.
 *
 * ⚠️  ADVERTENCIA CRÍTICA DE SEGURIDAD:
 *     Este script usa SUPABASE_SERVICE_ROLE_KEY para bypassear RLS.
 *     - NUNCA subas esta clave a Git ni la expongas en frontend.
 *     - Guárdala SOLO en .env.local (está en .gitignore).
 *     - Esta operación es IRREVERSIBLE. Haz un backup antes de ejecutar.
 *
 * USO:
 *   npx ts-node scripts/reset-products.ts
 *
 * REQUISITOS:
 *   1. SUPABASE_URL en .env.local
 *   2. SUPABASE_SERVICE_ROLE_KEY en .env.local  ← NO en ANON_KEY
 *   3. npm i -D ts-node @types/node  (si no están instalados)
 */

import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'

// ─── Load .env.local manually (no dotenv needed) ──────────────────────────────
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('\n❌  No se encontró .env.local en la raíz del proyecto.')
    process.exit(1)
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ─── Validate env vars ─────────────────────────────────────────────────────────
if (!SUPABASE_URL) {
  console.error('\n❌  Falta NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) en .env.local')
  process.exit(1)
}

if (!SERVICE_ROLE_KEY) {
  console.error('\n❌  Falta SUPABASE_SERVICE_ROLE_KEY en .env.local')
  console.error('    Obténla en: Supabase Dashboard → Project Settings → API → service_role')
  console.error('    ⚠️  NUNCA la compartas ni la subas a Git.')
  process.exit(1)
}

// ─── Safety prompt ─────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function question(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve))
}

async function main() {
  console.log('\n' + '═'.repeat(60))
  console.log('  🚨  SCRIPT DE RESET DE PRODUCTOS — MUNDO DE CALZADO')
  console.log('═'.repeat(60))
  console.log('\n  Este script eliminará PERMANENTEMENTE:')
  console.log('    • Todos los productos (products)')
  console.log('    • Todas las variantes (product_variants)')
  console.log('    • Todas las imágenes de productos (product_images)')
  console.log('    • Los movimientos de inventario asociados')
  console.log('\n  ⚠️  Esta acción es IRREVERSIBLE.')
  console.log('  ⚠️  Asegúrate de tener un backup de la base de datos.\n')

  const confirm1 = await question('  ¿Deseas continuar? Escribe CONFIRMAR (en mayúsculas): ')
  if (confirm1.trim() !== 'CONFIRMAR') {
    console.log('\n  ✋  Operación cancelada. No se eliminó ningún dato.\n')
    rl.close()
    process.exit(0)
  }

  const confirm2 = await question('\n  Segunda confirmación — escribe el nombre de tu tienda (MUNDO DE CALZADO): ')
  if (confirm2.trim().toUpperCase() !== 'MUNDO DE CALZADO') {
    console.log('\n  ✋  Nombre incorrecto. Operación cancelada.\n')
    rl.close()
    process.exit(0)
  }

  rl.close()
  console.log('\n  ⏳  Ejecutando reset...\n')

  // ─── Execute reset via Supabase REST API (fetch) ─────────────────────────────
  // Order matters due to FK constraints:
  //   1. product_images → 2. inventory_movements (via variant_id) → 3. product_variants → 4. products
  
  const headers = {
    'apikey': SERVICE_ROLE_KEY!,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  }

  async function deleteAll(table: string, filter: string = 'id=neq.00000000-0000-0000-0000-000000000000') {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`
    const res = await fetch(url, { method: 'DELETE', headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Error eliminando ${table}: ${res.status} — ${body}`)
    }
    console.log(`  ✅  ${table} — eliminado`)
  }

  try {
    // 1. Product images
    await deleteAll('product_images')

    // 2. Inventory movements linked to product variants
    //    (movements reference variant_id; delete all of type related to products)
    await deleteAll('inventory_movements')

    // 3. Sale items (reference variant_id — needed before variants can be deleted)
    //    Note: this will orphan sales records. Consider whether sales should be reset too.
    //    Uncommenting this will also delete sale line items:
    // await deleteAll('sale_items')

    // 4. Product variants
    await deleteAll('product_variants')

    // 5. Products
    await deleteAll('products')

    console.log('\n  🎉  Reset completado exitosamente.')
    console.log('      Todos los productos y variantes han sido eliminados.')
    console.log('      Las ventas históricas, categorías y marcas se conservan.\n')
  } catch (err: any) {
    console.error('\n  ❌  Error durante el reset:')
    console.error('     ', err.message)
    console.error('\n  Es posible que algunos registros no se hayan eliminado.')
    console.error('  Revisa las restricciones de FK o registros dependientes.\n')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
