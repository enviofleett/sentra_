-- Create password_change_audit table for logging all password changes
-- This is critical for security compliance and tracking unauthorized access attempts

CREATE TABLE IF NOT EXISTS public.password_change_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('user_initiated', 'admin_reset', 'recovery_link')),
  change_source TEXT NOT NULL CHECK (change_source IN ('profile_page', 'reset_password_page', 'admin_action')),
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  initiated_by UUID REFERENCES auth.users(id), -- For admin-initiated resets
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX idx_password_audit_user_id ON public.password_change_audit(user_id);
CREATE INDEX idx_password_audit_created_at ON public.password_change_audit(created_at DESC);
CREATE INDEX idx_password_audit_change_type ON public.password_change_audit(change_type);

-- Enable Row Level Security
ALTER TABLE public.password_change_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own password change history
CREATE POLICY "Users can view own password change history"
  ON public.password_change_audit
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all password change history
CREATE POLICY "Admins can view all password change history"
  ON public.password_change_audit
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- RLS Policy: Authenticated users can insert their own audit logs
CREATE POLICY "Users can insert own password change audit"
  ON public.password_change_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- RLS Policy: Service role can insert audit logs (for edge functions)
-- Note: Service role bypasses RLS by default, but we include this for clarity
CREATE POLICY "Service role can insert audit logs"
  ON public.password_change_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment explaining the table purpose
COMMENT ON TABLE public.password_change_audit IS 'Audit log for all password change events. Critical for security compliance and incident investigation.';
COMMENT ON COLUMN public.password_change_audit.change_type IS 'Type of password change: user_initiated (user changing own password), admin_reset (admin sending reset link), recovery_link (user using forgot password flow)';
COMMENT ON COLUMN public.password_change_audit.change_source IS 'Where the change originated: profile_page, reset_password_page, or admin_action';
COMMENT ON COLUMN public.password_change_audit.initiated_by IS 'For admin resets, the admin user who initiated the reset';
