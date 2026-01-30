-- Migration commented out to resolve conflict with 20251112 baseline
-- This migration attempted to create enums that are properly defined in later migrations.

-- Create app_role enum
-- DO $$ BEGIN
--     CREATE TYPE app_role AS ENUM ('admin', 'user');
-- EXCEPTION
--     WHEN duplicate_object THEN null;
-- END $$;
