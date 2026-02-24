-- Influencer MOQ policy support

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_influencer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS influencer_moq_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS influencer_assigned_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS influencer_assigned_by uuid NULL,
  ADD COLUMN IF NOT EXISTS influencer_disabled_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS influencer_disable_reason text NULL,
  ADD COLUMN IF NOT EXISTS influencer_last_paid_orders_30d integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS influencer_last_evaluated_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_created_payment_status
  ON public.orders(user_id, created_at, payment_status);

CREATE OR REPLACE FUNCTION public.get_paid_orders_last_30d(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.orders
  WHERE user_id = p_user_id
    AND payment_status = 'paid'
    AND created_at IS NOT NULL
    AND created_at >= (now() - interval '30 days');
$$;

CREATE OR REPLACE FUNCTION public.evaluate_influencer_compliance(p_user_id uuid)
RETURNS TABLE (
  required_moq integer,
  is_influencer boolean,
  influencer_moq_enabled boolean,
  paid_orders_last_30d integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_paid_orders integer := 0;
  v_is_influencer boolean := false;
  v_influencer_moq_enabled boolean := false;
BEGIN
  SELECT p.is_influencer, p.influencer_moq_enabled
  INTO v_is_influencer, v_influencer_moq_enabled
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  v_paid_orders := public.get_paid_orders_last_30d(p_user_id);

  IF v_is_influencer AND v_influencer_moq_enabled AND v_paid_orders < 4 THEN
    UPDATE public.profiles
    SET influencer_moq_enabled = false,
        influencer_disabled_at = now(),
        influencer_disable_reason = 'Auto-disabled: fewer than 4 paid orders in rolling 30 days',
        influencer_last_paid_orders_30d = v_paid_orders,
        influencer_last_evaluated_at = now(),
        updated_at = now()
    WHERE id = p_user_id;

    v_influencer_moq_enabled := false;
  ELSE
    UPDATE public.profiles
    SET influencer_last_paid_orders_30d = v_paid_orders,
        influencer_last_evaluated_at = now(),
        updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN QUERY
  SELECT
    CASE WHEN v_is_influencer AND v_influencer_moq_enabled THEN 1 ELSE 4 END AS required_moq,
    v_is_influencer,
    v_influencer_moq_enabled,
    v_paid_orders;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_checkout_policy()
RETURNS TABLE (
  required_moq integer,
  is_influencer boolean,
  influencer_moq_enabled boolean,
  paid_orders_last_30d integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.evaluate_influencer_compliance(v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_influencer_profile(
  p_user_id uuid,
  p_is_influencer boolean,
  p_enable_moq boolean DEFAULT false
)
RETURNS TABLE (
  required_moq integer,
  is_influencer boolean,
  influencer_moq_enabled boolean,
  paid_orders_last_30d integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_was_influencer boolean := false;
  v_paid_orders integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update influencer profile settings';
  END IF;

  v_admin_id := auth.uid();

  SELECT is_influencer
  INTO v_was_influencer
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', p_user_id;
  END IF;

  IF p_is_influencer AND p_enable_moq THEN
    v_paid_orders := public.get_paid_orders_last_30d(p_user_id);
    IF v_paid_orders < 4 THEN
      RAISE EXCEPTION 'Cannot enable influencer MOQ: user has % paid order(s) in the last 30 days (minimum 4 required)', v_paid_orders;
    END IF;
  END IF;

  IF NOT p_is_influencer THEN
    UPDATE public.profiles
    SET is_influencer = false,
        influencer_moq_enabled = false,
        influencer_assigned_at = NULL,
        influencer_assigned_by = NULL,
        influencer_disabled_at = now(),
        influencer_disable_reason = 'Admin removed influencer profile',
        influencer_last_evaluated_at = now(),
        influencer_last_paid_orders_30d = public.get_paid_orders_last_30d(p_user_id),
        updated_at = now()
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET is_influencer = true,
        influencer_moq_enabled = p_enable_moq,
        influencer_assigned_at = CASE
          WHEN NOT v_was_influencer THEN now()
          ELSE influencer_assigned_at
        END,
        influencer_assigned_by = CASE
          WHEN NOT v_was_influencer THEN v_admin_id
          ELSE influencer_assigned_by
        END,
        influencer_disabled_at = CASE
          WHEN p_enable_moq THEN NULL
          WHEN influencer_moq_enabled THEN now()
          ELSE COALESCE(influencer_disabled_at, now())
        END,
        influencer_disable_reason = CASE
          WHEN p_enable_moq THEN NULL
          WHEN influencer_moq_enabled THEN 'Admin disabled influencer MOQ privilege'
          ELSE COALESCE(influencer_disable_reason, 'Admin assigned influencer profile, MOQ privilege not enabled')
        END,
        influencer_last_evaluated_at = now(),
        influencer_last_paid_orders_30d = public.get_paid_orders_last_30d(p_user_id),
        updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.evaluate_influencer_compliance(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_influencer_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_can_manage boolean := false;
BEGIN
  v_can_manage := (auth.role() = 'service_role') OR public.is_admin();

  IF TG_OP = 'INSERT' THEN
    IF NOT v_can_manage AND (
      NEW.is_influencer IS DISTINCT FROM false
      OR NEW.influencer_moq_enabled IS DISTINCT FROM false
      OR NEW.influencer_assigned_at IS NOT NULL
      OR NEW.influencer_assigned_by IS NOT NULL
      OR NEW.influencer_disabled_at IS NOT NULL
      OR NEW.influencer_disable_reason IS NOT NULL
      OR NEW.influencer_last_paid_orders_30d IS DISTINCT FROM 0
      OR NEW.influencer_last_evaluated_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Only admins can set influencer profile fields';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT v_can_manage AND (
      NEW.is_influencer IS DISTINCT FROM OLD.is_influencer
      OR NEW.influencer_moq_enabled IS DISTINCT FROM OLD.influencer_moq_enabled
      OR NEW.influencer_assigned_at IS DISTINCT FROM OLD.influencer_assigned_at
      OR NEW.influencer_assigned_by IS DISTINCT FROM OLD.influencer_assigned_by
      OR NEW.influencer_disabled_at IS DISTINCT FROM OLD.influencer_disabled_at
      OR NEW.influencer_disable_reason IS DISTINCT FROM OLD.influencer_disable_reason
      OR NEW.influencer_last_paid_orders_30d IS DISTINCT FROM OLD.influencer_last_paid_orders_30d
      OR NEW.influencer_last_evaluated_at IS DISTINCT FROM OLD.influencer_last_evaluated_at
    ) THEN
      RAISE EXCEPTION 'Only admins can modify influencer profile fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_influencer_profile_fields_trigger ON public.profiles;
CREATE TRIGGER protect_influencer_profile_fields_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_influencer_profile_fields();

REVOKE ALL ON FUNCTION public.get_paid_orders_last_30d(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.evaluate_influencer_compliance(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_checkout_policy() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_influencer_profile(uuid, boolean, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.evaluate_influencer_compliance(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_checkout_policy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_influencer_profile(uuid, boolean, boolean) TO authenticated;
