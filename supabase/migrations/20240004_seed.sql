-- ============================================================
-- KEYLING — Migration 004: Seed Data (Development)
-- ============================================================
-- NOTE: Users must be created via Supabase Auth Dashboard or CLI
-- This seed creates the catalog data only

-- ============================================================
-- CASH REGISTERS
-- ============================================================

INSERT INTO cash_registers (id, name, status) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Caja 01', 'closed'),
  ('11111111-0000-0000-0000-000000000002', 'Caja 02', 'closed');

-- ============================================================
-- CATEGORIES
-- ============================================================

INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Zapatos',      'zapatos',     'Calzado para todo uso y ocasión',          1),
  ('22222222-0000-0000-0000-000000000002', 'Ropa',         'ropa',        'Prendas de vestir y moda',                 2),
  ('22222222-0000-0000-0000-000000000003', 'Accesorios',   'accesorios',  'Complementos y accesorios de moda',        3),
  ('22222222-0000-0000-0000-000000000004', 'Bolsos',       'bolsos',      'Carteras, bolsas y maletines',             4),
  ('22222222-0000-0000-0000-000000000005', 'Gorras',       'gorras',      'Gorras, sombreros y accesorios de cabeza', 5);

-- ============================================================
-- BRANDS
-- ============================================================

INSERT INTO brands (id, name, slug, description) VALUES
  ('33333333-0000-0000-0000-000000000001', 'Nike',     'nike',    'Innovación y rendimiento deportivo'),
  ('33333333-0000-0000-0000-000000000002', 'Adidas',   'adidas',  'Estilo y tecnología alemana'),
  ('33333333-0000-0000-0000-000000000003', 'Puma',     'puma',    'Moda deportiva y street style'),
  ('33333333-0000-0000-0000-000000000004', 'Vans',     'vans',    'Cultura skate y street'),
  ('33333333-0000-0000-0000-000000000005', 'New Balance', 'new-balance', 'Comodidad y estilo clásico'),
  ('33333333-0000-0000-0000-000000000006', 'Converse', 'converse', 'Ícono del estilo urbano'),
  ('33333333-0000-0000-0000-000000000007', 'Genérico', 'generico', 'Productos sin marca específica');

-- ============================================================
-- EXPENSE CATEGORIES
-- ============================================================

INSERT INTO expense_categories (id, name, description) VALUES
  ('44444444-0000-0000-0000-000000000001', 'Alquiler',      'Arrendamiento del local comercial'),
  ('44444444-0000-0000-0000-000000000002', 'Transporte',    'Fletes, envíos y movilización'),
  ('44444444-0000-0000-0000-000000000003', 'Publicidad',    'Marketing, redes sociales y promoción'),
  ('44444444-0000-0000-0000-000000000004', 'Internet',      'Servicio de internet y telefonía'),
  ('44444444-0000-0000-0000-000000000005', 'Electricidad',  'Servicio eléctrico'),
  ('44444444-0000-0000-0000-000000000006', 'Empaques',      'Bolsas, cajas y material de empaque'),
  ('44444444-0000-0000-0000-000000000007', 'Comisiones',    'Comisiones de venta y servicios'),
  ('44444444-0000-0000-0000-000000000008', 'Mantenimiento', 'Reparaciones y mantenimiento'),
  ('44444444-0000-0000-0000-000000000009', 'Otros',         'Gastos varios no categorizados');

-- ============================================================
-- SAMPLE PRODUCTS (Nike Air Max 270)
-- ============================================================

INSERT INTO products (id, sku, name, description, category_id, brand_id, base_price, has_variants) VALUES
(
  '55555555-0000-0000-0000-000000000001',
  'ZAP-000001',
  'Nike Air Max 270',
  'Zapatilla Nike Air Max 270, diseño icónico con la mayor unidad Air de Nike hasta la fecha. Perfecto para el uso diario con comodidad todo el día.',
  '22222222-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000001',
  89.99,
  true
);

-- Variants for Nike Air Max 270
INSERT INTO product_variants (id, product_id, sku, size, color, quality, cost, stock_quantity, stock_min, stock_reorder_point) VALUES
  ('66666666-0000-0000-0001-000000000001', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-38', '38', 'Negro', 'Original', 45.00, 5, 2, 3),
  ('66666666-0000-0000-0001-000000000002', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-39', '39', 'Negro', 'Original', 45.00, 8, 2, 3),
  ('66666666-0000-0000-0001-000000000003', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-40', '40', 'Negro', 'Original', 45.00, 10, 2, 3),
  ('66666666-0000-0000-0001-000000000004', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-41', '41', 'Negro', 'Original', 45.00, 7, 2, 3),
  ('66666666-0000-0000-0001-000000000005', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-NEG-42', '42', 'Negro', 'Original', 45.00, 3, 2, 3),
  ('66666666-0000-0000-0001-000000000006', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-38', '38', 'Blanco', 'Original', 45.00, 4, 2, 3),
  ('66666666-0000-0000-0001-000000000007', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-39', '39', 'Blanco', 'Original', 45.00, 6, 2, 3),
  ('66666666-0000-0000-0001-000000000008', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-40', '40', 'Blanco', 'Original', 45.00, 9, 2, 3),
  ('66666666-0000-0000-0001-000000000009', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-41', '41', 'Blanco', 'Original', 45.00, 5, 2, 3),
  ('66666666-0000-0000-0001-000000000010', '55555555-0000-0000-0000-000000000001', 'ZAP-000001-BLA-42', '42', 'Blanco', 'Original', 45.00, 2, 2, 3);

-- Product image for Nike Air Max 270
INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
  ('55555555-0000-0000-0000-000000000001', 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/u_126ab356-44d8-4a06-89b4-fcdcc8df0245,c_scale,fl_relative,w_1.0/07e0caa7-c7f8-4a87-8d91-6e79e92e8027/air-max-270-shoes-2V5C4p.png', 'Nike Air Max 270 - Lateral', true, 0);

-- ============================================================
-- SAMPLE PRODUCTS (Adidas Ultraboost 22)
-- ============================================================

INSERT INTO products (id, sku, name, description, category_id, brand_id, base_price, has_variants) VALUES
(
  '55555555-0000-0000-0000-000000000002',
  'ZAP-000002',
  'Adidas Ultraboost 22',
  'La zapatilla de running más cómoda de Adidas, con tecnología Boost para la máxima amortiguación y retorno de energía en cada paso.',
  '22222222-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000002',
  95.00,
  true
);

INSERT INTO product_variants (id, product_id, sku, size, color, quality, cost, stock_quantity, stock_min, stock_reorder_point) VALUES
  ('66666666-0000-0000-0002-000000000001', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-NEG-39', '39', 'Negro/Blanco', 'Original', 52.00, 6, 2, 3),
  ('66666666-0000-0000-0002-000000000002', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-NEG-40', '40', 'Negro/Blanco', 'Original', 52.00, 8, 2, 3),
  ('66666666-0000-0000-0002-000000000003', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-NEG-41', '41', 'Negro/Blanco', 'Original', 52.00, 5, 2, 3),
  ('66666666-0000-0000-0002-000000000004', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-NEG-42', '42', 'Negro/Blanco', 'Original', 52.00, 3, 2, 3),
  ('66666666-0000-0000-0002-000000000005', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-AZU-40', '40', 'Azul', 'Original', 52.00, 4, 2, 3),
  ('66666666-0000-0000-0002-000000000006', '55555555-0000-0000-0000-000000000002', 'ZAP-000002-AZU-41', '41', 'Azul', 'Original', 52.00, 7, 2, 3);

INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
  ('55555555-0000-0000-0000-000000000002', 'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/fbaf991a78bc4896a3e9ad7800abcec6_9366/Ultraboost_22_Shoes_Black_GZ0127_01_standard.jpg', 'Adidas Ultraboost 22', true, 0);

-- ============================================================
-- SAMPLE PRODUCTS (Vans Old Skool — simple product)
-- ============================================================

INSERT INTO products (id, sku, name, description, category_id, brand_id, base_price, has_variants) VALUES
(
  '55555555-0000-0000-0000-000000000003',
  'ZAP-000003',
  'Vans Old Skool',
  'El clásico de los clásicos. La Vans Old Skool con su icónico stripe lateral. Versátil, duradera y atemporal.',
  '22222222-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000004',
  65.00,
  true
);

INSERT INTO product_variants (id, product_id, sku, size, color, quality, cost, stock_quantity, stock_min, stock_reorder_point) VALUES
  ('66666666-0000-0000-0003-000000000001', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-NEG-38', '38', 'Negro', 'Original', 32.00, 12, 3, 5),
  ('66666666-0000-0000-0003-000000000002', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-NEG-39', '39', 'Negro', 'Original', 32.00, 15, 3, 5),
  ('66666666-0000-0000-0003-000000000003', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-NEG-40', '40', 'Negro', 'Original', 32.00, 10, 3, 5),
  ('66666666-0000-0000-0003-000000000004', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-NEG-41', '41', 'Negro', 'Original', 32.00, 8, 3, 5),
  ('66666666-0000-0000-0003-000000000005', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-BLA-39', '39', 'Blanco', 'Original', 32.00, 6, 3, 5),
  ('66666666-0000-0000-0003-000000000006', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-BLA-40', '40', 'Blanco', 'Original', 32.00, 9, 3, 5),
  ('66666666-0000-0000-0003-000000000007', '55555555-0000-0000-0000-000000000003', 'ZAP-000003-BLA-41', '41', 'Blanco', 'Original', 32.00, 0, 3, 5);

INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
  ('55555555-0000-0000-0000-000000000003', 'https://images.vans.com/is/image/Vans/VN000D3HNVY-HERO?$583x583$', 'Vans Old Skool Black', true, 0);

-- ============================================================
-- SAMPLE PRODUCTS (Puma RS-X — low stock demo)
-- ============================================================

INSERT INTO products (id, sku, name, description, category_id, brand_id, base_price, has_variants) VALUES
(
  '55555555-0000-0000-0000-000000000004',
  'ZAP-000004',
  'Puma RS-X',
  'Zapatilla retro-futurista con amortiguación RS y diseño chunky. Perfecta para el street style más atrevido.',
  '22222222-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000003',
  72.00,
  true
);

INSERT INTO product_variants (id, product_id, sku, size, color, quality, cost, stock_quantity, stock_min, stock_reorder_point) VALUES
  ('66666666-0000-0000-0004-000000000001', '55555555-0000-0000-0000-000000000004', 'ZAP-000004-BLA-40', '40', 'Blanco/Azul', 'Original', 38.00, 2, 3, 4),
  ('66666666-0000-0000-0004-000000000002', '55555555-0000-0000-0000-000000000004', 'ZAP-000004-BLA-41', '41', 'Blanco/Azul', 'Original', 38.00, 1, 3, 4),
  ('66666666-0000-0000-0004-000000000003', '55555555-0000-0000-0000-000000000004', 'ZAP-000004-NEG-40', '40', 'Negro', 'Original', 38.00, 0, 3, 4);

INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order) VALUES
  ('55555555-0000-0000-0000-000000000004', 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/369449/01/sv01/fnd/PNA/fmt/png/RS-X-Efekt-Sneakers', 'Puma RS-X', true, 0);

-- ============================================================
-- SUPPLIERS
-- ============================================================

INSERT INTO suppliers (id, name, contact_name, phone, email, notes) VALUES
  ('77777777-0000-0000-0000-000000000001', 'Distribuidora Deportiva Nacional', 'Carlos Méndez', '+1-555-0101', 'carlos@ddn.com', 'Proveedor principal de marcas deportivas'),
  ('77777777-0000-0000-0000-000000000002', 'Importadora Fashion MX', 'María González', '+52-555-0202', 'mgonzalez@fashionmx.com', 'Importadora directa de marcas internacionales'),
  ('77777777-0000-0000-0000-000000000003', 'Calzado al Mayor SRL', 'Roberto Díaz', '+1-555-0303', 'roberto@calzadomayor.com', 'Mayorista local de calzado variado');

-- ============================================================
-- SAMPLE CUSTOMERS
-- ============================================================

INSERT INTO customers (id, name, phone, email, notes) VALUES
  ('88888888-0000-0000-0000-000000000001', 'Ana García', '+1-555-1001', 'ana.garcia@email.com', 'Cliente frecuente, talla 38'),
  ('88888888-0000-0000-0000-000000000002', 'Luis Torres', '+1-555-1002', 'luis.torres@email.com', 'Prefiere marcas Nike y Adidas'),
  ('88888888-0000-0000-0000-000000000003', 'Carmen López', '+1-555-1003', NULL, 'Compras para familia, volumen alto');
