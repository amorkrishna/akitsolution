-- Migration: Add call_for_price column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS call_for_price BOOLEAN DEFAULT FALSE;
