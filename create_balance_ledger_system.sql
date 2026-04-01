-- ============================================
-- CREATE BALANCE LEDGER SYSTEM
-- For tracking all transactions affecting Gala, Bank, and Cash balances
-- ============================================

-- Step 1: Add opening balance fields to organisations table
-- These represent the initial balances when the organization started tracking
ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS cash_opening_balance DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_opening_balance DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gala_opening_balance DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN organisations.cash_opening_balance IS 'Initial cash balance at the start of ledger tracking (immutable)';
COMMENT ON COLUMN organisations.bank_opening_balance IS 'Initial bank balance at the start of ledger tracking (immutable)';
COMMENT ON COLUMN organisations.gala_opening_balance IS 'Initial gala balance at the start of ledger tracking (immutable)';

-- Step 2: Create balance_transactions table
-- This table records ALL transactions that affect the three balances
CREATE TABLE IF NOT EXISTS balance_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  -- Transaction metadata
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
    'expense',                    -- Regular expense (deducts from balance)
    'daily_allocation',           -- Daily sales allocation (adds to balance)
    'balance_transfer_debit',     -- Transfer out (deducts from source)
    'balance_transfer_credit',    -- Transfer in (adds to destination)
    'distributor_payment',        -- Payment received from distributor (adds to balance)
    'miscellaneous_income',       -- Other income (adds to balance)
    'credit_collection',          -- Credit holder payment received (adds to balance)
    'prepaid_expense',            -- Prepaid expense payment (deducts from balance)
    'recurring_expense'           -- Recurring expense payment (deducts from balance)
  )),

  -- Which balance is affected
  account VARCHAR(50) NOT NULL CHECK (account IN ('cash_balance', 'bank_balance', 'gala_balance')),

  -- Transaction amounts
  debit_amount DECIMAL(10, 2) DEFAULT 0 CHECK (debit_amount >= 0),   -- Amount deducted (expenses, transfers out)
  credit_amount DECIMAL(10, 2) DEFAULT 0 CHECK (credit_amount >= 0), -- Amount added (income, payments received, transfers in)

  -- Transaction details
  transaction_date DATE NOT NULL,
  description TEXT,
  notes TEXT,

  -- References to source tables
  reference_id UUID,              -- ID of the source record (expense_id, transfer_id, payment_id, etc.)
  reference_table VARCHAR(100),   -- Name of the source table

  -- Audit fields
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_by_username VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure either debit or credit, not both
  CONSTRAINT either_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_balance_transactions_org ON balance_transactions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_account ON balance_transactions(account);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_date ON balance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON balance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_reference ON balance_transactions(reference_id, reference_table);

-- Add comments for documentation
COMMENT ON TABLE balance_transactions IS 'Centralized ledger for all transactions affecting cash, bank, and gala balances';
COMMENT ON COLUMN balance_transactions.transaction_type IS 'Type of transaction affecting the balance';
COMMENT ON COLUMN balance_transactions.account IS 'Which balance account is affected';
COMMENT ON COLUMN balance_transactions.debit_amount IS 'Amount deducted from balance (expenses, transfers out)';
COMMENT ON COLUMN balance_transactions.credit_amount IS 'Amount added to balance (income, payments received)';
COMMENT ON COLUMN balance_transactions.reference_id IS 'Foreign key to the source table record';
COMMENT ON COLUMN balance_transactions.reference_table IS 'Name of the table where source record exists';

-- Step 3: Create balance_ledger view for easy querying
-- This view provides a unified view of all transactions with running balances
CREATE OR REPLACE VIEW balance_ledger AS
SELECT
  bt.id,
  bt.organisation_id,
  bt.transaction_type,
  bt.account,
  bt.transaction_date,
  bt.description,
  bt.notes,
  bt.debit_amount,
  bt.credit_amount,
  (bt.credit_amount - bt.debit_amount) as net_amount,
  bt.reference_id,
  bt.reference_table,
  bt.created_by,
  bt.created_by_username,
  bt.created_at
FROM balance_transactions bt
ORDER BY bt.transaction_date DESC, bt.created_at DESC;

COMMENT ON VIEW balance_ledger IS 'Unified view of all balance transactions for easy querying';

-- Step 4: Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_balance_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_balance_transactions_updated_at ON balance_transactions;
CREATE TRIGGER trigger_balance_transactions_updated_at
BEFORE UPDATE ON balance_transactions
FOR EACH ROW
EXECUTE FUNCTION update_balance_transactions_updated_at();

-- Step 5: Create functions to automatically create balance_transactions records
-- These triggers will automatically insert into balance_transactions when records are created

-- Function to create balance transaction from expenses
CREATE OR REPLACE FUNCTION create_balance_transaction_from_expense()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO balance_transactions (
    organisation_id,
    transaction_type,
    account,
    debit_amount,
    credit_amount,
    transaction_date,
    description,
    reference_id,
    reference_table,
    created_by_username
  ) VALUES (
    NEW.organisation_id,
    'expense',
    NEW.expense_from,
    NEW.expense_amount,
    0,
    NEW.date,
    NEW.expense_name || COALESCE(' - ' || NEW.description, ''),
    NEW.id,
    'expenses',
    (SELECT username FROM admins WHERE organisation_id = NEW.organisation_id LIMIT 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_expense_to_balance_transaction ON expenses;
CREATE TRIGGER trigger_expense_to_balance_transaction
AFTER INSERT ON expenses
FOR EACH ROW
EXECUTE FUNCTION create_balance_transaction_from_expense();

-- Function to create balance transaction from balance_transfers
CREATE OR REPLACE FUNCTION create_balance_transaction_from_transfer()
RETURNS TRIGGER AS $$
BEGIN
  -- Create debit entry for source account
  INSERT INTO balance_transactions (
    organisation_id,
    transaction_type,
    account,
    debit_amount,
    credit_amount,
    transaction_date,
    description,
    notes,
    reference_id,
    reference_table,
    created_by,
    created_by_username
  ) VALUES (
    NEW.organisation_id,
    'balance_transfer_debit',
    NEW.from_account,
    NEW.amount,
    0,
    NEW.transaction_date,
    'Transfer to ' || NEW.to_account || ': ' || NEW.name,
    NEW.description,
    NEW.id,
    'balance_transfers',
    NEW.created_by,
    NEW.created_by_username
  );

  -- Create credit entry for destination account
  INSERT INTO balance_transactions (
    organisation_id,
    transaction_type,
    account,
    debit_amount,
    credit_amount,
    transaction_date,
    description,
    notes,
    reference_id,
    reference_table,
    created_by,
    created_by_username
  ) VALUES (
    NEW.organisation_id,
    'balance_transfer_credit',
    NEW.to_account,
    0,
    NEW.amount,
    NEW.transaction_date,
    'Transfer from ' || NEW.from_account || ': ' || NEW.name,
    NEW.description,
    NEW.id,
    'balance_transfers',
    NEW.created_by,
    NEW.created_by_username
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_transfer_to_balance_transaction ON balance_transfers;
CREATE TRIGGER trigger_transfer_to_balance_transaction
AFTER INSERT ON balance_transfers
FOR EACH ROW
EXECUTE FUNCTION create_balance_transaction_from_transfer();

-- Function to create balance transaction from distributor_payments
CREATE OR REPLACE FUNCTION create_balance_transaction_from_distributor_payment()
RETURNS TRIGGER AS $$
DECLARE
  payment_description TEXT;
  distributor_name TEXT;
BEGIN
  -- Get distributor name
  SELECT name INTO distributor_name
  FROM distributors
  WHERE id = NEW.distributor_id;

  -- Build description based on payment type
  IF NEW.payment_type = 'order_payment' THEN
    payment_description := 'Payment from ' || distributor_name || ' for bill ' || COALESCE(NEW.bill_number, 'N/A');
  ELSIF NEW.payment_type = 'advance' THEN
    payment_description := 'Advance payment from ' || distributor_name;
  ELSIF NEW.payment_type = 'opening_balance_payment' THEN
    payment_description := 'Opening balance payment from ' || distributor_name;
  ELSE
    payment_description := 'Payment from ' || distributor_name;
  END IF;

  INSERT INTO balance_transactions (
    organisation_id,
    transaction_type,
    account,
    debit_amount,
    credit_amount,
    transaction_date,
    description,
    notes,
    reference_id,
    reference_table,
    created_by,
    created_by_username
  ) VALUES (
    NEW.organisation_id,
    'distributor_payment',
    NEW.payment_from,
    0,
    NEW.amount,
    NEW.payment_date,
    payment_description,
    NEW.notes,
    NEW.id,
    'distributor_payments',
    NEW.created_by,
    (SELECT username FROM admins WHERE id = NEW.created_by LIMIT 1)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_distributor_payment_to_balance_transaction ON distributor_payments;
CREATE TRIGGER trigger_distributor_payment_to_balance_transaction
AFTER INSERT ON distributor_payments
FOR EACH ROW
EXECUTE FUNCTION create_balance_transaction_from_distributor_payment();

-- Function to create balance transaction from miscellaneous_income
CREATE OR REPLACE FUNCTION create_balance_transaction_from_misc_income()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO balance_transactions (
    organisation_id,
    transaction_type,
    account,
    debit_amount,
    credit_amount,
    transaction_date,
    description,
    notes,
    reference_id,
    reference_table,
    created_by,
    created_by_username
  ) VALUES (
    NEW.organisation_id,
    'miscellaneous_income',
    NEW.account,
    0,
    NEW.amount,
    NEW.transaction_date,
    'Misc Income: ' || NEW.name,
    NEW.description,
    NEW.id,
    'miscellaneous_income',
    NEW.created_by,
    NEW.created_by_username
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_misc_income_to_balance_transaction ON miscellaneous_income;
CREATE TRIGGER trigger_misc_income_to_balance_transaction
AFTER INSERT ON miscellaneous_income
FOR EACH ROW
EXECUTE FUNCTION create_balance_transaction_from_misc_income();

-- Function to create balance transactions from credit holder payments
CREATE OR REPLACE FUNCTION create_balance_transaction_from_credit_payment()
RETURNS TRIGGER AS $$
DECLARE
  credit_holder_name TEXT;
BEGIN
  -- Get credit holder name
  SELECT name INTO credit_holder_name
  FROM credit_holders
  WHERE id = NEW.credit_holder_id;

  INSERT INTO balance_transactions (
    organisation_id,
    transaction_type,
    account,
    debit_amount,
    credit_amount,
    transaction_date,
    description,
    notes,
    reference_id,
    reference_table,
    created_by_username
  ) VALUES (
    NEW.organisation_id,
    'credit_collection',
    NEW.collected_in,
    0,
    NEW.amount,
    NEW.payment_date,
    'Credit payment from ' || credit_holder_name,
    NEW.notes,
    NEW.id,
    'credit_holder_payments',
    (SELECT username FROM admins WHERE organisation_id = NEW.organisation_id LIMIT 1)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_credit_payment_to_balance_transaction ON credit_holder_payments;
CREATE TRIGGER trigger_credit_payment_to_balance_transaction
AFTER INSERT ON credit_holder_payments
FOR EACH ROW
EXECUTE FUNCTION create_balance_transaction_from_credit_payment();

-- Function to create balance transactions from prepaid expense payments
CREATE OR REPLACE FUNCTION create_balance_transaction_from_prepaid_payment()
RETURNS TRIGGER AS $$
DECLARE
  prepaid_name TEXT;
BEGIN
  -- Get prepaid expense name
  SELECT name INTO prepaid_name
  FROM prepaid_expenses
  WHERE id = NEW.prepaid_expense_id;

  INSERT INTO balance_transactions (
    organisation_id,
    transaction_type,
    account,
    debit_amount,
    credit_amount,
    transaction_date,
    description,
    notes,
    reference_id,
    reference_table,
    created_by,
    created_by_username
  ) VALUES (
    NEW.organisation_id,
    'prepaid_expense',
    NEW.paid_from,
    NEW.amount,
    0,
    NEW.payment_date,
    'Prepaid expense payment: ' || prepaid_name,
    NEW.notes,
    NEW.id,
    'prepaid_expense_payments',
    NEW.created_by,
    NEW.created_by_username
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prepaid_payment_to_balance_transaction ON prepaid_expense_payments;
CREATE TRIGGER trigger_prepaid_payment_to_balance_transaction
AFTER INSERT ON prepaid_expense_payments
FOR EACH ROW
EXECUTE FUNCTION create_balance_transaction_from_prepaid_payment();

-- Function to create balance transactions from recurring expense payments
CREATE OR REPLACE FUNCTION create_balance_transaction_from_recurring_payment()
RETURNS TRIGGER AS $$
DECLARE
  recurring_name TEXT;
BEGIN
  -- Get recurring expense name
  SELECT name INTO recurring_name
  FROM recurring_expenses
  WHERE id = NEW.recurring_expense_id;

  INSERT INTO balance_transactions (
    organisation_id,
    transaction_type,
    account,
    debit_amount,
    credit_amount,
    transaction_date,
    description,
    notes,
    reference_id,
    reference_table,
    created_by,
    created_by_username
  ) VALUES (
    NEW.organisation_id,
    'recurring_expense',
    NEW.paid_from,
    NEW.amount,
    0,
    NEW.payment_date,
    'Recurring expense payment: ' || recurring_name,
    NEW.notes,
    NEW.id,
    'recurring_expense_payments',
    NEW.created_by,
    NEW.created_by_username
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recurring_payment_to_balance_transaction ON recurring_expense_payments;
CREATE TRIGGER trigger_recurring_payment_to_balance_transaction
AFTER INSERT ON recurring_expense_payments
FOR EACH ROW
EXECUTE FUNCTION create_balance_transaction_from_recurring_payment();

-- Step 6: Backfill existing transactions into balance_transactions
-- Note: Run this manually after reviewing existing data

-- Backfill expenses
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  reference_id,
  reference_table,
  created_at
)
SELECT
  organisation_id,
  'expense',
  expense_from,
  expense_amount,
  0,
  date,
  expense_name || COALESCE(' - ' || description, ''),
  id,
  'expenses',
  created_at
FROM expenses
WHERE id NOT IN (SELECT reference_id FROM balance_transactions WHERE reference_table = 'expenses');

-- Backfill balance_transfers
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_by,
  created_by_username,
  created_at
)
SELECT
  organisation_id,
  'balance_transfer_debit',
  from_account,
  amount,
  0,
  transaction_date,
  'Transfer to ' || to_account || ': ' || name,
  description,
  id,
  'balance_transfers',
  created_by,
  created_by_username,
  created_at
FROM balance_transfers
WHERE id NOT IN (
  SELECT reference_id FROM balance_transactions
  WHERE reference_table = 'balance_transfers'
  AND transaction_type = 'balance_transfer_debit'
);

INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_by,
  created_by_username,
  created_at
)
SELECT
  organisation_id,
  'balance_transfer_credit',
  to_account,
  0,
  amount,
  transaction_date,
  'Transfer from ' || from_account || ': ' || name,
  description,
  id,
  'balance_transfers',
  created_by,
  created_by_username,
  created_at
FROM balance_transfers
WHERE id NOT IN (
  SELECT reference_id FROM balance_transactions
  WHERE reference_table = 'balance_transfers'
  AND transaction_type = 'balance_transfer_credit'
);

-- Backfill distributor_payments
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_by,
  created_at
)
SELECT
  dp.organisation_id,
  'distributor_payment',
  dp.payment_from,
  0,
  dp.amount,
  dp.payment_date,
  'Payment from ' || d.name ||
    CASE
      WHEN dp.payment_type = 'order_payment' THEN ' for bill ' || COALESCE(dp.bill_number, 'N/A')
      WHEN dp.payment_type = 'advance' THEN ' (Advance)'
      WHEN dp.payment_type = 'opening_balance_payment' THEN ' (Opening Balance)'
      ELSE ''
    END,
  dp.notes,
  dp.id,
  'distributor_payments',
  dp.created_by,
  dp.created_at
FROM distributor_payments dp
JOIN distributors d ON dp.distributor_id = d.id
WHERE dp.id NOT IN (SELECT reference_id FROM balance_transactions WHERE reference_table = 'distributor_payments');

-- Backfill miscellaneous_income (if table exists)
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_by,
  created_by_username,
  created_at
)
SELECT
  organisation_id,
  'miscellaneous_income',
  account,
  0,
  amount,
  transaction_date,
  'Misc Income: ' || name,
  description,
  id,
  'miscellaneous_income',
  created_by,
  created_by_username,
  created_at
FROM miscellaneous_income
WHERE id NOT IN (SELECT reference_id FROM balance_transactions WHERE reference_table = 'miscellaneous_income');

-- Backfill credit_holder_payments
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_at
)
SELECT
  chp.organisation_id,
  'credit_collection',
  chp.collected_in,
  0,
  chp.amount,
  chp.payment_date,
  'Credit payment from ' || ch.name,
  chp.notes,
  chp.id,
  'credit_holder_payments',
  chp.created_at
FROM credit_holder_payments chp
JOIN credit_holders ch ON chp.credit_holder_id = ch.id
WHERE chp.id NOT IN (SELECT reference_id FROM balance_transactions WHERE reference_table = 'credit_holder_payments');

-- Backfill prepaid_expense_payments
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_by,
  created_by_username,
  created_at
)
SELECT
  pep.organisation_id,
  'prepaid_expense',
  pep.paid_from,
  pep.amount,
  0,
  pep.payment_date,
  'Prepaid expense payment: ' || pe.name,
  pep.notes,
  pep.id,
  'prepaid_expense_payments',
  pep.created_by,
  pep.created_by_username,
  pep.created_at
FROM prepaid_expense_payments pep
JOIN prepaid_expenses pe ON pep.prepaid_expense_id = pe.id
WHERE pep.id NOT IN (SELECT reference_id FROM balance_transactions WHERE reference_table = 'prepaid_expense_payments');

-- Backfill recurring_expense_payments
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_by,
  created_by_username,
  created_at
)
SELECT
  rep.organisation_id,
  'recurring_expense',
  rep.paid_from,
  rep.amount,
  0,
  rep.payment_date,
  'Recurring expense payment: ' || re.name,
  rep.notes,
  rep.id,
  'recurring_expense_payments',
  rep.created_by,
  rep.created_by_username,
  rep.created_at
FROM recurring_expense_payments rep
JOIN recurring_expenses re ON rep.recurring_expense_id = re.id
WHERE rep.id NOT IN (SELECT reference_id FROM balance_transactions WHERE reference_table = 'recurring_expense_payments');

-- Verification queries
SELECT 'Total transactions created:' as info, COUNT(*) as count FROM balance_transactions;
SELECT 'Transactions by type:' as info, transaction_type, COUNT(*) as count
FROM balance_transactions
GROUP BY transaction_type
ORDER BY count DESC;
SELECT 'Transactions by account:' as info, account, COUNT(*) as count
FROM balance_transactions
GROUP BY account;

COMMENT ON TABLE balance_transactions IS 'Complete audit trail of all balance-affecting transactions';
