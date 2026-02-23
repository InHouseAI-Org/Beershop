-- ============================================
-- PRODUCTION DATABASE SETUP - Run this ONCE
-- ============================================

-- Enable UUID extension (required for primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MAIN SCHEMA (Tables)
-- ============================================

-- Super Admins
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organisations
CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  sale_price DECIMAL(10, 2) NOT NULL,
  average_buy_price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty DECIMAL(10, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organisation_id, product_id)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit Holders
CREATE TABLE IF NOT EXISTS credit_holders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  amount_payable DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Distributors
CREATE TABLE IF NOT EXISTS distributors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  amount_outstanding DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  opening_stock JSONB,
  closing_stock JSONB,
  sale JSONB,
  cash_collected DECIMAL(10, 2) DEFAULT 0,
  upi DECIMAL(10, 2) DEFAULT 0,
  credit JSONB,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  order_date DATE NOT NULL,
  order_data JSONB,
  tax DECIMAL(10, 2) DEFAULT 0,
  misc DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  scheme DECIMAL(10, 2) DEFAULT 0,
  payment_outstanding_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit Collection History
CREATE TABLE IF NOT EXISTS credit_collection_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  credit_holder_id UUID NOT NULL REFERENCES credit_holders(id) ON DELETE CASCADE,
  amount_collected DECIMAL(10, 2) NOT NULL,
  previous_outstanding DECIMAL(10, 2) NOT NULL,
  new_outstanding DECIMAL(10, 2) NOT NULL,
  collected_by UUID NOT NULL REFERENCES admins(id) ON DELETE SET NULL,
  notes TEXT,
  transaction_type VARCHAR(20) DEFAULT 'collected' CHECK (transaction_type IN ('given', 'collected')),
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Distributor Payment History
CREATE TABLE IF NOT EXISTS distributor_payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL,
  previous_outstanding DECIMAL(10, 2) NOT NULL,
  new_outstanding DECIMAL(10, 2) NOT NULL,
  paid_by UUID NOT NULL REFERENCES admins(id) ON DELETE SET NULL,
  notes TEXT,
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. INDEXES (Performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admins_organisation ON admins(organisation_id);
CREATE INDEX IF NOT EXISTS idx_products_organisation ON products(organisation_id);
CREATE INDEX IF NOT EXISTS idx_inventory_organisation ON inventory(organisation_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_users_organisation ON users(organisation_id);
CREATE INDEX IF NOT EXISTS idx_credit_holders_organisation ON credit_holders(organisation_id);
CREATE INDEX IF NOT EXISTS idx_distributors_organisation ON distributors(organisation_id);
CREATE INDEX IF NOT EXISTS idx_sales_organisation ON sales(organisation_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_orders_organisation ON orders(organisation_id);
CREATE INDEX IF NOT EXISTS idx_orders_distributor ON orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_credit_collection_history_organisation_id ON credit_collection_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_credit_collection_history_credit_holder_id ON credit_collection_history(credit_holder_id);
CREATE INDEX IF NOT EXISTS idx_credit_collection_history_collected_at ON credit_collection_history(collected_at);
CREATE INDEX IF NOT EXISTS idx_credit_collection_history_transaction_type ON credit_collection_history(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_collection_history_sale_id ON credit_collection_history(sale_id);
CREATE INDEX IF NOT EXISTS idx_distributor_payment_history_organisation_id ON distributor_payment_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_distributor_payment_history_distributor_id ON distributor_payment_history(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_payment_history_paid_at ON distributor_payment_history(paid_at);

-- ============================================
-- DONE! Database is ready.
-- ============================================
