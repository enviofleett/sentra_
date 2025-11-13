-- Grant admin role to user chudesyl@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('0412af69-f0a7-4995-b4ec-0c0f984ebdd0', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;