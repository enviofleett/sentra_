-- Consultant Engagement Metrics and A/B Assignments
BEGIN;

CREATE TABLE IF NOT EXISTS public.consultant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consultant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.consultant_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.consultant_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY consultant_sessions_select_self
ON public.consultant_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
CREATE POLICY consultant_sessions_insert_self
ON public.consultant_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

ALTER TABLE public.consultant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY consultant_messages_select_self
ON public.consultant_messages
FOR SELECT
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.consultant_sessions WHERE user_id = auth.uid()
  )
);
CREATE POLICY consultant_messages_insert_self
ON public.consultant_messages
FOR INSERT
TO authenticated
WITH CHECK (
  session_id IN (
    SELECT id FROM public.consultant_sessions WHERE user_id = auth.uid()
  )
);

CREATE TABLE IF NOT EXISTS public.consultant_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id UUID NULL REFERENCES public.consultant_sessions(id) ON DELETE SET NULL,
  product_id UUID NULL REFERENCES public.products(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ab_variant TEXT NULL CHECK (ab_variant IN ('A','B')),
  promo_balance NUMERIC NULL,
  moq INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.consultant_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultant_engagements_insert_self
ON public.consultant_engagements
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY consultant_engagements_select_self_or_admin
ON public.consultant_engagements
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- A/B assignments table
CREATE TABLE IF NOT EXISTS public.consultant_ab_assignments (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A','B')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.consultant_ab_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY consultant_ab_assignments_upsert_self
ON public.consultant_ab_assignments
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY consultant_ab_assignments_select_admin
ON public.consultant_ab_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

COMMIT;
