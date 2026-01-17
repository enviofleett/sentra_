-- Add DELETE policy for email_campaigns so admins can remove campaigns
CREATE POLICY "Admins can delete email campaigns"
ON public.email_campaigns
FOR DELETE
USING (is_admin());