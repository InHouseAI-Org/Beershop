-- ================================================================
-- COPY ORGANIZATION DATA FROM DEMO TO NEW ORGANIZATION
-- ================================================================
-- Source Org (DEMO): cedb75d0-6f37-4078-b832-c8b01d926948
-- Target Org (NEW):  a25cfb82-a092-4641-af44-2cda6b83d497
--
-- IMPORTANT: This script ONLY reads from source and writes to target.
-- It does NOT modify the demo organization data in any way.
-- NOTE: Admins and Users are NOT copied (they should already exist in target org)
-- ================================================================

BEGIN;

-- Define variables for clarity
DO $$
DECLARE
    source_org_id UUID := 'cedb75d0-6f37-4078-b832-c8b01d926948';
    target_org_id UUID := 'a25cfb82-a092-4641-af44-2cda6b83d497';

    -- Target org's existing admin and user IDs
    target_admin_id UUID := '6cb24b7d-1e16-4d20-b668-4a18f3091ab2';
    target_user_id UUID := 'b680a05a-ea6c-4a5c-ac11-16248e746dd4';

    -- ID mapping tables (old UUID -> new UUID)
    product_id_map JSONB := '{}';
    credit_holder_id_map JSONB := '{}';
    distributor_id_map JSONB := '{}';
    sales_id_map JSONB := '{}';
    order_id_map JSONB := '{}';
    recurring_expense_id_map JSONB := '{}';
    prepaid_expense_id_map JSONB := '{}';
BEGIN
    RAISE NOTICE 'Starting organization data copy...';
    RAISE NOTICE 'Source Org: %', source_org_id;
    RAISE NOTICE 'Target Org: %', target_org_id;
    RAISE NOTICE 'Target Admin ID: %', target_admin_id;
    RAISE NOTICE 'Target User ID: %', target_user_id;

    -- ================================================================
    -- STEP 1: Copy PRODUCTS
    -- ================================================================
    RAISE NOTICE 'Copying products...';

    WITH inserted AS (
        INSERT INTO products (id, product_name, sale_price, average_buy_price, organisation_id, created_at, updated_at)
        SELECT
            gen_random_uuid() as id,
            product_name,
            sale_price,
            average_buy_price,
            target_org_id,
            NOW() as created_at,
            NOW() as updated_at
        FROM products
        WHERE organisation_id = source_org_id
        RETURNING id, product_name
    ),
    original AS (
        SELECT id, product_name FROM products WHERE organisation_id = source_org_id
    )
    SELECT jsonb_object_agg(o.id::text, i.id::text) INTO product_id_map
    FROM original o
    JOIN inserted i ON o.product_name = i.product_name;

    -- ================================================================
    -- STEP 2: Copy INVENTORY
    -- ================================================================
    RAISE NOTICE 'Copying inventory...';

    INSERT INTO inventory (id, product_id, qty, organisation_id, created_at, updated_at)
    SELECT
        gen_random_uuid() as id,
        (product_id_map->>inv.product_id::text)::UUID as product_id,
        qty,
        target_org_id,
        NOW() as created_at,
        NOW() as updated_at
    FROM inventory inv
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 3: Copy CREDIT HOLDERS
    -- ================================================================
    RAISE NOTICE 'Copying credit holders...';

    WITH inserted AS (
        INSERT INTO credit_holders (id, name, address, phone, amount_payable, organisation_id, created_at, updated_at)
        SELECT
            gen_random_uuid() as id,
            name,
            address,
            phone,
            amount_payable,
            target_org_id,
            NOW() as created_at,
            NOW() as updated_at
        FROM credit_holders
        WHERE organisation_id = source_org_id
        RETURNING id, name
    ),
    original AS (
        SELECT id, name FROM credit_holders WHERE organisation_id = source_org_id
    )
    SELECT jsonb_object_agg(o.id::text, i.id::text) INTO credit_holder_id_map
    FROM original o
    JOIN inserted i ON o.name = i.name;

    -- ================================================================
    -- STEP 4: Copy DISTRIBUTORS
    -- ================================================================
    RAISE NOTICE 'Copying distributors...';

    WITH inserted AS (
        INSERT INTO distributors (id, name, address, phone, amount_outstanding, organisation_id, created_at, updated_at)
        SELECT
            gen_random_uuid() as id,
            name,
            address,
            phone,
            amount_outstanding,
            target_org_id,
            NOW() as created_at,
            NOW() as updated_at
        FROM distributors
        WHERE organisation_id = source_org_id
        RETURNING id, name
    ),
    original AS (
        SELECT id, name FROM distributors WHERE organisation_id = source_org_id
    )
    SELECT jsonb_object_agg(o.id::text, i.id::text) INTO distributor_id_map
    FROM original o
    JOIN inserted i ON o.name = i.name;

    -- ================================================================
    -- STEP 5: Copy SALES (using target org's admin and user IDs)
    -- ================================================================
    RAISE NOTICE 'Copying sales...';

    WITH inserted AS (
        INSERT INTO sales (
            id, organisation_id, user_id, admin_id, date, status,
            opening_stock, closing_stock, sale,
            cash_collected, upi, miscellaneous, miscellaneous_type,
            miscellaneous_cash, miscellaneous_upi, gala_balance_today,
            credit, credit_taken, remarks,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid() as id,
            target_org_id,
            CASE WHEN user_id IS NOT NULL THEN target_user_id ELSE NULL END as user_id,
            CASE WHEN admin_id IS NOT NULL THEN target_admin_id ELSE NULL END as admin_id,
            date,
            status,
            opening_stock,
            closing_stock,
            sale,
            cash_collected,
            upi,
            miscellaneous,
            miscellaneous_type,
            miscellaneous_cash,
            miscellaneous_upi,
            gala_balance_today,
            credit,
            credit_taken,
            remarks,
            NOW() as created_at,
            NOW() as updated_at
        FROM sales
        WHERE organisation_id = source_org_id
        RETURNING id, date
    ),
    original AS (
        SELECT id, date FROM sales WHERE organisation_id = source_org_id
    )
    SELECT jsonb_object_agg(o.id::text, i.id::text) INTO sales_id_map
    FROM original o
    JOIN inserted i ON o.date = i.date;

    -- ================================================================
    -- STEP 6: Copy ORDERS
    -- ================================================================
    RAISE NOTICE 'Copying orders...';

    -- Temporarily disable the TCS/TDS trigger to avoid issues with missing created_by field
    ALTER TABLE orders DISABLE TRIGGER trigger_update_tcs_tds_ledgers;

    WITH inserted AS (
        INSERT INTO orders (
            id, organisation_id, distributor_id, order_date,
            order_data, tax, misc, discount, scheme, tcs, tds,
            bill_number, payment_outstanding_date,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid() as id,
            target_org_id,
            (distributor_id_map->>distributor_id::text)::UUID as distributor_id,
            order_date,
            order_data,
            tax,
            misc,
            discount,
            scheme,
            tcs,
            tds,
            bill_number,
            payment_outstanding_date,
            NOW() as created_at,
            NOW() as updated_at
        FROM orders
        WHERE organisation_id = source_org_id
        RETURNING id, order_date, distributor_id
    ),
    original AS (
        SELECT id, order_date, distributor_id FROM orders WHERE organisation_id = source_org_id
    )
    SELECT jsonb_object_agg(o.id::text, i.id::text) INTO order_id_map
    FROM original o
    JOIN inserted i ON o.order_date = i.order_date AND o.distributor_id::text = (
        SELECT jsonb_object_agg(v::text, k::text) FROM jsonb_each_text(distributor_id_map) t(k,v)
    )->>i.distributor_id::text;

    -- Re-enable the trigger after orders are copied
    ALTER TABLE orders ENABLE TRIGGER trigger_update_tcs_tds_ledgers;

    -- ================================================================
    -- STEP 7: Copy BALANCES
    -- ================================================================
    RAISE NOTICE 'Copying balances...';

    INSERT INTO balances (
        id, organisation_id, sales_id, date,
        cash_balance, bank_balance, gala_balance,
        created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (sales_id_map->>sales_id::text)::UUID as sales_id,
        date,
        cash_balance,
        bank_balance,
        gala_balance,
        NOW() as created_at,
        NOW() as updated_at
    FROM balances
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 8: Copy EXPENSES
    -- ================================================================
    RAISE NOTICE 'Copying expenses...';

    INSERT INTO expenses (
        id, organisation_id, expense_name, description, expense_from, expense_amount, date,
        created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        expense_name,
        description,
        expense_from,
        expense_amount,
        date,
        NOW() as created_at,
        NOW() as updated_at
    FROM expenses
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 9: Copy DAILY_EXPENSES
    -- ================================================================
    RAISE NOTICE 'Copying daily expenses...';

    INSERT INTO daily_expenses (
        id, organisation_id, sale_id, name, description, amount, expense_date,
        created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (sales_id_map->>sale_id::text)::UUID as sale_id,
        name,
        description,
        amount,
        expense_date,
        NOW() as created_at,
        NOW() as updated_at
    FROM daily_expenses
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 10: Copy CREDIT_COLLECTION_HISTORY
    -- ================================================================
    RAISE NOTICE 'Copying credit collection history...';

    INSERT INTO credit_collection_history (
        id, organisation_id, credit_holder_id, sale_id, amount_collected,
        previous_outstanding, new_outstanding, collected_by, notes,
        transaction_type, collected_in, collection_type, collected_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (credit_holder_id_map->>credit_holder_id::text)::UUID as credit_holder_id,
        (sales_id_map->>sale_id::text)::UUID as sale_id,
        amount_collected,
        previous_outstanding,
        new_outstanding,
        collected_by,
        notes,
        transaction_type,
        collected_in,
        collection_type,
        collected_at
    FROM credit_collection_history
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 11: Copy DISTRIBUTOR_PAYMENT_HISTORY
    -- ================================================================
    RAISE NOTICE 'Copying distributor payment history...';

    INSERT INTO distributor_payment_history (
        id, organisation_id, distributor_id, amount_paid,
        previous_outstanding, new_outstanding, paid_by, notes, paid_from, paid_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (distributor_id_map->>distributor_id::text)::UUID as distributor_id,
        amount_paid,
        previous_outstanding,
        new_outstanding,
        paid_by,
        notes,
        paid_from,
        paid_at
    FROM distributor_payment_history
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 12: Copy BALANCE_TRANSFERS (using target org's user ID)
    -- ================================================================
    RAISE NOTICE 'Copying balance transfers...';

    INSERT INTO balance_transfers (
        id, organisation_id, name, description, amount, from_account, to_account,
        transaction_date, created_by, created_by_username, created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        name,
        description,
        amount,
        from_account,
        to_account,
        transaction_date,
        CASE WHEN created_by IS NOT NULL THEN target_user_id ELSE NULL END as created_by,
        created_by_username,
        NOW() as created_at,
        NOW() as updated_at
    FROM balance_transfers
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 13: Copy BALANCE_TRANSACTIONS
    -- ================================================================
    RAISE NOTICE 'Copying balance transactions...';

    INSERT INTO balance_transactions (
        id, organisation_id, transaction_type, account,
        debit_amount, credit_amount, transaction_date, description, notes,
        reference_id, reference_table, created_by, created_by_username,
        created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
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
        NOW() as created_at,
        NOW() as updated_at
    FROM balance_transactions
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 14: Copy SCHEMES
    -- ================================================================
    RAISE NOTICE 'Copying schemes...';

    INSERT INTO schemes (
        id, organisation_id, distributor_id, scheme_name, scheme_start_date,
        scheme_period_value, scheme_period_unit, scheme_target_qty, target_type,
        scheme_products, scheme_value, status, achieved, achieved_date, notes,
        created_by, created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (distributor_id_map->>distributor_id::text)::UUID as distributor_id,
        scheme_name,
        scheme_start_date,
        scheme_period_value,
        scheme_period_unit,
        scheme_target_qty,
        target_type,
        scheme_products,
        scheme_value,
        status,
        achieved,
        achieved_date,
        notes,
        CASE WHEN created_by IS NOT NULL THEN target_admin_id ELSE NULL END as created_by,
        NOW() as created_at,
        NOW() as updated_at
    FROM schemes
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 15: Copy RECURRING_EXPENSES (using target org's admin ID)
    -- ================================================================
    RAISE NOTICE 'Copying recurring expenses...';

    WITH inserted AS (
        INSERT INTO recurring_expenses (
            id, organisation_id, expense_name, recurrence_type, recurrence_frequency,
            expense_amount, next_due_date, is_active, notes, created_by,
            created_at, updated_at
        )
        SELECT
            gen_random_uuid() as id,
            target_org_id,
            expense_name,
            recurrence_type,
            recurrence_frequency,
            expense_amount,
            next_due_date,
            is_active,
            notes,
            CASE WHEN created_by IS NOT NULL THEN target_admin_id ELSE NULL END as created_by,
            NOW() as created_at,
            NOW() as updated_at
        FROM recurring_expenses
        WHERE organisation_id = source_org_id
        RETURNING id, expense_name
    ),
    original AS (
        SELECT id, expense_name FROM recurring_expenses WHERE organisation_id = source_org_id
    )
    SELECT jsonb_object_agg(o.id::text, i.id::text) INTO recurring_expense_id_map
    FROM original o
    JOIN inserted i ON o.expense_name = i.expense_name;

    -- ================================================================
    -- STEP 16: Copy RECURRING_EXPENSE_PAYMENTS
    -- ================================================================
    RAISE NOTICE 'Copying recurring expense payments...';

    INSERT INTO recurring_expense_payments (
        id, organisation_id, recurring_expense_id, expense_id, payment_date, amount,
        paid_from, notes, created_by, created_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (recurring_expense_id_map->>recurring_expense_id::text)::UUID as recurring_expense_id,
        expense_id,
        payment_date,
        amount,
        paid_from,
        notes,
        CASE WHEN created_by IS NOT NULL THEN target_admin_id ELSE NULL END as created_by,
        NOW() as created_at
    FROM recurring_expense_payments
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 17: Copy MISCELLANEOUS_INCOME (using target org's admin ID)
    -- ================================================================
    RAISE NOTICE 'Copying miscellaneous income...';

    INSERT INTO miscellaneous_income (
        id, organisation_id, name, description, amount, account, transaction_date,
        created_by, created_by_username, created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        name,
        description,
        amount,
        account,
        transaction_date,
        CASE WHEN created_by IS NOT NULL THEN target_admin_id ELSE NULL END as created_by,
        created_by_username,
        NOW() as created_at,
        NOW() as updated_at
    FROM miscellaneous_income
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 18: Copy PREPAID_EXPENSES
    -- ================================================================
    RAISE NOTICE 'Copying prepaid expenses...';

    WITH inserted AS (
        INSERT INTO prepaid_expenses (
            id, organisation_id, recurring_expense_id, payment_date, paid_from,
            advance_periods, period_type, amount_per_period, total_amount,
            coverage_start_date, coverage_end_date, remaining_value, amortized_value,
            notes, created_by, created_at, updated_at
        )
        SELECT
            gen_random_uuid() as id,
            target_org_id,
            (recurring_expense_id_map->>recurring_expense_id::text)::UUID as recurring_expense_id,
            payment_date,
            paid_from,
            advance_periods,
            period_type,
            amount_per_period,
            total_amount,
            coverage_start_date,
            coverage_end_date,
            remaining_value,
            amortized_value,
            notes,
            CASE WHEN created_by IS NOT NULL THEN target_admin_id ELSE NULL END as created_by,
            NOW() as created_at,
            NOW() as updated_at
        FROM prepaid_expenses
        WHERE organisation_id = source_org_id
        RETURNING id, payment_date
    ),
    original AS (
        SELECT id, payment_date FROM prepaid_expenses WHERE organisation_id = source_org_id
    )
    SELECT jsonb_object_agg(o.id::text, i.id::text) INTO prepaid_expense_id_map
    FROM original o
    JOIN inserted i ON o.payment_date = i.payment_date;

    -- ================================================================
    -- STEP 19: Copy PREPAID_EXPENSE_AMORTIZATIONS
    -- ================================================================
    RAISE NOTICE 'Copying prepaid expense amortizations...';

    INSERT INTO prepaid_expense_amortizations (
        id, organisation_id, prepaid_expense_id, amortization_date, amount, expense_id, created_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (prepaid_expense_id_map->>prepaid_expense_id::text)::UUID as prepaid_expense_id,
        amortization_date,
        amount,
        expense_id,
        NOW() as created_at
    FROM prepaid_expense_amortizations
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 20: Copy DISTRIBUTOR_PAYMENTS
    -- ================================================================
    RAISE NOTICE 'Copying distributor payments...';

    INSERT INTO distributor_payments (
        id, organisation_id, distributor_id, order_id, payment_type, amount,
        payment_from, bill_number, payment_date, notes, created_by,
        created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (distributor_id_map->>distributor_id::text)::UUID as distributor_id,
        CASE WHEN order_id IS NOT NULL THEN (order_id_map->>order_id::text)::UUID ELSE NULL END as order_id,
        payment_type,
        amount,
        payment_from,
        bill_number,
        payment_date,
        notes,
        CASE WHEN created_by IS NOT NULL THEN target_admin_id ELSE NULL END as created_by,
        NOW() as created_at,
        NOW() as updated_at
    FROM distributor_payments
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 21: Copy TCS_LEDGER
    -- ================================================================
    RAISE NOTICE 'Copying TCS ledger...';

    INSERT INTO tcs_ledger (
        id, organisation_id, order_id, distributor_id, tcs_amount, order_date,
        created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (order_id_map->>order_id::text)::UUID as order_id,
        (distributor_id_map->>distributor_id::text)::UUID as distributor_id,
        tcs_amount,
        order_date,
        NOW() as created_at,
        NOW() as updated_at
    FROM tcs_ledger
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 22: Copy TDS_LEDGER
    -- ================================================================
    RAISE NOTICE 'Copying TDS ledger...';

    INSERT INTO tds_ledger (
        id, organisation_id, order_id, distributor_id, tds_amount, order_date,
        created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        (order_id_map->>order_id::text)::UUID as order_id,
        (distributor_id_map->>distributor_id::text)::UUID as distributor_id,
        tds_amount,
        order_date,
        NOW() as created_at,
        NOW() as updated_at
    FROM tds_ledger
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- STEP 23: Copy SALES_DRAFTS (using target org's user ID)
    -- ================================================================
    RAISE NOTICE 'Copying sales drafts...';

    INSERT INTO sales_drafts (
        id, organisation_id, user_id, draft_data, created_at, updated_at
    )
    SELECT
        gen_random_uuid() as id,
        target_org_id,
        CASE WHEN user_id IS NOT NULL THEN target_user_id ELSE NULL END as user_id,
        draft_data,
        NOW() as created_at,
        NOW() as updated_at
    FROM sales_drafts
    WHERE organisation_id = source_org_id;

    -- ================================================================
    -- COMPLETION
    -- ================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organization data copy completed successfully!';
    RAISE NOTICE 'All data from org % has been copied to org %', source_org_id, target_org_id;
    RAISE NOTICE 'The source organization data remains unchanged.';
    RAISE NOTICE '========================================';

END $$;

COMMIT;