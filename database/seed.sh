#!/bin/bash
# Load sample data into database

set -e

PGPASSWORD="password" psql -h localhost -U user -d pointofsale << EOF

-- Insert sample users
INSERT INTO users (id, username, password_hash, role, name, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'cashier1', 'hash1', 'cashier', 'Cashier One', true),
  ('550e8400-e29b-41d4-a716-446655440001', 'manager1', 'hash2', 'manager', 'Manager One', true)
ON CONFLICT DO NOTHING;

-- Insert sample tables
INSERT INTO tables (table_number, name, capacity, is_active) VALUES
  (1, 'Table 1', 4, true),
  (2, 'Table 2', 6, true),
  (3, 'Table 3', 2, true),
  (4, 'Bar Seat 1', 1, true),
  (5, 'Bar Seat 2', 1, true)
ON CONFLICT DO NOTHING;

-- Insert sample promotions
INSERT INTO promotions (id, code, name, discount_type, discount_value, max_discount, min_order_total, is_active) VALUES
  ('promo-001', 'SUMMER20', '20% Summer Discount', 'PERCENTAGE', 20, 500, 100, true),
  ('promo-002', 'WELCOME50', 'Welcome Bonus', 'FIXED_AMOUNT', 50, NULL, 200, true),
  ('promo-003', 'LUNCH10', '10% Lunch Special', 'PERCENTAGE', 10, 150, 50, true)
ON CONFLICT DO NOTHING;

-- Insert sample payment methods
INSERT INTO payment_methods (type, name, is_active) VALUES
  ('CASH', 'Cash Register', true),
  ('CARD', 'Card Reader', true),
  ('QRCODE', 'Mobile Payment', true)
ON CONFLICT DO NOTHING;

-- Create a sample order
INSERT INTO orders (id, table_id, order_number, status, subtotal, tax, discount_amount, total_amount, created_by, created_at, updated_at)
VALUES ('order-001', 1, 1, 'OPEN', 300, 45, 0, 345, '550e8400-e29b-41d4-a716-446655440000', NOW(), NOW())
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
