#!/bin/bash

# Production Migration Script
# This script runs necessary migrations on your production database

echo "🚀 Running Production Migrations"
echo "=================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$NEON_DATABASE_URL" ]; then
  echo "❌ Error: NEON_DATABASE_URL environment variable not set"
  echo ""
  echo "Usage:"
  echo "  export NEON_DATABASE_URL='your-neon-connection-string'"
  echo "  bash run_production_migrations.sh"
  echo ""
  exit 1
fi

echo "📝 Migration 1: Adding buy_price column to products..."
psql "$NEON_DATABASE_URL" -f add_buy_price_to_products.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 1 completed"
else
  echo "❌ Migration 1 failed"
  exit 1
fi
echo ""

echo "📝 Migration 2: Creating prepaid expenses tables..."
psql "$NEON_DATABASE_URL" -f create_prepaid_expenses.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 2 completed"
else
  echo "❌ Migration 2 failed"
  exit 1
fi
echo ""

echo "📝 Migration 3: Updating prepaid expenses for period-based amortization..."
psql "$NEON_DATABASE_URL" -f update_prepaid_expenses_amortization.sql
if [ $? -eq 0 ]; then
  echo "✅ Migration 3 completed"
else
  echo "❌ Migration 3 failed"
  exit 1
fi
echo ""

echo "🎉 All migrations completed successfully!"
echo ""
echo "Next steps:"
echo "1. Test the amortization endpoint manually:"
echo "   curl -X POST https://your-backend.vercel.app/api/prepaid-expenses/amortize/daily"
echo ""
echo "2. Run the GitHub Action again"
