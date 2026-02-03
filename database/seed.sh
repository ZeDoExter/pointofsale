#!/bin/bash
# Load sample data into database

set -e

PGPASSWORD="password" psql -h localhost -U user -d pointofsale << EOF

-- Insert organization and branch
INSERT INTO organizations (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Delicious Group')
ON CONFLICT DO NOTHING;

INSERT INTO branches (id, organization_id, name) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Bangkok - Siam')
ON CONFLICT DO NOTHING;

-- Insert sample users with different roles
INSERT INTO users (id, username, password_hash, role, name, organization_id, branch_id, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'admin', 'hash_admin', 'admin', 'Admin User', NULL, NULL, true),
  ('550e8400-e29b-41d4-a716-446655440001', 'manager', 'hash_manager', 'manager', 'Manager User', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', true),
  ('550e8400-e29b-41d4-a716-446655440002', 'cashier', 'hash_cashier', 'cashier', 'Cashier User', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', true)
ON CONFLICT DO NOTHING;

-- Insert sample tables
INSERT INTO tables (branch_id, table_number, name, capacity, is_active) VALUES
  ('22222222-2222-2222-2222-222222222222', 1, 'Table 1', 4, true),
  ('22222222-2222-2222-2222-222222222222', 2, 'Table 2', 6, true),
  ('22222222-2222-2222-2222-222222222222', 3, 'Table 3', 2, true),
  ('22222222-2222-2222-2222-222222222222', 4, 'Bar Seat 1', 1, true),
  ('22222222-2222-2222-2222-222222222222', 5, 'Bar Seat 2', 1, true)
ON CONFLICT DO NOTHING;

-- Insert sample promotions
INSERT INTO promotions (id, code, name, discount_type, discount_value, max_discount, min_order_total, is_active, organization_id, branch_id) VALUES
  ('promo-001', 'SUMMER20', '20% Summer Discount', 'PERCENTAGE', 20, 500, 100, true, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('promo-002', 'WELCOME50', 'Welcome Bonus', 'FIXED_AMOUNT', 50, NULL, 200, true, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('promo-003', 'LUNCH10', '10% Lunch Special', 'PERCENTAGE', 10, 150, 50, true, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- Insert sample payment methods
INSERT INTO payment_methods (type, name, is_active) VALUES
  ('CASH', 'Cash Register', true),
  ('CARD', 'Card Reader', true),
  ('QRCODE', 'Mobile Payment', true)
ON CONFLICT DO NOTHING;

-- Create a sample order
INSERT INTO orders (id, organization_id, branch_id, table_id, order_number, status, subtotal, tax, discount_amount, total_amount, created_by, created_at, updated_at)
VALUES ('order-001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 1, 1, 'OPEN', 300, 45, 0, 345, '550e8400-e29b-41d4-a716-446655440000', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create sample order items
INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, item_total, item_status, added_by, created_at)
VALUES
  ('item-001', 'order-001', 'burger-01', 'Cheeseburger', 2, 99.99, 199.98, 'PENDING', '550e8400-e29b-41d4-a716-446655440000', NOW()),
  ('item-002', 'order-001', 'fries-01', 'French Fries', 1, 49.99, 49.99, 'PENDING', '550e8400-e29b-41d4-a716-446655440000', NOW()),
  ('item-003', 'order-001', 'drink-01', 'Coke', 3, 25.00, 75.00, 'PENDING', '550e8400-e29b-41d4-a716-446655440000', NOW())
ON CONFLICT DO NOTHING;

SELECT 'Sample data loaded successfully' AS status;

EOF
