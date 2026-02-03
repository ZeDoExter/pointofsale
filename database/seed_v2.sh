#!/bin/bash
# Seed data for V2 schema
# Minimal seed: keep only admin user, clear all tenant data

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
-- RESET ALL DATA
-- ============================================================================
TRUNCATE TABLE IF EXISTS order_discounts, order_items, orders, payments, promotion_usage, promotions, qr_sessions, tables, users, branches, organizations CASCADE;

-- ============================================================================
-- ADMIN USER ONLY
-- ============================================================================
INSERT INTO users (id, username, password_hash, role, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin', '$2a$10$dev_admin_hash', 'ADMIN', 'System Administrator', true);

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 'Organizations' AS entity, COUNT(*)::TEXT AS count FROM organizations
UNION ALL
SELECT 'Branches', COUNT(*)::TEXT FROM branches
UNION ALL
SELECT 'Users', COUNT(*)::TEXT FROM users
UNION ALL
SELECT 'Orders', COUNT(*)::TEXT FROM orders
UNION ALL
SELECT 'Payments', COUNT(*)::TEXT FROM payments;

EOF

echo ""
echo "=========================================="
echo "✅ Sample data seeded successfully!"
echo "=========================================="
echo ""
echo "Test Credentials:"
echo "  Admin:     admin / anypassword"
echo ""
