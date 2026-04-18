-- ============================================
-- FIX: Remove created_by from TCS/TDS Trigger
-- ============================================
-- The trigger was trying to insert created_by field which doesn't exist
-- in the orders table, causing order creation to fail
-- ============================================

BEGIN;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_update_tcs_tds_ledgers ON orders;

-- Recreate the function WITHOUT created_by field
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

COMMENT ON FUNCTION update_tcs_tds_ledgers() IS 'Automatically populates TCS and TDS ledgers when orders are created';

-- Recreate the trigger
CREATE TRIGGER trigger_update_tcs_tds_ledgers
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION update_tcs_tds_ledgers();

COMMIT;

-- Verify the trigger was created successfully
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'trigger_update_tcs_tds_ledgers';
