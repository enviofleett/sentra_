-- Grant admin role to user chudesyl@gmail.com
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get the user ID for chudesyl@gmail.com
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'chudesyl@gmail.com'
  LIMIT 1;

  -- If user exists, insert admin role (if not already present)
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user %', target_user_id;
  ELSE
    RAISE NOTICE 'User with email chudesyl@gmail.com not found. Skipping admin role assignment.';
  END IF;
END $$;

-- Add product_manager role if it doesn't exist
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'product_manager';
