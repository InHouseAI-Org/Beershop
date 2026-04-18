-- ============================================
-- FIX: Handle TCS/TDS Ledger on Order UPDATE and DELETE
-- ============================================
-- Currently, TCS/TDS ledger entries are only created on INSERT
-- This fix ensures ledger entries are properly updated/deleted when orders change
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Drop existing trigger and recreate for INSERT, UPDATE, DELETE
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_tcs_tds_ledgers ON orders;

-- ============================================
-- STEP 2: Create comprehensive function to handle INSERT, UPDATE, DELETE
-- ============================================
CREATE OR REPLACE FUNCTION update_tcs_tds_ledgers()
RETURNS TRIGGER AS $$
BEGIN
  -- ========================================
  -- HANDLE INSERT: Create new ledger entries
  -- ========================================
  IF TG_OP = 'INSERT' THEN
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
  END IF;

  -- ========================================
  -- HANDLE UPDATE: Update or create/delete ledger entries as needed
  -- ========================================
  IF TG_OP = 'UPDATE' THEN
    -- Handle TCS changes
    IF OLD.tcs IS DISTINCT FROM NEW.tcs OR
       OLD.order_date IS DISTINCT FROM NEW.order_date OR
       OLD.bill_number IS DISTINCT FROM NEW.bill_number OR
       OLD.distributor_id IS DISTINCT FROM NEW.distributor_id THEN

      -- If OLD had TCS, update or delete the existing entry
      IF OLD.tcs > 0 THEN
        IF NEW.tcs > 0 THEN
          -- Update existing TCS entry
          UPDATE tcs_ledger
          SET
            tcs_amount = NEW.tcs,
            order_date = NEW.order_date,
            bill_number = NEW.bill_number,
            distributor_id = NEW.distributor_id,
            updated_at = CURRENT_TIMESTAMP
          WHERE order_id = NEW.id;
        ELSE
          -- NEW.tcs is 0 or null, delete the entry
          DELETE FROM tcs_ledger WHERE order_id = NEW.id;
        END IF;
      ELSE
        -- OLD.tcs was 0, but NEW.tcs > 0, create new entry
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
      END IF;
    END IF;

    -- Handle TDS changes
    IF OLD.tds IS DISTINCT FROM NEW.tds OR
       OLD.order_date IS DISTINCT FROM NEW.order_date OR
       OLD.bill_number IS DISTINCT FROM NEW.bill_number OR
       OLD.distributor_id IS DISTINCT FROM NEW.distributor_id THEN

      -- If OLD had TDS, update or delete the existing entry
      IF OLD.tds > 0 THEN
        IF NEW.tds > 0 THEN
          -- Update existing TDS entry
          UPDATE tds_ledger
          SET
            tds_amount = NEW.tds,
            order_date = NEW.order_date,
            bill_number = NEW.bill_number,
            distributor_id = NEW.distributor_id,
            updated_at = CURRENT_TIMESTAMP
          WHERE order_id = NEW.id;
        ELSE
          -- NEW.tds is 0 or null, delete the entry
          DELETE FROM tds_ledger WHERE order_id = NEW.id;
        END IF;
      ELSE
        -- OLD.tds was 0, but NEW.tds > 0, create new entry
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
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- ========================================
  -- HANDLE DELETE: Remove ledger entries (if CASCADE doesn't handle it)
  -- ========================================
  IF TG_OP = 'DELETE' THEN
    -- Note: If tcs_ledger and tds_ledger have ON DELETE CASCADE on order_id,
    -- this is redundant but safe to have as a backup
    DELETE FROM tcs_ledger WHERE order_id = OLD.id;
    DELETE FROM tds_ledger WHERE order_id = OLD.id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_tcs_tds_ledgers() IS 'Automatically manages TCS and TDS ledger entries when orders are inserted, updated, or deleted';

-- ============================================
-- STEP 3: Create trigger for INSERT, UPDATE, and DELETE
-- ============================================
CREATE TRIGGER trigger_update_tcs_tds_ledgers
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_tcs_tds_ledgers();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the trigger was created successfully
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name,
  CASE
    WHEN tgtype::integer & 2 > 0 THEN 'BEFORE'
    WHEN tgtype::integer & 64 > 0 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as timing,
  CASE
    WHEN tgtype::integer & 4 > 0 THEN 'INSERT '
    ELSE ''
  END ||
  CASE
    WHEN tgtype::integer & 8 > 0 THEN 'DELETE '
    ELSE ''
  END ||
  CASE
    WHEN tgtype::integer & 16 > 0 THEN 'UPDATE '
    ELSE ''
  END as events
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'trigger_update_tcs_tds_ledgers';

-- Show sample of TCS/TDS ledger entries to verify
SELECT
  'TCS Ledger' as ledger_type,
  COUNT(*) as total_entries,
  SUM(tcs_amount) as total_amount,
  COUNT(DISTINCT order_id) as unique_orders
FROM tcs_ledger
UNION ALL
SELECT
  'TDS Ledger' as ledger_type,
  COUNT(*) as total_entries,
  SUM(tds_amount) as total_amount,
  COUNT(DISTINCT order_id) as unique_orders
FROM tds_ledger;
