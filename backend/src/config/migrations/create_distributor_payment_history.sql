-- Create distributor_payment_history table
CREATE TABLE IF NOT EXISTS distributor_payment_history (
  id SERIAL PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL,
  previous_outstanding DECIMAL(10, 2) NOT NULL,
  new_outstanding DECIMAL(10, 2) NOT NULL,
  paid_by UUID NOT NULL REFERENCES admins(id),
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_distributor_payment_org ON distributor_payment_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_distributor_payment_dist ON distributor_payment_history(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_payment_date ON distributor_payment_history(paid_at);
