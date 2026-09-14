// Script para crear los usuarios de Keyling en Supabase
// Ejecutar con: node create-users.js

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xrafaomfscisutgrygwh.supabase.co',
  'sb_publishable_oA5FgaxpwLo7TbuAAf5RBw_5W-vGQr7'
)

const users = [
  {
    email: 'caja.01@keyling.com',
    password: 'caja01*/',
    username: 'caja.01',
    full_name: 'Cajero 01',
    role: 'cajero',
  },
  {
    email: 'caja.02@keyling.com',
    password: 'caja02*/',
    username: 'caja.02',
    full_name: 'Cajero 02',
    role: 'cajero',
  },
  {
    email: 'key.admin@keyling.com',
    password: 'key2681*/',
    username: 'key.admin',
    full_name: 'Key Administrador',
    role: 'admin',
  },
  {
    email: 'admin@keyling.com',
    password: 'admin2681*/',
    username: 'admin',
    full_name: 'Administrador Principal',
    role: 'admin',
  },
]

async function createUsers() {
  console.log('\n🚀 Creando usuarios de Keyling...\n')

  for (const user of users) {
    process.stdout.write(`  Creando ${user.username} (${user.role})... `)

    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: {
          username: user.username,
          full_name: user.full_name,
          role: user.role,
        },
      },
    })

    if (error) {
      console.log(`❌ Error: ${error.message}`)
    } else if (data.user?.identities?.length === 0) {
      console.log(`⚠️  Ya existe (email duplicado)`)
    } else {
      console.log(`✅ Creado (${user.email})`)
    }

    // Pequeña pausa entre requests
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('\n✨ Proceso finalizado.\n')
  console.log('📋 Usuarios disponibles:')
  console.log('─────────────────────────────────────────────────')
  console.log('  Usuario     │ Contraseña    │ Rol')
  console.log('─────────────────────────────────────────────────')
  console.log('  caja.01     │ caja01*/      │ Cajero')
  console.log('  caja.02     │ caja02*/      │ Cajero')
  console.log('  key.admin   │ key2681*/     │ Administrador')
  console.log('  admin       │ admin2681*/   │ Administrador')
  console.log('─────────────────────────────────────────────────')
  console.log('\n💡 Para ingresar usa el usuario (sin @keyling.com)')
  console.log('   o el email completo en el campo de login.\n')
}

createUsers()
