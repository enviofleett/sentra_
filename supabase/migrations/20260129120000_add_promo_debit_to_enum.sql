-- Add 'promo_debit' to wallet_transaction_type enum
-- This is required for the debit_promo_wallet RPC to work correctly

ALTER TYPE public.wallet_transaction_type ADD VALUE IF NOT EXISTS 'promo_debit';
