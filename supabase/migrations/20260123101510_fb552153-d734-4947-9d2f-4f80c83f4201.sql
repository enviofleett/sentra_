-- Create password_change_audit table if not exists
CREATE TABLE IF NOT EXISTS public.password_change_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('user_initiated', 'admin_reset', 'recovery_link')),
  change_source TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  initiated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_password_change_audit_user_id ON public.password_change_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_password_change_audit_created_at ON public.password_change_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_change_audit_change_type ON public.password_change_audit(change_type);

-- Enable RLS
ALTER TABLE public.password_change_audit ENABLE ROW LEVEL SECURITY;

-- Users can view their own password change history
CREATE POLICY "Users can view own password changes"
ON public.password_change_audit
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all password change history
CREATE POLICY "Admins can view all password changes"
ON public.password_change_audit
FOR SELECT
USING (public.is_admin());

-- Users can insert their own audit logs (for profile page changes)
CREATE POLICY "Users can insert own audit logs"
ON public.password_change_audit
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can insert audit logs (for edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.password_change_audit
FOR INSERT
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.password_change_audit IS 'Audit log for all password change events';