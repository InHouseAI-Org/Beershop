-- Create credit_collection_history table
CREATE TABLE IF NOT EXISTS credit_collection_history (
  id SERIAL PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  credit_holder_id UUID NOT NULL REFERENCES credit_holders(id) ON DELETE CASCADE,
  amount_collected DECIMAL(10, 2) NOT NULL,
  previous_outstanding DECIMAL(10, 2) NOT NULL,
  new_outstanding DECIMAL(10, 2) NOT NULL,
  collected_by UUID NOT NULL REFERENCES admins(id),
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_collection_org ON credit_collection_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_credit_collection_holder ON credit_collection_history(credit_holder_id);
CREATE INDEX IF NOT EXISTS idx_credit_collection_date ON credit_collection_history(collected_at);
