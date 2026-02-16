-- Temporarily make consultant access free for all users through June 2026.
-- Window closes at 2026-07-01 00:00:00 UTC.
CREATE OR REPLACE FUNCTION public.has_active_agent_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOW() < TIMESTAMPTZ '2026-07-01 00:00:00+00' THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.user_agent_subscriptions
        WHERE user_id = p_user_id
          AND is_active = true
          AND expires_at > NOW()
    );
END;
$$;
