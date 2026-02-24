CREATE TABLE public.email_unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email unsubscribes"
ON public.email_unsubscribes FOR SELECT
USING (public.is_admin());

CREATE POLICY "Service can insert email unsubscribes"
ON public.email_unsubscribes FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_email_unsubscribes_email ON public.email_unsubscribes(email);

