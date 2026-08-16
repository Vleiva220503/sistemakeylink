-- ============================================================
-- KEYLING — Script completo de configuración de usuarios
-- Ejecutar TODO de una vez en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PASO 1: Corregir el trigger
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_role     user_role := 'cajero';
  v_role_str TEXT;
BEGIN
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );

  v_role_str := TRIM(COALESCE(NEW.raw_user_meta_data->>'role', ''));
  IF v_role_str IN ('admin', 'cajero') THEN
    v_role := v_role_str::user_role;
  END IF;

  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), v_username),
    v_role
  )
  ON CONFLICT (id) DO UPDATE
    SET username  = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        role      = EXCLUDED.role;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error (uid=%): %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- PASO 2: Crear los 4 usuarios en auth.users
-- (Usando WHERE NOT EXISTS para evitar el error de constraint)
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_uid UUID;
BEGIN

  -- ── caja.01 ──────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'caja.01@keyling.com') THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid,
      'authenticated', 'authenticated',
      'caja.01@keyling.com',
      crypt('caja01*/', gen_salt('bf')),
      NOW(),
      '{"username":"caja.01","full_name":"Cajero 01","role":"cajero"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES ('caja.01@keyling.com', v_uid, jsonb_build_object('sub', v_uid::text, 'email', 'caja.01@keyling.com'), 'email', NOW(), NOW(), NOW());
    RAISE NOTICE 'caja.01 creado OK';
  ELSE
    RAISE NOTICE 'caja.01 ya existe, omitido';
  END IF;

  -- ── caja.02 ──────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'caja.02@keyling.com') THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid,
      'authenticated', 'authenticated',
      'caja.02@keyling.com',
      crypt('caja02*/', gen_salt('bf')),
      NOW(),
      '{"username":"caja.02","full_name":"Cajero 02","role":"cajero"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES ('caja.02@keyling.com', v_uid, jsonb_build_object('sub', v_uid::text, 'email', 'caja.02@keyling.com'), 'email', NOW(), NOW(), NOW());
    RAISE NOTICE 'caja.02 creado OK';
  ELSE
    RAISE NOTICE 'caja.02 ya existe, omitido';
  END IF;

  -- ── key.admin ─────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'key.admin@keyling.com') THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid,
      'authenticated', 'authenticated',
      'key.admin@keyling.com',
      crypt('key2681*/', gen_salt('bf')),
      NOW(),
      '{"username":"key.admin","full_name":"Key Administrador","role":"admin"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES ('key.admin@keyling.com', v_uid, jsonb_build_object('sub', v_uid::text, 'email', 'key.admin@keyling.com'), 'email', NOW(), NOW(), NOW());
    RAISE NOTICE 'key.admin creado OK';
  ELSE
    RAISE NOTICE 'key.admin ya existe, omitido';
  END IF;

  -- ── admin ─────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@keyling.com') THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid,
      'authenticated', 'authenticated',
      'admin@keyling.com',
      crypt('admin2681*/', gen_salt('bf')),
      NOW(),
      '{"username":"admin","full_name":"Administrador Principal","role":"admin"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES ('admin@keyling.com', v_uid, jsonb_build_object('sub', v_uid::text, 'email', 'admin@keyling.com'), 'email', NOW(), NOW(), NOW());
    RAISE NOTICE 'admin creado OK';
  ELSE
    RAISE NOTICE 'admin ya existe, omitido';
  END IF;

END $$;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN: Muestra los usuarios creados con sus roles
-- ─────────────────────────────────────────────────────────────

SELECT
  u.email,
  p.username,
  p.full_name,
  p.role,
  p.is_active
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN (
  'caja.01@keyling.com',
  'caja.02@keyling.com',
  'key.admin@keyling.com',
  'admin@keyling.com'
)
ORDER BY p.role DESC, p.username;
