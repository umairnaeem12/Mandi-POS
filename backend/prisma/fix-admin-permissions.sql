-- Fix: Admin role has no rows in role_permissions, so /auth/me returns
-- permissions: [] and the frontend bounces a successful login back to /login.
--
-- Safe to run on production and safe to run more than once.
-- Touches ONLY the permissions + role_permissions tables. It does not read or
-- modify restaurant settings, menu items, categories, orders, or user accounts.
--
-- Note: Prisma creates camelCase columns, so identifiers must stay quoted.

-- STEP 1 — look before you leap. Shows how many permissions each role has now.
-- On the broken production DB, Admin should show 0.
SELECT r.name AS role, COUNT(rp.id) AS permission_count
FROM roles r
LEFT JOIN role_permissions rp ON rp."roleId" = r.id
GROUP BY r.name
ORDER BY r.name;


-- STEP 2 — make sure all 23 permission rows exist.
INSERT INTO permissions (id, name, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, name, NOW(), NOW()
FROM (VALUES
  ('manage_restaurant_settings'), ('view_dashboard'), ('manage_staff'),
  ('manage_roles'), ('manage_permissions'), ('manage_categories'),
  ('manage_menu_items'), ('manage_inventory'), ('view_inventory'),
  ('create_order'), ('update_order'), ('cancel_order'), ('view_orders'),
  ('send_order_to_kitchen'), ('update_order_status'), ('generate_invoice'),
  ('apply_discount'), ('receive_payment'), ('print_receipt'),
  ('manage_customers'), ('view_reports'), ('search_invoices'),
  ('view_recent_activities')
) AS v(name)
ON CONFLICT (name) DO NOTHING;


-- STEP 3 — grant every permission to Admin.
-- ON CONFLICT makes this a no-op for mappings that already exist.
INSERT INTO role_permissions (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid()::text, r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;


-- STEP 4 — confirm the fix. Admin should now report 23.
SELECT r.name AS role, COUNT(rp.id) AS permission_count
FROM roles r
LEFT JOIN role_permissions rp ON rp."roleId" = r.id
GROUP BY r.name
ORDER BY r.name;
