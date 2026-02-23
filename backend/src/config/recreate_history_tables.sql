-- Drop and recreate credit_collection_history and distributor_payment_history with correct UUID types

-- Drop existing tables
DROP TABLE IF EXISTS credit_collection_history CASCADE;
DROP TABLE IF EXISTS distributor_payment_history CASCADE;

-- Create credit_collection_history table with correct UUID types
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
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create distributor_payment_history table with correct UUID types
CREATE TABLE distributor_payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL,
  previous_outstanding DECIMAL(10, 2) NOT NULL,
  new_outstanding DECIMAL(10, 2) NOT NULL,
  paid_by UUID NOT NULL,
  notes TEXT,
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_credit_collection_history_organisation_id ON credit_collection_history(organisation_id);
CREATE INDEX idx_credit_collection_history_credit_holder_id ON credit_collection_history(credit_holder_id);
CREATE INDEX idx_credit_collection_history_collected_at ON credit_collection_history(collected_at);
CREATE INDEX idx_credit_collection_history_transaction_type ON credit_collection_history(transaction_type);
CREATE INDEX idx_credit_collection_history_sale_id ON credit_collection_history(sale_id);

CREATE INDEX idx_distributor_payment_history_organisation_id ON distributor_payment_history(organisation_id);
CREATE INDEX idx_distributor_payment_history_distributor_id ON distributor_payment_history(distributor_id);
CREATE INDEX idx_distributor_payment_history_paid_at ON distributor_payment_history(paid_at);
