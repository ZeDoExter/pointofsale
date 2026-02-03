#!/bin/bash
# Seed data for V2 schema
# Creates sample data for testing multi-tenant system

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-pointofsale}"
DB_USER="${DB_USER:-user}"
PGPASSWORD="${PGPASSWORD:-password}"

export PGPASSWORD

echo "=========================================="
echo "Seeding POS Database V2"
echo "=========================================="
echo ""

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'

-- ============================================================================
-- SAMPLE DATA FOR MULTI-TENANT POS SYSTEM
-- ============================================================================

-- Clear existing data (in correct order)
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE promotion_usage CASCADE;
TRUNCATE TABLE promotions CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE qr_sessions CASCADE;
TRUNCATE TABLE tables CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE branches CASCADE;
TRUNCATE TABLE organizations CASCADE;

-- ============================================================================
-- 1. ORGANIZATIONS
-- ============================================================================

-- Create 2 sample restaurant groups
INSERT INTO organizations (id, name, slug, contact_email, contact_phone, plan_type, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Delicious Thai Restaurant', 'delicious-thai', 'admin@delicious.com', '02-123-4567', 'PREMIUM', true),
  ('22222222-2222-2222-2222-222222222222', 'Fast Food Corner', 'fast-food', 'admin@fastfood.com', '02-987-6543', 'BASIC', true);

-- ============================================================================
-- 2. BRANCHES
-- ============================================================================

-- Delicious Thai Restaurant - 2 branches
INSERT INTO branches (id, organization_id, name, slug, address, city, province, phone, is_active) VALUES
  ('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Siam Branch', 'siam', '999 Rama I Rd', 'Bangkok', 'Bangkok', '02-111-1111', true),
  ('b2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Central Branch', 'central', '123 Phloen Chit Rd', 'Bangkok', 'Bangkok', '02-222-2222', true);

-- Fast Food Corner - 1 branch
INSERT INTO branches (id, organization_id, name, slug, address, city, province, phone, is_active) VALUES
  ('b3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Silom Branch', 'silom', '456 Silom Rd', 'Bangkok', 'Bangkok', '02-333-3333', true);

-- ============================================================================
-- 3. USERS
-- ============================================================================

-- Super Admin (can see everything)
INSERT INTO users (id, username, email, password_hash, full_name, role, is_active) VALUES
  ('00000000-0000-0000-0000-000000000000', 'admin', 'admin@pos-system.com', '$2a$10$admin_hash', 'System Administrator', 'ADMIN', true);

-- Delicious Thai - Manager (can see both branches)
INSERT INTO users (id, username, email, password_hash, full_name, role, organization_id, is_active) VALUES
  ('11111111-1111-1111-1111-111111111112', 'manager.delicious', 'manager@delicious.com', '$2a$10$manager_hash', 'John Manager', 'MANAGER', '11111111-1111-1111-1111-111111111111', true);

-- Delicious Thai - Cashiers (one per branch)
INSERT INTO users (id, username, email, password_hash, full_name, role, organization_id, branch_id, is_active) VALUES
  ('22222222-2222-2222-2222-222222222222', 'cashier.siam', 'cashier1@delicious.com', '$2a$10$cashier_hash', 'Alice Cashier', 'CASHIER', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', true),
  ('33333333-3333-3333-3333-333333333333', 'cashier.central', 'cashier2@delicious.com', '$2a$10$cashier_hash', 'Bob Cashier', 'CASHIER', '11111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', true);

-- Fast Food Corner - Manager
INSERT INTO users (id, username, email, password_hash, full_name, role, organization_id, is_active) VALUES
  ('44444444-4444-4444-4444-444444444444', 'manager.fastfood', 'manager@fastfood.com', '$2a$10$manager_hash', 'Mary Manager', 'MANAGER', '22222222-2222-2222-2222-222222222222', true);

-- Fast Food Corner - Cashier
INSERT INTO users (id, username, email, password_hash, full_name, role, organization_id, branch_id, is_active) VALUES
  ('55555555-5555-5555-5555-555555555555', 'cashier.silom', 'cashier@fastfood.com', '$2a$10$cashier_hash', 'Charlie Cashier', 'CASHIER', '22222222-2222-2222-2222-222222222222', 'b3333333-3333-3333-3333-333333333333', true);

-- ============================================================================
-- 4. TABLES
-- ============================================================================

-- Delicious Thai - Siam Branch (10 tables)
INSERT INTO tables (id, branch_id, table_number, name, capacity, zone) 
SELECT 
  gen_random_uuid(),
  'b1111111-1111-1111-1111-111111111111',
  i,
  'Table ' || i,
  CASE WHEN i <= 4 THEN 2 WHEN i <= 8 THEN 4 ELSE 6 END,
  CASE WHEN i <= 6 THEN 'indoor' ELSE 'outdoor' END
FROM generate_series(1, 10) i;

-- Delicious Thai - Central Branch (8 tables)
INSERT INTO tables (id, branch_id, table_number, name, capacity, zone) 
SELECT 
  gen_random_uuid(),
  'b2222222-2222-2222-2222-222222222222',
  i,
  'Table ' || i,
  4,
  'indoor'
FROM generate_series(1, 8) i;

-- Fast Food Corner - Silom Branch (6 tables)
INSERT INTO tables (id, branch_id, table_number, name, capacity, zone) 
SELECT 
  gen_random_uuid(),
  'b3333333-3333-3333-3333-333333333333',
  i,
  'Table ' || i,
  2,
  'indoor'
FROM generate_series(1, 6) i;

-- ============================================================================
-- 5. PROMOTIONS
-- ============================================================================

-- Delicious Thai - Org-wide promotion (all branches)
INSERT INTO promotions (id, organization_id, branch_id, code, name, discount_type, discount_value, min_order_total, valid_from, valid_until, is_active) VALUES
  ('11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', NULL, 'WELCOME20', 'Welcome 20% Discount', 'PERCENTAGE', 20, 200, NOW(), NOW() + INTERVAL '30 days', true);

-- Delicious Thai - Siam Branch only
INSERT INTO promotions (id, organization_id, branch_id, code, name, discount_type, discount_value, min_order_total, valid_from, valid_until, is_active) VALUES
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'SIAM50', 'Siam Special 50 THB Off', 'FIXED_AMOUNT', 50, 300, NOW(), NOW() + INTERVAL '7 days', true);

-- Fast Food Corner - All branches
INSERT INTO promotions (id, organization_id, branch_id, code, name, discount_type, discount_value, min_order_total, valid_from, valid_until, is_active) VALUES
  ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222', NULL, 'LUNCH10', 'Lunch Time 10% Off', 'PERCENTAGE', 10, 100, NOW(), NOW() + INTERVAL '60 days', true);

-- ============================================================================
-- 6. SAMPLE ORDERS (for testing)
-- ============================================================================

-- Order 1: Delicious Thai - Siam Branch
INSERT INTO orders (id, organization_id, branch_id, order_number, order_type, status, subtotal, tax, total_amount, created_by, created_at)
SELECT 
  '11111111-1111-1111-1111-111111111114',
  '11111111-1111-1111-1111-111111111111',
  'b1111111-1111-1111-1111-111111111111',
  generate_order_number('b1111111-1111-1111-1111-111111111111'),
  'DINE_IN',
  'OPEN',
  0,
  0,
  0,
  '22222222-2222-2222-2222-222222222222',
  NOW();

-- Order items for Order 1
INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_category, quantity, unit_price, item_total, item_status, added_by, created_at) VALUES
  ('11111111-1111-1111-1111-111111111114', 'MENU-001', 'Pad Thai', 'Main Course', 2, 120.00, 240.00, 'PENDING', '22222222-2222-2222-2222-222222222222', NOW()),
  ('11111111-1111-1111-1111-111111111114', 'MENU-002', 'Tom Yum Soup', 'Soup', 1, 150.00, 150.00, 'PENDING', '22222222-2222-2222-2222-222222222222', NOW()),
  ('11111111-1111-1111-1111-111111111114', 'MENU-003', 'Thai Iced Tea', 'Beverage', 2, 45.00, 90.00, 'READY', '22222222-2222-2222-2222-222222222222', NOW());

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Display summary
SELECT 
  'Organizations' AS entity, 
  COUNT(*)::TEXT AS count 
FROM organizations
UNION ALL
SELECT 'Branches', COUNT(*)::TEXT FROM branches
UNION ALL
SELECT 'Users', COUNT(*)::TEXT FROM users
UNION ALL
SELECT 'Tables', COUNT(*)::TEXT FROM tables
UNION ALL
SELECT 'Promotions', COUNT(*)::TEXT FROM promotions
UNION ALL
SELECT 'Orders', COUNT(*)::TEXT FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*)::TEXT FROM order_items;

-- Display user roles
SELECT 
  role,
  COUNT(*) AS user_count
FROM users
GROUP BY role
ORDER BY role;

-- Display branches per org
SELECT 
  o.name AS organization,
  COUNT(b.id) AS branch_count
FROM organizations o
LEFT JOIN branches b ON o.id = b.organization_id
GROUP BY o.id, o.name;

EOF

echo ""
echo "=========================================="
echo "✅ Sample data seeded successfully!"
echo "=========================================="
echo ""
echo "Test Credentials:"
echo "  Admin:     admin / anypassword"
echo "  Manager:   manager.delicious / anypassword"
echo "  Cashier:   cashier.siam / anypassword"
echo ""
