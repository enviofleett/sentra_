-- Rename 'Sentra Perfumes Main' to 'Sentra' if it exists to standardize the name
UPDATE public.vendors 
SET rep_full_name = 'Sentra' 
WHERE rep_full_name = 'Sentra Perfumes Main';

-- Insert 'Sentra' if it doesn't exist (and wasn't just renamed)
-- We use ON CONFLICT to update the name to 'Sentra' if the email matches but name was different
INSERT INTO public.vendors (rep_full_name, email, store_location, min_order_quantity)
VALUES ('Sentra', 'admin@sentraperfumes.com', 'Head Office', 1)
ON CONFLICT (email) 
DO UPDATE SET rep_full_name = 'Sentra';

-- Update ALL products to use the 'Sentra' vendor
-- This ensures every single product in the store is assigned to Sentra
UPDATE public.products 
SET vendor_id = (SELECT id FROM public.vendors WHERE rep_full_name = 'Sentra' LIMIT 1);
