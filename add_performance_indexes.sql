-- Performance Optimization Indexes
-- Run these commands in your Neon database to improve query performance

-- Index for daily_expenses lookups by sale_id (fixes N+1 query performance)
CREATE INDEX IF NOT EXISTS idx_daily_expenses_sale_id ON daily_expenses(sale_id);

-- Index for sales queries by organisation
CREATE INDEX IF NOT EXISTS idx_sales_organisation_id ON sales(organisation_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);

-- Index for orders queries
CREATE INDEX IF NOT EXISTS idx_orders_organisation_id ON orders(organisation_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_distributor_id ON orders(distributor_id);

-- Index for products queries
CREATE INDEX IF NOT EXISTS idx_products_organisation_id ON products(organisation_id);

-- Index for inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_organisation_id ON inventory(organisation_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- Index for credit holders queries
CREATE INDEX IF NOT EXISTS idx_credit_holders_organisation_id ON credit_holders(organisation_id);

-- Index for distributors queries
CREATE INDEX IF NOT EXISTS idx_distributors_organisation_id ON distributors(organisation_id);

-- Index for credit collection history queries
CREATE INDEX IF NOT EXISTS idx_credit_history_organisation_id ON credit_collection_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_credit_holder_id ON credit_collection_history(credit_holder_id);
CREATE INDEX IF NOT EXISTS idx_credit_history_collected_at ON credit_collection_history(collected_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sales_org_date ON sales(organisation_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_org_status ON sales(organisation_id, status);
