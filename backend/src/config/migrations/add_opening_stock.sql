-- Migration: Add opening_stock column to sales table
-- Run this with: psql -h localhost -U bs_user -d beershop -f add_opening_stock.sql

ALTER TABLE sales ADD COLUMN IF NOT EXISTS opening_stock JSONB;
