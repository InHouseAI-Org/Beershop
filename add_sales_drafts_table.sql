-- ============================================
-- SALES DRAFTS TABLE MIGRATION
-- Run this script in Neon SQL Editor to add sales_drafts table
-- ============================================

-- Create sales_drafts table to store in-progress sales forms
CREATE TABLE IF NOT EXISTS sales_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organisation_id, user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_drafts_user_org ON sales_drafts(user_id, organisation_id);

-- Add comment to table
COMMENT ON TABLE sales_drafts IS 'Stores draft sales forms that users can save and resume later';
COMMENT ON COLUMN sales_drafts.draft_data IS 'JSONB object containing all form state: productData, creditEntries, creditTaken, dailyExpenses, saleDate, upiTotal, miscellaneousCash, miscellaneousUPI, remarks';
