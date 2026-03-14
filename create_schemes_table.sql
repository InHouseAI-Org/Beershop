-- ============================================
-- CREATE SCHEMES TRACKING TABLE
-- Run this script in your database
-- ============================================

-- 1. Create schemes table
CREATE TABLE IF NOT EXISTS schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  scheme_name VARCHAR(255) NOT NULL,
  scheme_start_date DATE NOT NULL,
  scheme_period_value INTEGER NOT NULL CHECK (scheme_period_value > 0),
  scheme_period_unit VARCHAR(20) NOT NULL CHECK (scheme_period_unit IN ('weeks', 'months', 'years')),
  scheme_target_qty DECIMAL(10, 2) NOT NULL CHECK (scheme_target_qty > 0),
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('overall', 'per_product')),
  scheme_products JSONB NOT NULL, -- Array of product IDs and their individual targets
  scheme_value DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'closed')),
  achieved BOOLEAN DEFAULT FALSE,
  achieved_date DATE,
  notes TEXT,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schemes_organisation ON schemes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_schemes_distributor ON schemes(distributor_id);
CREATE INDEX IF NOT EXISTS idx_schemes_status ON schemes(status);
CREATE INDEX IF NOT EXISTS idx_schemes_start_date ON schemes(scheme_start_date);

-- 3. Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schemes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schemes_updated_at ON schemes;
CREATE TRIGGER trigger_schemes_updated_at
BEFORE UPDATE ON schemes
FOR EACH ROW
EXECUTE FUNCTION update_schemes_updated_at();

-- 4. Add comments for documentation
COMMENT ON TABLE schemes IS 'Tracks distributor schemes with target quantities and values';
COMMENT ON COLUMN schemes.scheme_name IS 'Name of the scheme';
COMMENT ON COLUMN schemes.scheme_start_date IS 'When the scheme starts';
COMMENT ON COLUMN schemes.scheme_period_value IS 'Duration value (e.g., 12 for 12 months)';
COMMENT ON COLUMN schemes.scheme_period_unit IS 'Duration unit: weeks, months, or years';
COMMENT ON COLUMN schemes.scheme_target_qty IS 'Target quantity to achieve';
COMMENT ON COLUMN schemes.target_type IS 'overall: sum all products, per_product: each product has individual target';
COMMENT ON COLUMN schemes.scheme_products IS 'JSON array of products: [{"product_id": "uuid", "product_name": "name", "target_qty": 100}]';
COMMENT ON COLUMN schemes.scheme_value IS 'Monetary value or reward amount for completing scheme';
COMMENT ON COLUMN schemes.status IS 'active: ongoing, completed: target achieved, closed: manually closed';
COMMENT ON COLUMN schemes.achieved IS 'Whether the target was achieved';
COMMENT ON COLUMN schemes.achieved_date IS 'Date when target was achieved';

-- 5. Create view for scheme tracking with progress
CREATE OR REPLACE VIEW scheme_tracking AS
SELECT
  s.id,
  s.organisation_id,
  s.distributor_id,
  d.name as distributor_name,
  s.scheme_name,
  s.scheme_start_date,
  s.scheme_period_value,
  s.scheme_period_unit,
  -- Calculate end date based on period
  CASE
    WHEN s.scheme_period_unit = 'weeks' THEN s.scheme_start_date + (s.scheme_period_value || ' weeks')::INTERVAL
    WHEN s.scheme_period_unit = 'months' THEN s.scheme_start_date + (s.scheme_period_value || ' months')::INTERVAL
    WHEN s.scheme_period_unit = 'years' THEN s.scheme_start_date + (s.scheme_period_value || ' years')::INTERVAL
  END as scheme_end_date,
  s.scheme_target_qty,
  s.target_type,
  s.scheme_products,
  s.scheme_value,
  s.status,
  s.achieved,
  s.achieved_date,
  s.notes,
  s.created_at,
  s.updated_at,
  -- Check if scheme is expired
  CASE
    WHEN s.scheme_period_unit = 'weeks' THEN CURRENT_DATE > (s.scheme_start_date + (s.scheme_period_value || ' weeks')::INTERVAL)::DATE
    WHEN s.scheme_period_unit = 'months' THEN CURRENT_DATE > (s.scheme_start_date + (s.scheme_period_value || ' months')::INTERVAL)::DATE
    WHEN s.scheme_period_unit = 'years' THEN CURRENT_DATE > (s.scheme_start_date + (s.scheme_period_value || ' years')::INTERVAL)::DATE
  END as is_expired,
  -- Calculate days remaining
  CASE
    WHEN s.scheme_period_unit = 'weeks' THEN (s.scheme_start_date + (s.scheme_period_value || ' weeks')::INTERVAL)::DATE - CURRENT_DATE
    WHEN s.scheme_period_unit = 'months' THEN (s.scheme_start_date + (s.scheme_period_value || ' months')::INTERVAL)::DATE - CURRENT_DATE
    WHEN s.scheme_period_unit = 'years' THEN (s.scheme_start_date + (s.scheme_period_value || ' years')::INTERVAL)::DATE - CURRENT_DATE
  END as days_remaining
FROM schemes s
LEFT JOIN distributors d ON s.distributor_id = d.id
ORDER BY s.created_at DESC;

COMMENT ON VIEW scheme_tracking IS 'Enhanced view of schemes with calculated end dates and expiry status';

-- ============================================
-- VERIFICATION QUERIES (uncomment to run)
-- ============================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'schemes' ORDER BY ordinal_position;

-- Check view
-- SELECT * FROM scheme_tracking LIMIT 5;
