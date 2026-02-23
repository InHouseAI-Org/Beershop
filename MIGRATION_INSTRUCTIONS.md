# Database Migration Instructions

## Add opening_stock Column to Sales Table

Before using the new Add Sales feature, you need to run the following database migration:

### Option 1: Using psql command line

```bash
psql -h localhost -U bs_user -d beershop -c "ALTER TABLE sales ADD COLUMN IF NOT EXISTS opening_stock JSONB;"
```

### Option 2: Using the migration file

```bash
psql -h localhost -U bs_user -d beershop -f backend/src/config/migrations/add_opening_stock.sql
```

### Option 3: Reinitialize the entire database (WARNING: This will delete all data)

```bash
psql -h localhost -U bs_user -d beershop -f backend/src/config/schema.sql
```

## Verify Migration

After running the migration, verify that the column was added:

```bash
psql -h localhost -U bs_user -d beershop -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sales';"
```

You should see `opening_stock` listed with data type `jsonb`.
