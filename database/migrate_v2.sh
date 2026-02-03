#!/bin/bash
# Migration script from V1 to V2 schema
# This will backup existing data and migrate to new multi-tenant structure

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-pointofsale}"
DB_USER="${DB_USER:-user}"
PGPASSWORD="${PGPASSWORD:-password}"

export PGPASSWORD

echo "=========================================="
echo "POS Database Migration V1 → V2"
echo "=========================================="
echo ""

# Check if database exists
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
  echo "❌ Database $DB_NAME does not exist"
  exit 1
fi

echo "📊 Current database: $DB_NAME"
echo ""

# 1. Backup existing data
echo "Step 1: Backing up existing data..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME > $BACKUP_FILE
echo "✅ Backup saved to: $BACKUP_FILE"
echo ""

# 2. Check existing data
echo "Step 2: Checking existing data..."
EXISTING_ORDERS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM orders" 2>/dev/null || echo "0")
EXISTING_USERS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")
echo "   Orders: $EXISTING_ORDERS"
echo "   Users: $EXISTING_USERS"
echo ""

# 3. Drop and recreate database
echo "Step 3: Recreating database..."
echo "⚠️  WARNING: This will DELETE all existing data!"
read -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "❌ Migration cancelled"
  exit 1
fi

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
EOF
echo "✅ Database recreated"
echo ""

# 4. Apply new schema
echo "Step 4: Applying new schema V2..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema_v2.sql
echo "✅ Schema V2 applied"
echo ""

# 5. Verify schema
echo "Step 5: Verifying schema..."
TABLES=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
VIEWS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.views WHERE table_schema='public'")
echo "   Tables created: $TABLES"
echo "   Views created: $VIEWS"
echo ""

echo "=========================================="
echo "✅ Migration completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run seed_v2.sh to populate sample data"
echo "2. Update your services to use new schema"
echo "3. Test the system"
echo ""
echo "Backup file: $BACKUP_FILE"
