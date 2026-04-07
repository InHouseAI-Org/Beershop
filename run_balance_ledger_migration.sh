#!/bin/bash

# Balance Ledger Migration Script
# This script creates the balance_transactions table and populates it with historical data

echo "=========================================="
echo "Balance Ledger System Migration"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set!"
    echo ""
    echo "Please set your DATABASE_URL first:"
    echo "  export DATABASE_URL='your-connection-string'"
    echo ""
    exit 1
fi

echo "✓ DATABASE_URL found"
echo ""
echo "This migration will:"
echo "  1. Create balance_transactions table"
echo "  2. Create balance_ledger view"
echo "  3. Import historical data from:"
echo "     - sales (cash and UPI allocations)"
echo "     - expenses"
echo "     - balance_transfers"
echo "     - miscellaneous_income"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Running migration..."
echo ""

# Run the SQL migration
psql "$DATABASE_URL" -f create_balance_ledger_tables.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Migration completed successfully!"
    echo "=========================================="
    echo ""
    echo "The balance ledger system is now active."
    echo "You can now use:"
    echo "  - GET /api/balance-ledger/cash/ledger"
    echo "  - GET /api/balance-ledger/bank/ledger"
    echo "  - GET /api/balance-ledger/gala/ledger"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "❌ Migration failed!"
    echo "=========================================="
    echo ""
    echo "Please check the error messages above."
    exit 1
fi
