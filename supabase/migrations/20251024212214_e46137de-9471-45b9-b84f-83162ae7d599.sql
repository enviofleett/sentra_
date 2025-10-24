-- Assign admin role to toolbuxdev@gmail.com
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get the user ID for toolbuxdev@gmail.com
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'toolbuxdev@gmail.com'
  LIMIT 1;

  -- If user exists, insert admin role (if not already present)
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user %', target_user_id;
  ELSE
    RAISE NOTICE 'User with email toolbuxdev@gmail.com not found. Please sign up first.';
  END IF;
END $$;