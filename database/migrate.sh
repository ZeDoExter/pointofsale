#!/bin/bash
# Database migration helper

set -e

DB_HOST="${1:-localhost}"
DB_PORT="${2:-5432}"
DB_USER="${3:-user}"
DB_PASSWORD="${4:-password}"
DB_NAME="${5:-pointofsale}"

export PGPASSWORD="$DB_PASSWORD"

echo "Running migrations on $DB_HOST:$DB_PORT/$DB_NAME..."

# Check if database exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -l | grep -q "$DB_NAME"; then
  echo "Database $DB_NAME already exists"
else
  echo "Creating database $DB_NAME..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"
fi

# Run schema
echo "Running schema.sql..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/schema.sql" > /dev/null

echo "✓ Migrations complete"
