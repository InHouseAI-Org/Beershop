-- Drop the old constraint
ALTER TABLE distributor_payments
DROP CONSTRAINT IF EXISTS distributor_payments_payment_type_check;

-- Add new constraint that includes 'opening_balance_payment'
ALTER TABLE distributor_payments
ADD CONSTRAINT distributor_payments_payment_type_check
CHECK (payment_type IN ('order_payment', 'advance', 'opening_balance_payment'));
