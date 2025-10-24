-- Update app_role enum to include new admin roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'product_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'order_processor';