#!/bin/bash

# Push Distributor Outstanding Fix to Production
# This script applies the distributor outstanding trigger fix to your production database

echo "🚀 Pushing Distributor Outstanding Fix to Production"
echo "===================================================="
echo ""

# Check if DATABASE_URL is set (adjust variable name based on your setup)
if [ -z "$DATABASE_URL" ] && [ -z "$NEON_DATABASE_URL" ] && [ -z "$PRODUCTION_DATABASE_URL" ]; then
  echo "❌ Error: Production database URL not set"
  echo ""
  echo "Please set one of the following environment variables:"
  echo "  export DATABASE_URL='your-production-connection-string'"
  echo "  export NEON_DATABASE_URL='your-neon-connection-string'"
  echo "  export PRODUCTION_DATABASE_URL='your-production-connection-string'"
  echo ""
  echo "Then run this script again:"
  echo "  bash push_to_production.sh"
  echo ""
  exit 1
fi

# Use whichever variable is set
PROD_DB_URL="${DATABASE_URL:-${NEON_DATABASE_URL:-$PRODUCTION_DATABASE_URL}}"

echo "📝 Applying distributor outstanding trigger fix..."
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ Error: psql command not found"
  echo ""
  echo "Option 1: Install PostgreSQL client tools"
  echo "  macOS: brew install postgresql"
  echo "  Ubuntu: sudo apt-get install postgresql-client"
  echo ""
  echo "Option 2: Use the Node.js script instead:"
  echo "  export NEON_DATABASE_URL='your-connection-string'"
  echo "  node apply_neon_trigger_fix.js"
  echo ""
  exit 1
fi

# Run the migration
psql "$PROD_DB_URL" -f fix_distributor_outstanding_production.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Fix applied successfully to production!"
  echo ""
  echo "What was fixed:"
  echo "  ✓ Database triggers created to auto-update outstanding amounts"
  echo "  ✓ Opening balance now included in calculations"
  echo "  ✓ All distributor balances recalculated correctly"
  echo ""
  echo "Formula: Outstanding = Opening Balance + Total Orders - Total Payments"
  echo ""
else
  echo ""
  echo "❌ Fix failed to apply"
  echo ""
  echo "If psql is not available, use the Node.js script instead:"
  echo "  export NEON_DATABASE_URL='your-connection-string'"
  echo "  node apply_neon_trigger_fix.js"
  echo ""
  exit 1
fi
