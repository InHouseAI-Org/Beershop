-- ============================================
-- ADD TCS AND TDS TO ORDERS AND CREATE LEDGERS
-- ============================================
-- This migration adds TCS (Tax Collected at Source) and TDS (Tax Deducted at Source)
-- fields to orders table and creates separate ledger tables for tracking them
-- ============================================

-- ============================================
-- STEP 1: Add TCS and TDS columns to orders table
-- ============================================
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tcs DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN orders.tcs IS 'Tax Collected at Source - tax collected from customer';
COMMENT ON COLUMN orders.tds IS 'Tax Deducted at Source - tax deducted by customer';

-- ============================================
-- STEP 2: Create TCS Ledger table
-- ============================================
CREATE TABLE IF NOT EXISTS tcs_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  distributor_id UUID REFERENCES distributors(id) ON DELETE SET NULL,
  tcs_amount DECIMAL(10, 2) NOT NULL,
  order_date DATE NOT NULL,
  bill_number VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, adjusted
  payment_date DATE,
  payment_reference VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tcs_ledger IS 'Ledger for tracking Tax Collected at Source (TCS) from orders';
COMMENT ON COLUMN tcs_ledger.payment_status IS 'Status: pending (not yet paid to govt), paid (deposited to govt), adjusted (adjusted against liability)';

-- ============================================
-- STEP 3: Create TDS Ledger table
-- ============================================
CREATE TABLE IF NOT EXISTS tds_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  distributor_id UUID REFERENCES distributors(id) ON DELETE SET NULL,
  tds_amount DECIMAL(10, 2) NOT NULL,
  order_date DATE NOT NULL,
  bill_number VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, received, adjusted
  payment_date DATE,
  payment_reference VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tds_ledger IS 'Ledger for tracking Tax Deducted at Source (TDS) from orders';
COMMENT ON COLUMN tds_ledger.payment_status IS 'Status: pending (not yet received from customer), received (received from customer), adjusted (adjusted against receivable)';

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tcs_ledger_org_id ON tcs_ledger(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tcs_ledger_order_id ON tcs_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_tcs_ledger_distributor_id ON tcs_ledger(distributor_id);
CREATE INDEX IF NOT EXISTS idx_tcs_ledger_order_date ON tcs_ledger(order_date);
CREATE INDEX IF NOT EXISTS idx_tcs_ledger_payment_status ON tcs_ledger(payment_status);

CREATE INDEX IF NOT EXISTS idx_tds_ledger_org_id ON tds_ledger(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tds_ledger_order_id ON tds_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_tds_ledger_distributor_id ON tds_ledger(distributor_id);
CREATE INDEX IF NOT EXISTS idx_tds_ledger_order_date ON tds_ledger(order_date);
CREATE INDEX IF NOT EXISTS idx_tds_ledger_payment_status ON tds_ledger(payment_status);

-- ============================================
-- STEP 5: Create trigger to automatically populate TCS/TDS ledgers
-- ============================================
CREATE OR REPLACE FUNCTION update_tcs_tds_ledgers()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert TCS record if TCS amount > 0
  IF NEW.tcs > 0 THEN
    INSERT INTO tcs_ledger (
      organisation_id,
      order_id,
      distributor_id,
      tcs_amount,
      order_date,
      bill_number,
      payment_status
    ) VALUES (
      NEW.organisation_id,
      NEW.id,
      NEW.distributor_id,
      NEW.tcs,
      NEW.order_date,
      NEW.bill_number,
      'pending'
    );
  END IF;

  -- Insert TDS record if TDS amount > 0
  IF NEW.tds > 0 THEN
    INSERT INTO tds_ledger (
      organisation_id,
      order_id,
      distributor_id,
      tds_amount,
      order_date,
      bill_number,
      payment_status
    ) VALUES (
      NEW.organisation_id,
      NEW.id,
      NEW.distributor_id,
      NEW.tds,
      NEW.order_date,
      NEW.bill_number,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tcs_tds_ledgers
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION update_tcs_tds_ledgers();

-- ============================================
-- STEP 6: Create views for easy querying
-- ============================================

-- TCS Summary View
CREATE OR REPLACE VIEW tcs_summary AS
SELECT
  t.organisation_id,
  t.payment_status,
  COUNT(*) as transaction_count,
  SUM(t.tcs_amount) as total_tcs,
  MIN(t.order_date) as earliest_date,
  MAX(t.order_date) as latest_date
FROM tcs_ledger t
GROUP BY t.organisation_id, t.payment_status;

-- TDS Summary View
CREATE OR REPLACE VIEW tds_summary AS
SELECT
  t.organisation_id,
  t.payment_status,
  COUNT(*) as transaction_count,
  SUM(t.tds_amount) as total_tds,
  MIN(t.order_date) as earliest_date,
  MAX(t.order_date) as latest_date
FROM tds_ledger t
GROUP BY t.organisation_id, t.payment_status;

-- TCS Ledger with Distributor Details
CREATE OR REPLACE VIEW tcs_ledger_detailed AS
SELECT
  t.*,
  d.name as distributor_name,
  o.order_data,
  (
    SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
    FROM jsonb_array_elements(o.order_data) as item
  ) as order_total
FROM tcs_ledger t
LEFT JOIN distributors d ON t.distributor_id = d.id
LEFT JOIN orders o ON t.order_id = o.id
ORDER BY t.order_date DESC, t.created_at DESC;

-- TDS Ledger with Distributor Details
CREATE OR REPLACE VIEW tds_ledger_detailed AS
SELECT
  t.*,
  d.name as distributor_name,
  o.order_data,
  (
    SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
    FROM jsonb_array_elements(o.order_data) as item
  ) as order_total
FROM tds_ledger t
LEFT JOIN distributors d ON t.distributor_id = d.id
LEFT JOIN orders o ON t.order_id = o.id
ORDER BY t.order_date DESC, t.created_at DESC;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- You can now:
-- 1. Add TCS/TDS amounts when creating orders
-- 2. View TCS ledger: SELECT * FROM tcs_ledger_detailed WHERE organisation_id = 'your-org-id';
-- 3. View TDS ledger: SELECT * FROM tds_ledger_detailed WHERE organisation_id = 'your-org-id';
-- 4. Check pending TCS: SELECT * FROM tcs_summary WHERE payment_status = 'pending';
-- 5. Check pending TDS: SELECT * FROM tds_summary WHERE payment_status = 'pending';
-- ============================================
