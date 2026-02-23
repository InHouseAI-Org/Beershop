# Database Migrations

## History Tables Migration

This migration creates two new tables to track transaction history:

1. **credit_collection_history** - Tracks all credit collections from credit holders
2. **distributor_payment_history** - Tracks all payments made to distributors

### Running the Migration

To create the history tables, run:

```bash
cd /Users/manavbathija/Desktop/Beershop/backend
node src/config/migrations/run_history_tables.js
```

### What Gets Created

**credit_collection_history table:**
- id (Primary Key)
- organisation_id (Foreign Key to organisations)
- credit_holder_id (Foreign Key to credit_holders)
- amount_collected
- previous_outstanding
- new_outstanding
- collected_by (Foreign Key to admins)
- collected_at (Timestamp)
- notes

**distributor_payment_history table:**
- id (Primary Key)
- organisation_id (Foreign Key to organisations)
- distributor_id (Foreign Key to distributors)
- amount_paid
- previous_outstanding
- new_outstanding
- paid_by (Foreign Key to admins)
- paid_at (Timestamp)
- notes

### Notes

- These tables are automatically populated when credit is collected or distributor payments are made
- History records are never deleted (for audit trail)
- All timestamps use database server time
