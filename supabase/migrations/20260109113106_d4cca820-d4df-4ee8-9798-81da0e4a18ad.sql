-- Create table for email campaigns
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  recipient_filter TEXT NOT NULL DEFAULT 'all',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for individual email tracking events
CREATE TABLE public.email_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'sent', 'opened', 'clicked'
  link_url TEXT, -- For click events
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;

-- Admin policies for email_campaigns
CREATE POLICY "Admins can view email campaigns"
ON public.email_campaigns FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can insert email campaigns"
ON public.email_campaigns FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update email campaigns"
ON public.email_campaigns FOR UPDATE
USING (public.is_admin());

-- Admin policies for tracking events (read-only for admins)
CREATE POLICY "Admins can view tracking events"
ON public.email_tracking_events FOR SELECT
USING (public.is_admin());

-- Service role can insert tracking events (from edge functions)
CREATE POLICY "Service can insert tracking events"
ON public.email_tracking_events FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_email_tracking_campaign ON public.email_tracking_events(campaign_id);
CREATE INDEX idx_email_tracking_type ON public.email_tracking_events(event_type);
CREATE INDEX idx_email_campaigns_created ON public.email_campaigns(created_at DESC);