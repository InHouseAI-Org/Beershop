-- ============================================
-- BEERSHOP DATABASE - COMPLETE SCHEMA
-- Run this script in Neon SQL Editor to create all tables
-- ============================================

-- Enable UUID extension (required for primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING TABLES (if any)
-- ============================================
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

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_stock JSONB,
  closing_stock JSONB,
  sale JSONB,
  cash_collected DECIMAL(10, 2) DEFAULT 0,
  upi DECIMAL(10, 2) DEFAULT 0,
  miscellaneous DECIMAL(10, 2) DEFAULT 0,
  credit JSONB,
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

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
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- ============================================
-- DONE! All tables created successfully ✅
-- ============================================
--
-- Tables Created:
-- 1.  super_admins
-- 2.  organisations
-- 3.  admins
-- 4.  products
-- 5.  inventory
-- 6.  users
-- 7.  credit_holders
-- 8.  distributors
-- 9.  sales
-- 10. orders
-- 11. balances
-- 12. expenses
-- 13. credit_collection_history
-- 14. distributor_payment_history
--
-- Next Steps:
-- 1. Run this SQL in your Neon SQL Editor
-- 2. Your database structure is ready!
-- 3. The application will create data as needed
-- ============================================
