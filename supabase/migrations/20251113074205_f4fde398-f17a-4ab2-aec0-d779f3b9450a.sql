-- Grant admin role to toolbuxdev@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('abd79d04-6270-4625-94c1-ff4c957440da', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;