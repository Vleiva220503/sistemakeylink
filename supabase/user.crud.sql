-- ============================================================
-- GESTIÓN DE USUARIOS POR USERNAME (con validación)
-- Ejecutar completo en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- FUNCIÓN: Crear usuario
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_create_user(
  p_username  TEXT,
  p_password  TEXT,
  p_full_name TEXT,
  p_role      TEXT
)
RETURNS JSON AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_existing RECORD;
BEGIN
  IF NOT is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'No tienes permisos de administrador.');
  END IF;

  IF TRIM(p_username) = '' THEN
    RETURN json_build_object('success', false, 'message', 'El usuario no puede estar vacío.');
  END IF;

  IF p_role NOT IN ('admin', 'cajero') THEN
    RETURN json_build_object('success', false, 'message', 'Rol inválido.');
  END IF;

  v_email := LOWER(TRIM(p_username)) || '@keyling.com';

  SELECT p.username, p.is_active INTO v_existing
  FROM profiles p
  WHERE LOWER(p.username) = LOWER(TRIM(p_username));

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Este usuario ya existe y está ' ||
        CASE WHEN v_existing.is_active THEN 'ACTIVO.' ELSE 'INACTIVO.' END
    );
  END IF;

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
    v_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('username', p_username, 'full_name', p_full_name, 'role', p_role),
    NOW(), NOW(), '', '', '', ''
  );

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (v_email, v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email), 'email', NOW(), NOW(), NOW());

  RETURN json_build_object('success', true, 'message', 'Usuario "' || p_username || '" creado correctamente.', 'user_id', v_uid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- FUNCIÓN: Editar usuario (nombre, rol y opcionalmente contraseña)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_update_user(
  p_username      TEXT,
  p_new_full_name TEXT DEFAULT NULL,
  p_new_role      TEXT DEFAULT NULL,
  p_new_password  TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF NOT is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'No tienes permisos de administrador.');
  END IF;

  SELECT id INTO v_uid FROM profiles WHERE LOWER(username) = LOWER(TRIM(p_username));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Este usuario no existe.');
  END IF;

  IF p_new_role IS NOT NULL AND p_new_role NOT IN ('admin', 'cajero') THEN
    RETURN json_build_object('success', false, 'message', 'Rol inválido.');
  END IF;

  UPDATE profiles
  SET
    full_name = COALESCE(p_new_full_name, full_name),
    role = COALESCE(p_new_role::user_role, role),
    updated_at = NOW()
  WHERE id = v_uid;

  IF p_new_password IS NOT NULL AND TRIM(p_new_password) != '' THEN
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf')), updated_at = NOW()
    WHERE id = v_uid;

    DELETE FROM auth.refresh_tokens WHERE user_id = v_uid::text;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Usuario "' || p_username || '" actualizado correctamente.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- FUNCIÓN: Activar / Inactivar usuario
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_set_user_active(
  p_username  TEXT,
  p_is_active BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF NOT is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'No tienes permisos de administrador.');
  END IF;

  SELECT id INTO v_uid FROM profiles WHERE LOWER(username) = LOWER(TRIM(p_username));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Este usuario no existe.');
  END IF;

  UPDATE profiles SET is_active = p_is_active, updated_at = NOW() WHERE id = v_uid;

  IF NOT p_is_active THEN
    DELETE FROM auth.refresh_tokens WHERE user_id = v_uid::text;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Usuario "' || p_username || '" ' || CASE WHEN p_is_active THEN 'activado' ELSE 'inactivado' END || ' correctamente.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- FUNCIÓN: Listar usuarios (para la UI de gestión)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE(username TEXT, full_name TEXT, role user_role, is_active BOOLEAN, created_at TIMESTAMPTZ) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN QUERY SELECT p.username, p.full_name, p.role, p.is_active, p.created_at FROM profiles p ORDER BY p.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VERIFICACIÓN — Confirma que las 4 funciones se crearon
-- ============================================================
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('admin_create_user', 'admin_update_user', 'admin_set_user_active', 'admin_list_users')
ORDER BY routine_name;