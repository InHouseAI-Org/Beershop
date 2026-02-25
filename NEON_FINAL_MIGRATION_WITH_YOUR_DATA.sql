-- ============================================
-- BEERSHOP DATABASE - COMPLETE SCHEMA + SAMPLE DATA
-- Run this script in Neon SQL Editor to create all tables and insert sample data
-- ============================================

-- Enable UUID extension (required for primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING TABLES (if any)
-- ============================================
DROP TABLE IF EXISTS balance_transfers CASCADE;
DROP TABLE IF EXISTS daily_expenses CASCADE;
DROP TABLE IF EXISTS distributor_payment_history CASCADE;
DROP TABLE IF EXISTS credit_collection_history CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS balances CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS distributors CASCADE;
DROP TABLE IF EXISTS credit_holders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS organisations CASCADE;
DROP TABLE IF EXISTS super_admins CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Super Admin table
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'superadmin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organisations table
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_name VARCHAR(255) NOT NULL,
  cash_balance DECIMAL(10, 2) DEFAULT 0,
  bank_balance DECIMAL(10, 2) DEFAULT 0,
  gala_balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admins table (one admin per organisation)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID UNIQUE NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  average_buy_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organisation_id, product_id)
);

-- Users table (many users per organisation)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit Holders table
CREATE TABLE credit_holders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  amount_payable DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Distributors table
CREATE TABLE distributors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  amount_outstanding DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales table (with all latest columns)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_stock JSONB,
  closing_stock JSONB,
  sale JSONB,
  cash_collected DECIMAL(10, 2) DEFAULT 0,
  upi DECIMAL(10, 2) DEFAULT 0,
  miscellaneous DECIMAL(10, 2) DEFAULT 0,
  miscellaneous_type VARCHAR(50) DEFAULT 'cash' CHECK (miscellaneous_type IN ('cash', 'upi', 'both')),
  miscellaneous_cash DECIMAL(10, 2) DEFAULT 0,
  miscellaneous_upi DECIMAL(10, 2) DEFAULT 0,
  gala_balance_today DECIMAL(10, 2) DEFAULT 0,
  credit JSONB,
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN sales.miscellaneous IS 'Total extra sales (chakhna, bags, etc)';
COMMENT ON COLUMN sales.miscellaneous_type IS 'Type of miscellaneous transaction: cash, upi, or both';
COMMENT ON COLUMN sales.miscellaneous_cash IS 'Extra cash sales (chakhna, bags, etc) - cash payment';
COMMENT ON COLUMN sales.miscellaneous_upi IS 'Extra sales (chakhna, bags, etc) - UPI payment';
COMMENT ON COLUMN sales.gala_balance_today IS 'Gala balance at end of day (user input for calculation)';
COMMENT ON COLUMN sales.admin_id IS 'Admin who created/edited this sale (for super admin functionality)';

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_data JSONB,
  tax DECIMAL(10, 2) DEFAULT 0,
  misc DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  scheme DECIMAL(10, 2) DEFAULT 0,
  payment_outstanding_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Balances table (daily balance snapshots per sales entry)
CREATE TABLE balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  sales_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cash_balance DECIMAL(10, 2) DEFAULT 0,
  bank_balance DECIMAL(10, 2) DEFAULT 0,
  gala_balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sales_id)
);

-- Expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  expense_name VARCHAR(255) NOT NULL,
  description TEXT,
  expense_from VARCHAR(20) NOT NULL CHECK (expense_from IN ('cash_balance', 'bank_balance', 'gala_balance')),
  expense_amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Expenses table (NEW - linked to sales)
CREATE TABLE daily_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE daily_expenses IS 'Daily expenses recorded with sales reports (deducted from gala balance)';

-- Credit Collection History
CREATE TABLE credit_collection_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  credit_holder_id UUID NOT NULL REFERENCES credit_holders(id) ON DELETE CASCADE,
  amount_collected DECIMAL(10, 2) NOT NULL,
  previous_outstanding DECIMAL(10, 2) NOT NULL,
  new_outstanding DECIMAL(10, 2) NOT NULL,
  collected_by UUID NOT NULL,
  notes TEXT,
  transaction_type VARCHAR(20) DEFAULT 'collected' CHECK (transaction_type IN ('given', 'collected')),
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  collected_in VARCHAR(20) CHECK (collected_in IN ('cash_balance', 'bank_balance', 'gala_balance')),
  collection_type VARCHAR(50) DEFAULT 'regular' CHECK (collection_type IN ('regular', 'collected_on_shop')),
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN credit_collection_history.collection_type IS 'Type: regular (from collect modal) or collected_on_shop (from sales form)';

-- Distributor Payment History
CREATE TABLE distributor_payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL,
  previous_outstanding DECIMAL(10, 2) NOT NULL,
  new_outstanding DECIMAL(10, 2) NOT NULL,
  paid_by UUID NOT NULL,
  notes TEXT,
  paid_from VARCHAR(20) CHECK (paid_from IN ('cash_balance', 'bank_balance', 'gala_balance')),
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Balance Transfers table (NEW)
CREATE TABLE balance_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  from_account VARCHAR(50) NOT NULL CHECK (from_account IN ('cash_balance', 'bank_balance', 'gala_balance')),
  to_account VARCHAR(50) NOT NULL CHECK (to_account IN ('cash_balance', 'bank_balance', 'gala_balance')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_username VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT different_accounts CHECK (from_account != to_account)
);

COMMENT ON TABLE balance_transfers IS 'Records of money transfers between different balance accounts (cash, bank, gala)';
COMMENT ON COLUMN balance_transfers.created_by_username IS 'Username of the person who created this transfer (for admins/superadmins)';

-- ============================================
-- CREATE INDEXES (for better performance)
-- ============================================

-- Super Admins
CREATE INDEX idx_super_admins_username ON super_admins(username);

-- Admins
CREATE INDEX idx_admins_organisation_id ON admins(organisation_id);
CREATE INDEX idx_admins_username ON admins(username);

-- Products
CREATE INDEX idx_products_organisation_id ON products(organisation_id);

-- Inventory
CREATE INDEX idx_inventory_organisation_id ON inventory(organisation_id);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);

-- Users
CREATE INDEX idx_users_organisation_id ON users(organisation_id);
CREATE INDEX idx_users_username ON users(username);

-- Credit Holders
CREATE INDEX idx_credit_holders_organisation_id ON credit_holders(organisation_id);

-- Distributors
CREATE INDEX idx_distributors_organisation_id ON distributors(organisation_id);

-- Sales
CREATE INDEX idx_sales_organisation_id ON sales(organisation_id);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_admin_id ON sales(admin_id);
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_status ON sales(status);

-- Orders
CREATE INDEX idx_orders_organisation_id ON orders(organisation_id);
CREATE INDEX idx_orders_distributor_id ON orders(distributor_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);

-- Balances
CREATE INDEX idx_balances_organisation_id ON balances(organisation_id);
CREATE INDEX idx_balances_sales_id ON balances(sales_id);
CREATE INDEX idx_balances_date ON balances(date);

-- Expenses
CREATE INDEX idx_expenses_organisation_id ON expenses(organisation_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_expense_from ON expenses(expense_from);

-- Daily Expenses
CREATE INDEX idx_daily_expenses_organisation_id ON daily_expenses(organisation_id);
CREATE INDEX idx_daily_expenses_sale_id ON daily_expenses(sale_id);
CREATE INDEX idx_daily_expenses_expense_date ON daily_expenses(expense_date);

-- Credit Collection History
CREATE INDEX idx_credit_collection_history_organisation_id ON credit_collection_history(organisation_id);
CREATE INDEX idx_credit_collection_history_credit_holder_id ON credit_collection_history(credit_holder_id);
CREATE INDEX idx_credit_collection_history_collected_at ON credit_collection_history(collected_at);
CREATE INDEX idx_credit_collection_history_transaction_type ON credit_collection_history(transaction_type);
CREATE INDEX idx_credit_collection_history_sale_id ON credit_collection_history(sale_id);
CREATE INDEX idx_credit_collection_history_collected_in ON credit_collection_history(collected_in);

-- Distributor Payment History
CREATE INDEX idx_distributor_payment_history_organisation_id ON distributor_payment_history(organisation_id);
CREATE INDEX idx_distributor_payment_history_distributor_id ON distributor_payment_history(distributor_id);
CREATE INDEX idx_distributor_payment_history_paid_at ON distributor_payment_history(paid_at);
CREATE INDEX idx_distributor_payment_history_paid_from ON distributor_payment_history(paid_from);

-- Balance Transfers
CREATE INDEX idx_balance_transfers_organisation_id ON balance_transfers(organisation_id);
CREATE INDEX idx_balance_transfers_transaction_date ON balance_transfers(transaction_date);
CREATE INDEX idx_balance_transfers_created_by ON balance_transfers(created_by);

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Insert Super Admin
-- Password: admin123 (bcrypt hashed)
INSERT INTO super_admins (username, password, role) VALUES
('superadmin', '$2b$10$YourHashedPasswordHere', 'superadmin');

-- Insert Sample Organisation
INSERT INTO organisations (id, organisation_name, cash_balance, bank_balance, gala_balance)
VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Demo Beer Shop', 50000.00, 100000.00, 25000.00);

-- Insert Admin for Organisation
-- Password: admin123 (bcrypt hashed)
INSERT INTO admins (organisation_id, username, password, email, role)
VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin', '$2b$10$YourHashedPasswordHere', 'admin@demoshop.com', 'admin');

-- Insert Sample Users
-- Password: user123 (bcrypt hashed)
INSERT INTO users (organisation_id, username, password)
VALUES
('550e8400-e29b-41d4-a716-446655440000', 'user1', '$2b$10$YourHashedPasswordHere'),
('550e8400-e29b-41d4-a716-446655440000', 'user2', '$2b$10$YourHashedPasswordHere');

-- Insert Sample Products
INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price)
VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Kingfisher 650ml', 180.00, 150.00),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Budweiser 330ml', 120.00, 95.00),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Corona 330ml', 200.00, 165.00),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Heineken 330ml', 150.00, 125.00),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', 'Carlsberg 500ml', 140.00, 115.00);

-- Insert Sample Inventory
INSERT INTO inventory (organisation_id, product_id, qty)
VALUES
('550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', 200),
('550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002', 150),
('550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440003', 100),
('550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440004', 180),
('550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440005', 220);

-- Insert Sample Credit Holders
INSERT INTO credit_holders (id, organisation_id, name, address, phone, amount_payable)
VALUES
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Rajesh Kumar', 'Shop 12, Main Market', '9876543210', 5000.00),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Suresh Sharma', 'Street 5, Area 2', '9876543211', 3500.00),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Amit Verma', 'House 45, Sector 3', '9876543212', 2000.00);

-- Insert Sample Distributors
INSERT INTO distributors (id, organisation_id, name, address, phone, amount_outstanding)
VALUES
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'United Breweries Ltd', 'Industrial Area', '1234567890', 150000.00),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'AB InBev India', 'Warehouse District', '1234567891', 200000.00),
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Carlsberg India', 'Supply Zone', '1234567892', 75000.00);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify success:

-- Count all tables
SELECT
  'super_admins' as table_name, COUNT(*) as row_count FROM super_admins
UNION ALL
SELECT 'organisations', COUNT(*) FROM organisations
UNION ALL
SELECT 'admins', COUNT(*) FROM admins
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'credit_holders', COUNT(*) FROM credit_holders
UNION ALL
SELECT 'distributors', COUNT(*) FROM distributors
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'balances', COUNT(*) FROM balances
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'daily_expenses', COUNT(*) FROM daily_expenses
UNION ALL
SELECT 'credit_collection_history', COUNT(*) FROM credit_collection_history
UNION ALL
SELECT 'distributor_payment_history', COUNT(*) FROM distributor_payment_history
UNION ALL
SELECT 'balance_transfers', COUNT(*) FROM balance_transfers;

-- Check organisation balances
SELECT organisation_name, cash_balance, bank_balance, gala_balance
FROM organisations;

-- Check products
SELECT product_name, sale_price, average_buy_price
FROM products
ORDER BY product_name;

-- Check inventory
SELECT p.product_name, i.qty
FROM inventory i
JOIN products p ON i.product_id = p.id
ORDER BY p.product_name;

-- Check credit holders
SELECT name, phone, amount_payable
FROM credit_holders
ORDER BY amount_payable DESC;

-- Check distributors
SELECT name, phone, amount_outstanding
FROM distributors
ORDER BY amount_outstanding DESC;

-- ============================================
-- IMPORTANT NOTES
-- ============================================
--
-- 1. PASSWORDS: Replace '$2b$10$YourHashedPasswordHere' with actual bcrypt hashed passwords
--    You can generate them using: https://bcrypt-generator.com/
--    Recommended: Use 'admin123' for testing
--
-- 2. UUIDs: The sample UUIDs are hardcoded for reference consistency
--    In production, remove IDs to let uuid_generate_v4() create them
--
-- 3. BALANCES: Adjust initial cash_balance, bank_balance, gala_balance as needed
--
-- 4. PRODUCTS: Add more products as per your inventory
--
-- 5. After running this script:
--    - Update passwords to proper bcrypt hashes
--    - Add more sample data as needed
--    - Test login with superadmin, admin, and user accounts
--
-- ============================================
-- Migration Complete! ✅
-- ============================================
--
-- Tables Created: 16
-- Sample Data Inserted: Yes
-- Indexes Created: Yes
-- Ready to Use: Yes
--
-- ============================================
-- ============================================
-- DATA INSERTS FROM BACKUP
-- ============================================

-- Insert Super Admins
INSERT INTO super_admins (id, username, password, role, created_at) VALUES (
  '55e6b3b4-8375-42ee-b45a-e10e60b06c6a', 'admin', '$2a$10$Yff28upXD115/NbObyPtj.UUYdj5uSbkY7FBxkjidoZycqPm7n9we',
  'superadmin', '2026-02-23 21:20:29.208399'
) ON CONFLICT (id) DO NOTHING;

-- Insert Organisations
INSERT INTO organisations (id, organisation_name, cash_balance, bank_balance, gala_balance, created_at, updated_at) VALUES (
  '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'SBB', 0, 0, 0,
  '2026-02-23 21:44:37.021617', '2026-02-23 21:44:37.021617'
) ON CONFLICT (id) DO NOTHING;

-- Insert Admins
INSERT INTO admins (id, organisation_id, username, password, email, role, created_at, updated_at) VALUES (
  '91b1d3da-26b6-408c-a7d8-35417f9b40ef', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'Haresh',
  '$2a$10$MpgUpeujFqorSZGJv13gPeJAVWLstBmM6DDGKCLhGVczUAPt1ZEaC', NULL,
  'admin', '2026-02-23 21:44:37.347796', '2026-02-23 21:44:37.347796'
) ON CONFLICT (id) DO NOTHING;

-- Insert Users
INSERT INTO users (id, organisation_id, username, password, created_at, updated_at) VALUES (
  'f9168732-b293-4c10-beda-4bc09af84f83', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'Santosh ',
  '$2a$10$FVSa8/LIbfhjX5J2Av0E1.4/v0tWkVHGbE9fhbQ38XF0g3gaMmIbS', '2026-02-23 21:45:16.900756', '2026-02-24 11:29:48.281132'
) ON CONFLICT (id) DO NOTHING;

-- Insert Products
INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '01c60f45-eb96-41db-8b12-60f41e7b7b47', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'SAMARA PT',
  240.00, 0.00,
  '2026-02-24 05:03:33.615394', '2026-02-24 05:03:33.615394'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '053eff51-345c-4d6f-84f5-092f2cb8d90d', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'RED BULL ',
  125.00, 0.00,
  '2026-02-24 06:49:32.765168', '2026-02-24 06:49:32.765168'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '147b2c6c-dd78-4490-8231-72e632d79e70', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KANGAROO ST H',
  120.00, 0.00,
  '2026-02-24 07:09:57.21442', '2026-02-24 07:09:57.21442'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '184ea678-a09a-49c8-bfe3-3cf5b78081a6', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KANGAROO ST QT',
  160.00, 0.00,
  '2026-02-24 04:53:59.416697', '2026-02-24 04:53:59.416697'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '1eab5792-0b9a-49fe-83fe-e4c95c82a6bb', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KFM H ',
  145.00, 0.00,
  '2026-02-24 06:48:07.591906', '2026-02-24 06:48:07.591906'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '21fa7a0e-5164-4008-a1ae-a200deb9c355', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'SMOOTH H ',
  190.00, 0.00,
  '2026-02-24 06:49:10.368008', '2026-02-24 06:49:10.368008'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '22262da2-2c85-43ba-acea-a2182b69499c', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KANGAROO MILD QT ',
  135.00, 0.00,
  '2026-02-24 06:46:07.246781', '2026-02-24 06:46:07.246781'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '25aa2556-0175-43c6-b930-d6627fcd4dfb', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'Heniken silver qt',
  240.00, 0.00,
  '2026-02-24 06:44:15.08368', '2026-02-24 06:44:15.08368'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '25cf6992-4b58-4f1f-ac38-10780c2c58f0', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'TBS QT',
  200.00, 0.00,
  '2026-02-24 04:52:56.136873', '2026-02-24 04:52:56.136873'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '26b49a12-a90a-4d15-912f-963c45d4cecc', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KFU MILD QT ',
  230.00, 0.00,
  '2026-02-24 06:44:55.753672', '2026-02-24 06:44:55.753672'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '2c3b5ecd-930f-4651-b4db-7f4fc07e661e', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'CLASSIC QT',
  240.00, 0.00,
  '2026-02-24 04:53:28.789262', '2026-02-24 04:53:28.789262'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '2f1e6249-8b96-4c64-a268-f1cdc38517f4', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KFS QT',
  195.00, 0.00,
  '2026-02-24 04:51:59.055134', '2026-02-24 04:51:59.055134'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '2f68fde3-0a88-4bf9-b5c5-ebd3b06c9a30', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'G FATHER QT',
  200.00, 0.00,
  '2026-02-24 04:54:28.544953', '2026-02-24 04:54:28.544953'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '398d3433-a839-4277-a851-a9b50222b502', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KANGAROO MILD H ',
  105.00, 0.00,
  '2026-02-24 06:46:28.799162', '2026-02-24 06:46:28.799162'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '52d0f9d8-3d10-4960-b18a-427aef792164', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KFU MAX QT',
  250.00, 0.00,
  '2026-02-24 04:54:56.34907', '2026-02-24 04:54:56.34907'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '548d8f5e-9ca7-4a74-ab51-1c50d3ad9832', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'DRY FRUIT ',
  20.00, 0.00,
  '2026-02-24 06:50:52.522536', '2026-02-24 06:50:52.522536'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '5a16acb1-be4c-4ce6-9604-4f14404443ce', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'LPM QT ',
  140.00, 0.00,
  '2026-02-24 06:45:15.7264', '2026-02-24 06:45:15.7264'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '5bea1f70-3dbf-40ca-8d02-fc0ef39e18ea', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'LPS H',
  135.00, 0.00,
  '2026-02-24 04:58:27.859776', '2026-02-24 04:58:27.859776'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '5c7befb4-4692-4467-9eb3-4dff8eaa09d1', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'TBM QT',
  200.00, 0.00,
  '2026-02-24 06:45:38.440379', '2026-02-24 06:45:38.440379'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '5cd77f91-5537-407a-a4c6-1de471ba8f40', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'AK 47 QT',
  280.00, 0.00,
  '2026-02-24 07:12:00.514073', '2026-02-24 07:12:00.514073'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '6610a8a2-1e9a-445a-b592-d6e5d592031d', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'CRUSIER',
  100.00, 0.00,
  '2026-02-24 05:05:39.159564', '2026-02-24 05:05:39.159564'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '69abc993-d258-4c64-a589-d2057a148730', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'G FATHER H',
  150.00, 0.00,
  '2026-02-24 04:59:26.91673', '2026-02-24 04:59:26.91673'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '6b80b747-294b-4e7f-902e-45624d33a1e9', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'BUDWISER QT',
  245.00, 0.00,
  '2026-02-24 05:06:10.273936', '2026-02-24 05:06:10.273936'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '6dda9537-1863-49c1-aa67-425763442388', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'BROCODE',
  160.00, 0.00,
  '2026-02-24 05:03:56.828933', '2026-02-24 05:03:56.828933'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '796cec0b-24d5-41e4-bf0b-39ce54e1424e', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'LPS QT',
  165.00, 0.00,
  '2026-02-24 04:52:29.990795', '2026-02-24 04:52:29.990795'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '7c2a4855-4d79-4e47-ad2d-c6ee873c331a', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KFS H',
  150.00, 0.00,
  '2026-02-24 04:56:24.363757', '2026-02-24 04:56:24.363757'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '8350cbbe-0e55-4ce8-9c53-7d25fafe382c', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'ELEPHANT H',
  200.00, 0.00,
  '2026-02-24 04:58:05.990765', '2026-02-24 04:58:05.990765'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '861eaa8f-3b3c-4349-87aa-5fa58b1721b6', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KFS C',
  115.00, 0.00,
  '2026-02-24 04:59:47.270554', '2026-02-24 04:59:47.270554'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '8b8fd743-b5bf-4ca1-b8e7-f6d7e5d8a9c5', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'BUDWEISER H ',
  190.00, 0.00,
  '2026-02-24 06:47:12.424731', '2026-02-24 06:47:12.424731'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '975c56b2-91ba-4914-ab94-824dee407163', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'TBS H',
  150.00, 0.00,
  '2026-02-24 04:56:55.924151', '2026-02-24 04:57:26.54981'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '9be27625-7017-48e0-acdf-de2f5a581761', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'BROCODE RED',
  150.00, 0.00,
  '2026-02-24 05:04:23.804348', '2026-02-24 05:04:23.804348'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  '9f1e7fed-179b-4ebb-a95a-1ddaa92d40c3', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KFM QT',
  200.00, 0.00,
  '2026-02-24 06:44:33.95642', '2026-02-24 06:44:33.95642'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'a02ab95b-f12d-4bc7-b422-f46acb78dbaa', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'MAGNUM H',
  200.00, 0.00,
  '2026-02-24 04:55:56.245288', '2026-02-24 04:55:56.245288'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'a03793a7-8483-4ded-bf6c-d0fa7c05c4f8', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'RIO QT',
  230.00, 0.00,
  '2026-02-24 05:02:09.224734', '2026-02-24 05:02:09.224734'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'ac702620-73b1-4478-82f6-e00328e2263f', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'MAGNUM QT',
  250.00, 0.00,
  '2026-02-24 04:49:49.870073', '2026-02-24 04:49:49.870073'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'aca622e2-35ff-4a13-bd23-2cf4a409cd91', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'LPM H',
  110.00, 0.00,
  '2026-02-24 06:47:32.315577', '2026-02-24 06:47:32.315577'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'ad2bc6bf-9ae1-4f18-b9f8-b020bda0ef7c', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'TBM H ',
  155.00, 0.00,
  '2026-02-24 06:48:53.577874', '2026-02-24 06:48:53.577874'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'b220fe31-0809-4804-bb0e-49c0977990aa', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'PORT 1000 QT',
  295.00, 0.00,
  '2026-02-24 05:00:48.388504', '2026-02-24 05:00:48.388504'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'b31cdfa5-ca6e-4e2a-9c08-095467fabe85', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'H2000 QT',
  160.00, 0.00,
  '2026-02-24 04:51:14.975005', '2026-02-24 04:51:14.975005'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'b3741497-3849-4f9d-b85d-c35784c9609c', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'RIO ENERGY ',
  45.00, 0.00,
  '2026-02-24 06:49:52.82001', '2026-02-24 06:49:52.82001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'b5f340ae-8e2b-440d-b5b0-d105e3948f51', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'NEW WINE ',
  70.00, 0.00,
  '2026-02-24 06:50:29.570472', '2026-02-24 06:50:29.570472'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'b6679660-70d1-41b8-812b-03c73529e5e5', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'ELEPHANT QT',
  250.00, 0.00,
  '2026-02-24 04:50:40.471809', '2026-02-24 04:50:40.471809'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'b669c501-20af-46c5-aa61-fedeb17562d6', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KFU MILD H ',
  180.00, 0.00,
  '2026-02-24 06:47:52.11499', '2026-02-24 06:47:52.11499'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'bd964884-c275-4855-a13f-bf421baed154', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'RIO PT',
  150.00, 0.00,
  '2026-02-24 05:02:34.685975', '2026-02-24 05:02:34.685975'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'c1955c6a-6658-430f-a0b3-a13f3f66fe1a', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'Smooth qt ',
  240.00, 0.00,
  '2026-02-24 06:43:07.68307', '2026-02-24 06:43:07.68307'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'c1e0eae3-e4c1-4b16-9212-598da5feed7b', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'HELL ',
  60.00, 0.00,
  '2026-02-24 06:50:04.487221', '2026-02-24 06:50:04.487221'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'cf891614-6a1b-40c8-81fc-9aeeee317c3c', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'VH WINE QT',
  400.00, 0.00,
  '2026-02-24 05:00:16.729567', '2026-02-24 05:00:16.729567'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'd2c361a8-7b96-4179-b3f0-5e832befd9cf', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'H2000 H',
  120.00, 0.00,
  '2026-02-24 04:58:55.378116', '2026-02-24 04:58:55.378116'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'd830ccc3-c35e-4548-85b9-ee709bb040ee', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'PORT 1000 NIP',
  105.00, 0.00,
  '2026-02-24 05:01:45.633498', '2026-02-24 05:01:45.633498'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'e1e3fe3c-1e61-4033-b94d-c252a1507c1d', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'RC MILD H ',
  100.00, 0.00,
  '2026-02-24 06:46:50.476168', '2026-02-24 06:46:50.476168'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'e6cd4aea-d8f5-4381-93d4-2237edd4b26f', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'PORT 1000 PT',
  185.00, 0.00,
  '2026-02-24 05:01:18.245674', '2026-02-24 05:01:18.245674'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'ec54d5ca-effa-47f8-83ad-38e37c8bd17b', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'KFU MAX H',
  180.00, 0.00,
  '2026-02-24 04:55:30.222205', '2026-02-24 04:55:30.222205'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'f1d82c8e-ca83-4f99-8854-f3ee35ff7957', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'HENIKEN H ',
  185.00, 0.00,
  '2026-02-24 06:48:31.742624', '2026-02-24 06:48:31.742624'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'f43fbc3a-8d8c-47b9-a9d4-2a1acdf9d544', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'SAMARA QT',
  425.00, 0.00,
  '2026-02-24 05:03:08.978008', '2026-02-24 05:03:08.978008'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, organisation_id, product_name, sale_price, average_buy_price, created_at, updated_at) VALUES (
  'f80af1e7-cd13-4a98-ab81-1d5ed54c0a4f', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'AK 47 PT',
  180.00, 0.00,
  '2026-02-24 05:05:10.428455', '2026-02-24 05:05:10.428455'
) ON CONFLICT (id) DO NOTHING;

-- Insert Inventory
INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '0a18e235-c806-42c8-8cba-6ca425eec083', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'ac702620-73b1-4478-82f6-e00328e2263f',
  32.00, '2026-02-24 04:49:50.156153', '2026-02-24 07:59:29.75172'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '0dc055be-3060-4bb6-9164-84cd3f873a6a', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'ad2bc6bf-9ae1-4f18-b9f8-b020bda0ef7c',
  10.00, '2026-02-24 06:48:53.801103', '2026-02-24 07:59:30.61318'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '17c6c64d-f6e4-4401-bbbd-e211989c5fd0', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '9be27625-7017-48e0-acdf-de2f5a581761',
  29.00, '2026-02-24 05:04:24.037403', '2026-02-24 06:53:18.073378'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '22afd062-57b7-46a1-849e-c79fd7118031', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '8b8fd743-b5bf-4ca1-b8e7-f6d7e5d8a9c5',
  50.00, '2026-02-24 06:47:12.641378', '2026-02-24 07:59:25.582356'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '231c965d-643e-4b9e-b828-2bc0b35765d1', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'ec54d5ca-effa-47f8-83ad-38e37c8bd17b',
  24.00, '2026-02-24 04:55:30.443268', '2026-02-24 07:00:57.028102'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '232f0c62-3212-403b-8c4f-5b37aba03fe1', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '053eff51-345c-4d6f-84f5-092f2cb8d90d',
  10.00, '2026-02-24 06:49:32.990742', '2026-02-24 07:59:30.18259'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '273f9b22-e26f-434b-a568-200c7f6de18d', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '975c56b2-91ba-4914-ab94-824dee407163',
  37.00, '2026-02-24 04:56:56.143683', '2026-02-24 07:59:30.828577'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '2b2742ff-0434-430d-a3d4-5ce3adffce25', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '21fa7a0e-5164-4008-a1ae-a200deb9c355',
  80.00, '2026-02-24 06:49:10.580997', '2026-02-24 07:07:31.611184'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '2ef21ca6-8db7-4669-87cb-5996b5bec1c4', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '1eab5792-0b9a-49fe-83fe-e4c95c82a6bb',
  28.00, '2026-02-24 06:48:07.813411', '2026-02-24 07:59:27.808009'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '2f645489-1220-4e8a-935f-fd3c6a3f5002', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'b669c501-20af-46c5-aa61-fedeb17562d6',
  14.00, '2026-02-24 06:47:52.33108', '2026-02-24 07:59:28.669636'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '3542366a-76bc-445d-8f9a-c5b670fb9c9a', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '2f1e6249-8b96-4c64-a268-f1cdc38517f4',
  97.00, '2026-02-24 04:51:59.273345', '2026-02-24 07:59:28.454438'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '3c15dd5e-93fb-4d7d-b5e9-9ef68c703c37', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '2f68fde3-0a88-4bf9-b5c5-ebd3b06c9a30',
  54.00, '2026-02-24 04:54:28.759896', '2026-02-24 06:56:33.448023'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '3d56fee7-7068-4479-9440-98643e6674e4', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '6dda9537-1863-49c1-aa67-425763442388',
  93.00, '2026-02-24 05:03:57.053611', '2026-02-24 06:53:02.853803'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '3f57e7fb-04a1-4f84-b48d-5562a02090cc', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '5c7befb4-4692-4467-9eb3-4dff8eaa09d1',
  13.00, '2026-02-24 06:45:38.669151', '2026-02-24 07:08:15.92691'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '3f5b6dee-673a-4130-a9c0-836ca7a1ed30', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '69abc993-d258-4c64-a589-d2057a148730',
  56.00, '2026-02-24 04:59:27.145321', '2026-02-24 06:56:15.442939'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '47538b48-ad84-4f36-a162-e7c8469f125f', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '548d8f5e-9ca7-4a74-ab51-1c50d3ad9832',
  89.00, '2026-02-24 06:50:52.746002', '2026-02-24 07:59:26.232873'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '485c0cc8-71ed-414a-ac26-38335bd4fecf', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '6b80b747-294b-4e7f-902e-45624d33a1e9',
  44.00, '2026-02-24 05:06:10.48561', '2026-02-24 07:59:25.802023'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '48af5c29-abb8-4d02-9151-78b66842371f', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '6610a8a2-1e9a-445a-b592-d6e5d592031d',
  3.00, '2026-02-24 05:05:39.389968', '2026-02-24 06:54:34.655813'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '4e0a410b-fa23-4fe4-9908-2823c4d35348', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '9f1e7fed-179b-4ebb-a95a-1ddaa92d40c3',
  18.00, '2026-02-24 06:44:34.175735', '2026-02-24 06:59:39.467539'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '51fa122a-7db6-4259-b19f-7b71ed31d015', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'bd964884-c275-4855-a13f-bf421baed154',
  7.00, '2026-02-24 05:02:34.901776', '2026-02-24 07:06:38.12279'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '522c30a4-d557-4b0e-b8fe-34b7b19b4180', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '52d0f9d8-3d10-4960-b18a-427aef792164',
  18.00, '2026-02-24 04:54:56.57816', '2026-02-24 07:48:45.520692'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '603b63b9-b712-488a-a0fb-17ffa06d6800', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '796cec0b-24d5-41e4-bf0b-39ce54e1424e',
  86.00, '2026-02-24 04:52:30.205203', '2026-02-24 07:59:29.536163'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '6f4bbbdf-a28c-4d5b-8885-0e0faff73943', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '22262da2-2c85-43ba-acea-a2182b69499c',
  31.00, '2026-02-24 06:46:07.466928', '2026-02-24 07:59:27.376047'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '7660c30d-f2a4-4698-bc7a-d34b012632b3', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '25aa2556-0175-43c6-b930-d6627fcd4dfb',
  10.00, '2026-02-24 06:44:15.299747', '2026-02-24 06:57:56.367144'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '7759c669-514f-4a1b-941e-a99623aaabef', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '26b49a12-a90a-4d15-912f-963c45d4cecc',
  9.00, '2026-02-24 06:44:55.98843', '2026-02-24 07:02:02.522111'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '7b1b7329-4d5a-43ef-a81e-ab885a7d55ac', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '7c2a4855-4d79-4e47-ad2d-c6ee873c331a',
  102.00, '2026-02-24 04:56:24.579848', '2026-02-24 07:59:28.238921'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '82f83fd1-52c9-4714-a539-12d54585a17c', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'e1e3fe3c-1e61-4033-b94d-c252a1507c1d',
  12.00, '2026-02-24 06:46:50.699221', '2026-02-24 07:59:29.967317'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '84793a2e-148e-40b8-8a7e-60d76689b783', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'b220fe31-0809-4804-bb0e-49c0977990aa',
  7.00, '2026-02-24 05:00:48.610626', '2026-02-24 07:05:13.272861'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '860a0ce3-1542-46d6-a457-0eb0b0acddb5', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'aca622e2-35ff-4a13-bd23-2cf4a409cd91',
  64.00, '2026-02-24 06:47:32.544624', '2026-02-24 07:59:28.885249'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '87a2386c-5b88-4413-88cc-83d78af8db54', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'cf891614-6a1b-40c8-81fc-9aeeee317c3c',
  14.00, '2026-02-24 05:00:16.948808', '2026-02-24 07:09:20.435076'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '89e47f18-f155-4403-844a-51399bee5cb6', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'b6679660-70d1-41b8-812b-03c73529e5e5',
  11.00, '2026-02-24 04:50:40.704061', '2026-02-24 06:55:36.206098'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '8b5a58c8-8ad6-4009-a308-95c85de0af66', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'e6cd4aea-d8f5-4381-93d4-2237edd4b26f',
  8.00, '2026-02-24 05:01:18.475914', '2026-02-24 07:05:03.310038'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '8cf09c82-e405-494c-9ab3-01ca8142c91f', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '398d3433-a839-4277-a851-a9b50222b502',
  24.00, '2026-02-24 06:46:29.030173', '2026-02-24 06:58:13.179733'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '9da9ed14-d97e-4f7d-9321-e98acf7443f6', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'b5f340ae-8e2b-440d-b5b0-d105e3948f51',
  62.00, '2026-02-24 06:50:29.798419', '2026-02-24 07:04:28.555627'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '9dc54d68-e61d-423c-b823-f05f8e04387e', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '861eaa8f-3b3c-4349-87aa-5fa58b1721b6',
  8.00, '2026-02-24 04:59:47.492524', '2026-02-24 07:59:28.023621'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  '9de6861e-3c29-479a-a47c-3c8b9b98efad', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'd2c361a8-7b96-4179-b3f0-5e832befd9cf',
  145.00, '2026-02-24 04:58:55.590972', '2026-02-24 07:59:26.471745'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'a189e9a7-a796-40c8-9233-adbdb5e4079b', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '25cf6992-4b58-4f1f-ac38-10780c2c58f0',
  80.00, '2026-02-24 04:52:56.358643', '2026-02-24 07:59:31.044384'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'a8b6657d-5940-4dff-a507-1b9bbeffd58a', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '147b2c6c-dd78-4490-8231-72e632d79e70',
  0.00, '2026-02-24 07:09:57.426195', '2026-02-24 07:09:57.426195'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'add66d64-181d-4a3c-a030-4439fe8ffdd1', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'a03793a7-8483-4ded-bf6c-d0fa7c05c4f8',
  12.00, '2026-02-24 05:02:09.443612', '2026-02-24 07:06:49.255062'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'b2bb9525-b347-4e87-85fd-9a3adb2b0f14', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '5bea1f70-3dbf-40ca-8d02-fc0ef39e18ea',
  73.00, '2026-02-24 04:58:28.075481', '2026-02-24 07:59:29.320642'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'b78a3fc0-56d2-47ae-b5a6-4f36b6478a1f', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '184ea678-a09a-49c8-bfe3-3cf5b78081a6',
  39.00, '2026-02-24 04:53:59.637012', '2026-02-24 07:59:27.591919'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'c0639713-d4f0-4d1f-ab9f-97532a25eadf', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'f43fbc3a-8d8c-47b9-a9d4-2a1acdf9d544',
  20.00, '2026-02-24 05:03:09.199539', '2026-02-24 07:07:15.225376'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'c468b3e7-8f9a-43c5-9733-5b428b8b7595', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '5cd77f91-5537-407a-a4c6-1de471ba8f40',
  4.00, '2026-02-24 07:12:00.733366', '2026-02-24 07:12:29.482391'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'c5930369-3dde-472a-801b-3e9e849e9466', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'd830ccc3-c35e-4548-85b9-ee709bb040ee',
  43.00, '2026-02-24 05:01:45.855191', '2026-02-24 07:04:47.940785'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'c6d060bd-a961-4add-8a60-469b605c0226', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'a02ab95b-f12d-4bc7-b422-f46acb78dbaa',
  69.00, '2026-02-24 04:55:56.474761', '2026-02-24 07:03:56.747426'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'cd0b5640-d832-4b27-b81d-b4093fd5407d', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'f1d82c8e-ca83-4f99-8854-f3ee35ff7957',
  3.00, '2026-02-24 06:48:31.954051', '2026-02-24 07:59:27.160278'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'cd70ec5c-95a6-4cd7-8dc2-3c7a55990233', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'b31cdfa5-ca6e-4e2a-9c08-095467fabe85',
  108.00, '2026-02-24 04:51:15.2069', '2026-02-24 07:59:26.729579'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'cddd4622-a7d4-4bd2-8d39-27e8c02c249b', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '2c3b5ecd-930f-4651-b4db-7f4fc07e661e',
  8.00, '2026-02-24 04:53:29.014559', '2026-02-24 07:59:26.017527'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'd298fc0e-b596-4f54-bd08-66ebcbbb2a56', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'f80af1e7-cd13-4a98-ab81-1d5ed54c0a4f',
  37.00, '2026-02-24 05:05:10.650106', '2026-02-24 06:52:31.189432'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'd65c6ba4-8666-40c1-8320-c3f3b4cc6840', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'c1e0eae3-e4c1-4b16-9212-598da5feed7b',
  17.00, '2026-02-24 06:50:04.718361', '2026-02-24 07:59:26.944747'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'dca5612a-7a95-4da9-a1f7-09e628dfcc2f', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '01c60f45-eb96-41db-8b12-60f41e7b7b47',
  41.00, '2026-02-24 05:03:33.827171', '2026-02-24 07:49:33.242954'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'e01b434b-3355-4552-8513-c9baac5e4b14', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'c1955c6a-6658-430f-a0b3-a13f3f66fe1a',
  36.00, '2026-02-24 06:43:07.918345', '2026-02-24 07:07:40.207423'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'ece7b8b9-be6f-48d3-bcca-2b1fbdc11ef2', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '5a16acb1-be4c-4ce6-9604-4f14404443ce',
  35.00, '2026-02-24 06:45:15.948382', '2026-02-24 07:59:29.100669'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'eed407f5-f694-4b92-a281-8ab3fa165333', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'b3741497-3849-4f9d-b85d-c35784c9609c',
  10.00, '2026-02-24 06:49:53.051475', '2026-02-24 07:59:30.397901'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, organisation_id, product_id, qty, created_at, updated_at) VALUES (
  'fb72f515-971f-456d-a2a7-febaa0ea8fa3', '150149fc-c9ee-42f5-9e6f-09bb764873a5', '8350cbbe-0e55-4ce8-9c53-7d25fafe382c',
  29.00, '2026-02-24 04:58:06.212239', '2026-02-24 06:55:11.50721'
) ON CONFLICT (id) DO NOTHING;

-- Insert Sales
INSERT INTO sales (id, organisation_id, user_id, date, opening_stock, closing_stock, sale, cash_collected, upi, credit, remarks, created_at, updated_at) VALUES (
  '37280109-6431-4ead-9e10-e8e0a4df0fc4', '150149fc-c9ee-42f5-9e6f-09bb764873a5', 'f9168732-b293-4c10-beda-4bc09af84f83',
  '2026-02-24', '[{"product_id":"f80af1e7-cd13-4a98-ab81-1d5ed54c0a4f","opening_stock":"37.00"},{"product_id":"5cd77f91-5537-407a-a4c6-1de471ba8f40","opening_stock":"4.00"},{"product_id":"6dda9537-1863-49c1-aa67-425763442388","opening_stock":"93.00"},{"product_id":"9be27625-7017-48e0-acdf-de2f5a581761","opening_stock":"29.00"},{"product_id":"8b8fd743-b5bf-4ca1-b8e7-f6d7e5d8a9c5","opening_stock":"51.00"},{"product_id":"6b80b747-294b-4e7f-902e-45624d33a1e9","opening_stock":"45.00"},{"product_id":"2c3b5ecd-930f-4651-b4db-7f4fc07e661e","opening_stock":"9.00"},{"product_id":"6610a8a2-1e9a-445a-b592-d6e5d592031d","opening_stock":"3.00"},{"product_id":"548d8f5e-9ca7-4a74-ab51-1c50d3ad9832","opening_stock":"94.00"},{"product_id":"8350cbbe-0e55-4ce8-9c53-7d25fafe382c","opening_stock":"29.00"},{"product_id":"b6679660-70d1-41b8-812b-03c73529e5e5","opening_stock":"11.00"},{"product_id":"69abc993-d258-4c64-a589-d2057a148730","opening_stock":"56.00"},{"product_id":"2f68fde3-0a88-4bf9-b5c5-ebd3b06c9a30","opening_stock":"54.00"},{"product_id":"d2c361a8-7b96-4179-b3f0-5e832befd9cf","opening_stock":"163.00"},{"product_id":"b31cdfa5-ca6e-4e2a-9c08-095467fabe85","opening_stock":"120.00"},{"product_id":"c1e0eae3-e4c1-4b16-9212-598da5feed7b","opening_stock":"18.00"},{"product_id":"f1d82c8e-ca83-4f99-8854-f3ee35ff7957","opening_stock":"6.00"},{"product_id":"25aa2556-0175-43c6-b930-d6627fcd4dfb","opening_stock":"10.00"},{"product_id":"398d3433-a839-4277-a851-a9b50222b502","opening_stock":"24.00"},{"product_id":"22262da2-2c85-43ba-acea-a2182b69499c","opening_stock":"35.00"},{"product_id":"147b2c6c-dd78-4490-8231-72e632d79e70","opening_stock":"0.00"},{"product_id":"184ea678-a09a-49c8-bfe3-3cf5b78081a6","opening_stock":"40.00"},{"product_id":"1eab5792-0b9a-49fe-83fe-e4c95c82a6bb","opening_stock":"30.00"},{"product_id":"9f1e7fed-179b-4ebb-a95a-1ddaa92d40c3","opening_stock":"18.00"},{"product_id":"861eaa8f-3b3c-4349-87aa-5fa58b1721b6","opening_stock":"10.00"},{"product_id":"7c2a4855-4d79-4e47-ad2d-c6ee873c331a","opening_stock":"109.00"},{"product_id":"2f1e6249-8b96-4c64-a268-f1cdc38517f4","opening_stock":"106.00"},{"product_id":"ec54d5ca-effa-47f8-83ad-38e37c8bd17b","opening_stock":"24.00"},{"product_id":"52d0f9d8-3d10-4960-b18a-427aef792164","opening_stock":"18.00"},{"product_id":"b669c501-20af-46c5-aa61-fedeb17562d6","opening_stock":"15.00"},{"product_id":"26b49a12-a90a-4d15-912f-963c45d4cecc","opening_stock":"9.00"},{"product_id":"aca622e2-35ff-4a13-bd23-2cf4a409cd91","opening_stock":"67.00"},{"product_id":"5a16acb1-be4c-4ce6-9604-4f14404443ce","opening_stock":"36.00"},{"product_id":"5bea1f70-3dbf-40ca-8d02-fc0ef39e18ea","opening_stock":"79.00"},{"product_id":"796cec0b-24d5-41e4-bf0b-39ce54e1424e","opening_stock":"93.00"},{"product_id":"a02ab95b-f12d-4bc7-b422-f46acb78dbaa","opening_stock":"69.00"},{"product_id":"ac702620-73b1-4478-82f6-e00328e2263f","opening_stock":"35.00"},{"product_id":"b5f340ae-8e2b-440d-b5b0-d105e3948f51","opening_stock":"62.00"},{"product_id":"d830ccc3-c35e-4548-85b9-ee709bb040ee","opening_stock":"43.00"},{"product_id":"e6cd4aea-d8f5-4381-93d4-2237edd4b26f","opening_stock":"8.00"},{"product_id":"b220fe31-0809-4804-bb0e-49c0977990aa","opening_stock":"7.00"},{"product_id":"e1e3fe3c-1e61-4033-b94d-c252a1507c1d","opening_stock":"16.00"},{"product_id":"053eff51-345c-4d6f-84f5-092f2cb8d90d","opening_stock":"11.00"},{"product_id":"b3741497-3849-4f9d-b85d-c35784c9609c","opening_stock":"11.00"},{"product_id":"bd964884-c275-4855-a13f-bf421baed154","opening_stock":"7.00"},{"product_id":"a03793a7-8483-4ded-bf6c-d0fa7c05c4f8","opening_stock":"12.00"},{"product_id":"01c60f45-eb96-41db-8b12-60f41e7b7b47","opening_stock":"41.00"},{"product_id":"f43fbc3a-8d8c-47b9-a9d4-2a1acdf9d544","opening_stock":"20.00"},{"product_id":"21fa7a0e-5164-4008-a1ae-a200deb9c355","opening_stock":"80.00"},{"product_id":"c1955c6a-6658-430f-a0b3-a13f3f66fe1a","opening_stock":"36.00"},{"product_id":"ad2bc6bf-9ae1-4f18-b9f8-b020bda0ef7c","opening_stock":"11.00"},{"product_id":"5c7befb4-4692-4467-9eb3-4dff8eaa09d1","opening_stock":"13.00"},{"product_id":"975c56b2-91ba-4914-ab94-824dee407163","opening_stock":"51.00"},{"product_id":"25cf6992-4b58-4f1f-ac38-10780c2c58f0","opening_stock":"96.00"},{"product_id":"cf891614-6a1b-40c8-81fc-9aeeee317c3c","opening_stock":"14.00"}]'::jsonb, '[{"product_id":"f80af1e7-cd13-4a98-ab81-1d5ed54c0a4f","closing_stock":37},{"product_id":"5cd77f91-5537-407a-a4c6-1de471ba8f40","closing_stock":4},{"product_id":"6dda9537-1863-49c1-aa67-425763442388","closing_stock":93},{"product_id":"9be27625-7017-48e0-acdf-de2f5a581761","closing_stock":29},{"product_id":"8b8fd743-b5bf-4ca1-b8e7-f6d7e5d8a9c5","closing_stock":50},{"product_id":"6b80b747-294b-4e7f-902e-45624d33a1e9","closing_stock":44},{"product_id":"2c3b5ecd-930f-4651-b4db-7f4fc07e661e","closing_stock":8},{"product_id":"6610a8a2-1e9a-445a-b592-d6e5d592031d","closing_stock":3},{"product_id":"548d8f5e-9ca7-4a74-ab51-1c50d3ad9832","closing_stock":89},{"product_id":"8350cbbe-0e55-4ce8-9c53-7d25fafe382c","closing_stock":29},{"product_id":"b6679660-70d1-41b8-812b-03c73529e5e5","closing_stock":11},{"product_id":"69abc993-d258-4c64-a589-d2057a148730","closing_stock":56},{"product_id":"2f68fde3-0a88-4bf9-b5c5-ebd3b06c9a30","closing_stock":54},{"product_id":"d2c361a8-7b96-4179-b3f0-5e832befd9cf","closing_stock":145},{"product_id":"b31cdfa5-ca6e-4e2a-9c08-095467fabe85","closing_stock":108},{"product_id":"c1e0eae3-e4c1-4b16-9212-598da5feed7b","closing_stock":17},{"product_id":"f1d82c8e-ca83-4f99-8854-f3ee35ff7957","closing_stock":3},{"product_id":"25aa2556-0175-43c6-b930-d6627fcd4dfb","closing_stock":10},{"product_id":"398d3433-a839-4277-a851-a9b50222b502","closing_stock":24},{"product_id":"22262da2-2c85-43ba-acea-a2182b69499c","closing_stock":31},{"product_id":"147b2c6c-dd78-4490-8231-72e632d79e70","closing_stock":0},{"product_id":"184ea678-a09a-49c8-bfe3-3cf5b78081a6","closing_stock":39},{"product_id":"1eab5792-0b9a-49fe-83fe-e4c95c82a6bb","closing_stock":28},{"product_id":"9f1e7fed-179b-4ebb-a95a-1ddaa92d40c3","closing_stock":18},{"product_id":"861eaa8f-3b3c-4349-87aa-5fa58b1721b6","closing_stock":8},{"product_id":"7c2a4855-4d79-4e47-ad2d-c6ee873c331a","closing_stock":102},{"product_id":"2f1e6249-8b96-4c64-a268-f1cdc38517f4","closing_stock":97},{"product_id":"ec54d5ca-effa-47f8-83ad-38e37c8bd17b","closing_stock":24},{"product_id":"52d0f9d8-3d10-4960-b18a-427aef792164","closing_stock":18},{"product_id":"b669c501-20af-46c5-aa61-fedeb17562d6","closing_stock":14},{"product_id":"26b49a12-a90a-4d15-912f-963c45d4cecc","closing_stock":9},{"product_id":"aca622e2-35ff-4a13-bd23-2cf4a409cd91","closing_stock":64},{"product_id":"5a16acb1-be4c-4ce6-9604-4f14404443ce","closing_stock":35},{"product_id":"5bea1f70-3dbf-40ca-8d02-fc0ef39e18ea","closing_stock":73},{"product_id":"796cec0b-24d5-41e4-bf0b-39ce54e1424e","closing_stock":86},{"product_id":"a02ab95b-f12d-4bc7-b422-f46acb78dbaa","closing_stock":69},{"product_id":"ac702620-73b1-4478-82f6-e00328e2263f","closing_stock":32},{"product_id":"b5f340ae-8e2b-440d-b5b0-d105e3948f51","closing_stock":62},{"product_id":"d830ccc3-c35e-4548-85b9-ee709bb040ee","closing_stock":43},{"product_id":"e6cd4aea-d8f5-4381-93d4-2237edd4b26f","closing_stock":8},{"product_id":"b220fe31-0809-4804-bb0e-49c0977990aa","closing_stock":7},{"product_id":"e1e3fe3c-1e61-4033-b94d-c252a1507c1d","closing_stock":12},{"product_id":"053eff51-345c-4d6f-84f5-092f2cb8d90d","closing_stock":10},{"product_id":"b3741497-3849-4f9d-b85d-c35784c9609c","closing_stock":10},{"product_id":"bd964884-c275-4855-a13f-bf421baed154","closing_stock":7},{"product_id":"a03793a7-8483-4ded-bf6c-d0fa7c05c4f8","closing_stock":12},{"product_id":"01c60f45-eb96-41db-8b12-60f41e7b7b47","closing_stock":41},{"product_id":"f43fbc3a-8d8c-47b9-a9d4-2a1acdf9d544","closing_stock":20},{"product_id":"21fa7a0e-5164-4008-a1ae-a200deb9c355","closing_stock":80},{"product_id":"c1955c6a-6658-430f-a0b3-a13f3f66fe1a","closing_stock":36},{"product_id":"ad2bc6bf-9ae1-4f18-b9f8-b020bda0ef7c","closing_stock":10},{"product_id":"5c7befb4-4692-4467-9eb3-4dff8eaa09d1","closing_stock":13},{"product_id":"975c56b2-91ba-4914-ab94-824dee407163","closing_stock":37},{"product_id":"25cf6992-4b58-4f1f-ac38-10780c2c58f0","closing_stock":80},{"product_id":"cf891614-6a1b-40c8-81fc-9aeeee317c3c","closing_stock":14}]'::jsonb,
  '[{"sale":0,"product_id":"f80af1e7-cd13-4a98-ab81-1d5ed54c0a4f"},{"sale":0,"product_id":"5cd77f91-5537-407a-a4c6-1de471ba8f40"},{"sale":0,"product_id":"6dda9537-1863-49c1-aa67-425763442388"},{"sale":0,"product_id":"9be27625-7017-48e0-acdf-de2f5a581761"},{"sale":1,"product_id":"8b8fd743-b5bf-4ca1-b8e7-f6d7e5d8a9c5"},{"sale":1,"product_id":"6b80b747-294b-4e7f-902e-45624d33a1e9"},{"sale":1,"product_id":"2c3b5ecd-930f-4651-b4db-7f4fc07e661e"},{"sale":0,"product_id":"6610a8a2-1e9a-445a-b592-d6e5d592031d"},{"sale":5,"product_id":"548d8f5e-9ca7-4a74-ab51-1c50d3ad9832"},{"sale":0,"product_id":"8350cbbe-0e55-4ce8-9c53-7d25fafe382c"},{"sale":0,"product_id":"b6679660-70d1-41b8-812b-03c73529e5e5"},{"sale":0,"product_id":"69abc993-d258-4c64-a589-d2057a148730"},{"sale":0,"product_id":"2f68fde3-0a88-4bf9-b5c5-ebd3b06c9a30"},{"sale":18,"product_id":"d2c361a8-7b96-4179-b3f0-5e832befd9cf"},{"sale":12,"product_id":"b31cdfa5-ca6e-4e2a-9c08-095467fabe85"},{"sale":1,"product_id":"c1e0eae3-e4c1-4b16-9212-598da5feed7b"},{"sale":3,"product_id":"f1d82c8e-ca83-4f99-8854-f3ee35ff7957"},{"sale":0,"product_id":"25aa2556-0175-43c6-b930-d6627fcd4dfb"},{"sale":0,"product_id":"398d3433-a839-4277-a851-a9b50222b502"},{"sale":4,"product_id":"22262da2-2c85-43ba-acea-a2182b69499c"},{"sale":0,"product_id":"147b2c6c-dd78-4490-8231-72e632d79e70"},{"sale":1,"product_id":"184ea678-a09a-49c8-bfe3-3cf5b78081a6"},{"sale":2,"product_id":"1eab5792-0b9a-49fe-83fe-e4c95c82a6bb"},{"sale":0,"product_id":"9f1e7fed-179b-4ebb-a95a-1ddaa92d40c3"},{"sale":2,"product_id":"861eaa8f-3b3c-4349-87aa-5fa58b1721b6"},{"sale":7,"product_id":"7c2a4855-4d79-4e47-ad2d-c6ee873c331a"},{"sale":9,"product_id":"2f1e6249-8b96-4c64-a268-f1cdc38517f4"},{"sale":0,"product_id":"ec54d5ca-effa-47f8-83ad-38e37c8bd17b"},{"sale":0,"product_id":"52d0f9d8-3d10-4960-b18a-427aef792164"},{"sale":1,"product_id":"b669c501-20af-46c5-aa61-fedeb17562d6"},{"sale":0,"product_id":"26b49a12-a90a-4d15-912f-963c45d4cecc"},{"sale":3,"product_id":"aca622e2-35ff-4a13-bd23-2cf4a409cd91"},{"sale":1,"product_id":"5a16acb1-be4c-4ce6-9604-4f14404443ce"},{"sale":6,"product_id":"5bea1f70-3dbf-40ca-8d02-fc0ef39e18ea"},{"sale":7,"product_id":"796cec0b-24d5-41e4-bf0b-39ce54e1424e"},{"sale":0,"product_id":"a02ab95b-f12d-4bc7-b422-f46acb78dbaa"},{"sale":3,"product_id":"ac702620-73b1-4478-82f6-e00328e2263f"},{"sale":0,"product_id":"b5f340ae-8e2b-440d-b5b0-d105e3948f51"},{"sale":0,"product_id":"d830ccc3-c35e-4548-85b9-ee709bb040ee"},{"sale":0,"product_id":"e6cd4aea-d8f5-4381-93d4-2237edd4b26f"},{"sale":0,"product_id":"b220fe31-0809-4804-bb0e-49c0977990aa"},{"sale":4,"product_id":"e1e3fe3c-1e61-4033-b94d-c252a1507c1d"},{"sale":1,"product_id":"053eff51-345c-4d6f-84f5-092f2cb8d90d"},{"sale":1,"product_id":"b3741497-3849-4f9d-b85d-c35784c9609c"},{"sale":0,"product_id":"bd964884-c275-4855-a13f-bf421baed154"},{"sale":0,"product_id":"a03793a7-8483-4ded-bf6c-d0fa7c05c4f8"},{"sale":0,"product_id":"01c60f45-eb96-41db-8b12-60f41e7b7b47"},{"sale":0,"product_id":"f43fbc3a-8d8c-47b9-a9d4-2a1acdf9d544"},{"sale":0,"product_id":"21fa7a0e-5164-4008-a1ae-a200deb9c355"},{"sale":0,"product_id":"c1955c6a-6658-430f-a0b3-a13f3f66fe1a"},{"sale":1,"product_id":"ad2bc6bf-9ae1-4f18-b9f8-b020bda0ef7c"},{"sale":0,"product_id":"5c7befb4-4692-4467-9eb3-4dff8eaa09d1"},{"sale":14,"product_id":"975c56b2-91ba-4914-ab94-824dee407163"},{"sale":16,"product_id":"25cf6992-4b58-4f1f-ac38-10780c2c58f0"},{"sale":0,"product_id":"cf891614-6a1b-40c8-81fc-9aeeee317c3c"}]'::jsonb, 5000.00, 9790.00,
  NULL, NULL,
  '2026-02-24 07:59:25.33978', '2026-02-24 07:59:25.33978'
) ON CONFLICT (id) DO NOTHING;


-- ============================================
-- DATA INSERTS COMPLETE
-- ============================================
