# 🚀 Neon Database Migration Guide - Complete Setup with Your Data

This guide will help you set up your complete Beershop database on Neon with ALL your actual data.

---

## 📋 What You Have

1. **NEON_FINAL_MIGRATION_WITH_YOUR_DATA.sql** - Complete schema + YOUR actual data (RECOMMENDED)
2. **NEON_COMPLETE_MIGRATION_WITH_DATA.sql** - Schema + sample demo data
3. **DATA_INSERTS.sql** - Just your data inserts
4. **generate-data-sql.js** - Script that generated the data SQL

---

## ⚡ Quick Start (Recommended)

### Step 1: Login to Neon
1. Go to https://console.neon.tech/
2. Login to your account
3. Select your project
4. Click on **"SQL Editor"**

### Step 2: Run the Complete Migration
1. Open the file: `NEON_FINAL_MIGRATION_WITH_YOUR_DATA.sql`
2. Copy the ENTIRE contents (Ctrl+A, Ctrl+C)
3. Paste into the Neon SQL Editor
4. Click **"Run"** or press `Ctrl+Enter` / `Cmd+Enter`

### Step 3: Verify Success
The script will output verification queries at the end showing:
- All 16 tables created ✅
- Row counts for each table ✅
- Your organization data ✅
- Your products list ✅
- Your inventory ✅

---

## 📊 What Gets Migrated

### Your Actual Data:
- ✅ 1 Super Admin (username: admin)
- ✅ 1 Organization (SBB)
- ✅ 1 Admin (Haresh)
- ✅ 1 User (Santosh)
- ✅ **55 Products** (All your beer products!)
- ✅ **55 Inventory items** (Current stock levels)
- ✅ **1 Sales record** (Your latest sale)

### Products Included:
Your complete product catalog including:
- Kingfisher variants (QT, H, C, M, Mild)
- Budweiser (QT, H)
- Elephants, Magnums, TBS/TBM variants
- Specialty items (Samara, AK 47, Port 1000, etc.)
- Energy drinks (Red Bull, Rio Energy)
- Snacks and miscellaneous items

### Schema Features:
- ✅ All 16 tables with latest features
- ✅ Miscellaneous split (Cash/UPI)
- ✅ Gala balance tracking
- ✅ Daily expenses linked to sales
- ✅ Balance transfers feature
- ✅ Credit collection with types
- ✅ All indexes for performance
- ✅ All constraints and checks

---

## 🔐 Login Credentials

After migration, login with:

### Super Admin:
- Username: `admin`
- Password: *(Your existing password - already hashed in the database)*

### Admin:
- Username: `Haresh`
- Password: *(Your existing password - already hashed in the database)*

### User:
- Username: `Santosh `
- Password: *(Your existing password - already hashed in the database)*

*Note: All passwords are already properly bcrypt hashed from your backup.*

---

## ✅ Verification Checklist

After running the migration, verify:

1. **Check Tables Created:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Should show 16 tables.

2. **Check Your Organization:**
```sql
SELECT * FROM organisations;
```

Should show: SBB

3. **Check Your Products:**
```sql
SELECT COUNT(*) as product_count FROM products;
SELECT product_name, sale_price FROM products ORDER BY product_name LIMIT 10;
```

Should show 55 products.

4. **Check Your Inventory:**
```sql
SELECT p.product_name, i.qty
FROM inventory i
JOIN products p ON i.product_id = p.id
ORDER BY i.qty DESC
LIMIT 10;
```

Should show your stock levels.

5. **Check Your Users:**
```sql
SELECT username FROM users;
SELECT username FROM admins;
```

Should show Santosh and Haresh.

---

## 🛠️ Update Database Connection

After successful migration, update your `.env` file:

```env
# Neon Database Configuration
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password

# Or use connection string format:
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
```

---

## 🎯 Next Steps

1. ✅ Run the migration in Neon SQL Editor
2. ✅ Verify all data is present
3. ✅ Update your `.env` file
4. ✅ Test application login
5. ✅ Start using your application!

---

## 📝 Database Schema Overview

### Core Tables (14):
1. super_admins - System superuser accounts
2. organisations - Your business entities
3. admins - Admin users per organization
4. users - Regular users (sales staff)
5. products - Your product catalog
6. inventory - Current stock levels
7. credit_holders - Customers with credit
8. distributors - Your suppliers
9. sales - Daily sales records
10. orders - Distributor orders
11. balances - Daily balance snapshots
12. expenses - Regular expenses
13. credit_collection_history - Credit tracking
14. distributor_payment_history - Payment tracking

### New Feature Tables (2):
15. daily_expenses - Expenses from gala (linked to sales)
16. balance_transfers - Money transfers between accounts

---

## 🚨 Troubleshooting

### Error: "extension uuid-ossp does not exist"
**Solution:** Neon auto-enables this. If you see this, it's likely already enabled. Ignore or contact Neon support.

### Error: "relation already exists"
**Solution:** The script includes `DROP TABLE IF EXISTS` commands. Old tables will be dropped first.

### Data doesn't show up
**Solution:**
1. Check for errors in the SQL Editor output
2. Verify the migration completed without errors
3. Run the verification queries above

### Can't login after migration
**Solution:**
1. Your passwords are already hashed in the migration
2. Use your existing passwords
3. If forgotten, you can reset via the database or super admin

---

## 📦 File Structure

```
Beershop/
├── NEON_FINAL_MIGRATION_WITH_YOUR_DATA.sql  ← USE THIS!
├── NEON_COMPLETE_MIGRATION_WITH_DATA.sql    (sample data version)
├── DATA_INSERTS.sql                         (just your data)
├── NEON_MIGRATION_INSTRUCTIONS.md           (this file)
├── generate-data-sql.js                     (generator script)
└── data 22-03-32-916/                       (your backup)
    ├── super_admins.json
    ├── organisations.json
    ├── admins.json
    ├── users.json
    ├── products.json
    ├── inventory.json
    └── sales.json
```

---

## 💡 Tips

1. **Backup Your Data**: The migration includes `DROP TABLE` commands. Make sure you have backups.

2. **Run Once**: Only run the migration once. If you need to re-run, it will drop and recreate everything.

3. **Verify First**: After migration, run verification queries before connecting your app.

4. **Test Login**: Test super admin, admin, and user logins before deploying.

5. **Monitor Performance**: Neon provides excellent monitoring. Check the dashboard after migration.

---

## 🎉 Success!

Once you see all verification queries passing, your database is ready!

You now have:
- ✅ Complete database schema with all latest features
- ✅ All your actual products and inventory
- ✅ Your user accounts with original passwords
- ✅ Your sales history
- ✅ Optimized indexes for performance
- ✅ All constraints and validations

**You're ready to run your beer shop application on Neon!** 🍺

---

## 📞 Support

If you encounter issues:
1. Check the Neon SQL Editor for specific error messages
2. Review the verification queries
3. Check your `.env` configuration
4. Review the Neon dashboard logs

---

**Generated with your actual data from backup: 2026-02-25**
