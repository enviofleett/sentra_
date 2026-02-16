
-- 1. Ensure "Free Trial" plan exists
INSERT INTO public.agent_plans (name, description, price, duration_days, features, is_active)
SELECT 'Free Trial', 'Experience the AI Business Consultant risk-free.', 0, 7, '["Full AI Access", "Trial Period"]', false
WHERE NOT EXISTS (
    SELECT 1 FROM public.agent_plans WHERE name = 'Free Trial'
);

-- 2. Create RPC to grant trial to all existing users
CREATE OR REPLACE FUNCTION public.admin_grant_trial_to_all(p_days integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan_id uuid;
    v_count integer;
BEGIN
    -- Check admin permission
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Get Free Trial plan ID
    SELECT id INTO v_plan_id FROM public.agent_plans WHERE name = 'Free Trial' LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Free Trial plan not found';
    END IF;

    -- Insert subscriptions for users who don't have ANY subscription history
    WITH inserted AS (
        INSERT INTO public.user_agent_subscriptions (user_id, plan_id, starts_at, expires_at, is_active, payment_reference)
        SELECT 
            p.id,
            v_plan_id,
            NOW(),
            NOW() + (p_days || ' days')::interval,
            true,
            'ADMIN_TRIAL_GRANT'
        FROM public.profiles p
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_agent_subscriptions uas 
            WHERE uas.user_id = p.id
        )
        RETURNING user_id
    )
    SELECT count(*) INTO v_count FROM inserted;

    RETURN v_count;
END;
$$;

-- 3. Update handle_new_user trigger to check for trial config
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trial_config jsonb;
    v_trial_enabled boolean;
    v_trial_days integer;
    v_plan_id uuid;
BEGIN
    -- 1. Create Profile (Existing logic)
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );

    -- 2. Check for Trial Config in app_config
    SELECT value INTO v_trial_config 
    FROM public.app_config 
    WHERE key = 'agent_trial_config';

    IF v_trial_config IS NOT NULL THEN
        v_trial_enabled := (v_trial_config->>'enabled')::boolean;
        v_trial_days := (v_trial_config->>'days')::integer;

        IF v_trial_enabled = true AND v_trial_days > 0 THEN
            -- Fetch Free Trial Plan
            SELECT id INTO v_plan_id FROM public.agent_plans WHERE name = 'Free Trial' LIMIT 1;

            IF v_plan_id IS NOT NULL THEN
                INSERT INTO public.user_agent_subscriptions (
                    user_id, plan_id, starts_at, expires_at, is_active, payment_reference
                )
                VALUES (
                    NEW.id,
                    v_plan_id,
                    NOW(),
                    NOW() + (v_trial_days || ' days')::interval,
                    true,
                    'TRIAL_ON_SIGNUP'
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction (allow user creation to proceed)
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$;
