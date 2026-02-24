-- Full teardown of retired AI agent stack.
-- Keeps only external provider secrets in project env; removes all runtime DB objects.

-- 1) Drop agent-specific RPC/functions
DROP FUNCTION IF EXISTS public.has_active_agent_subscription(uuid);
DROP FUNCTION IF EXISTS public.admin_grant_trial_to_all(integer);

-- 2) Drop agent policies first (if present)
DO $$
BEGIN
  IF to_regclass('public.agent_plans') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Agent plans are viewable by everyone" ON public.agent_plans';
    EXECUTE 'DROP POLICY IF EXISTS "Agent plans are manageable by admins" ON public.agent_plans';
  END IF;

  IF to_regclass('public.user_agent_subscriptions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_agent_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_agent_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_agent_subscriptions';
  END IF;

  IF to_regclass('public.consultant_sessions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own sessions" ON public.consultant_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create their own sessions" ON public.consultant_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update their own sessions" ON public.consultant_sessions';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.consultant_sessions';
    EXECUTE 'DROP POLICY IF EXISTS consultant_sessions_select_self ON public.consultant_sessions';
    EXECUTE 'DROP POLICY IF EXISTS consultant_sessions_insert_self ON public.consultant_sessions';
  END IF;

  IF to_regclass('public.consultant_messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view messages in their sessions" ON public.consultant_messages';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert messages in their sessions" ON public.consultant_messages';
    EXECUTE 'DROP POLICY IF EXISTS consultant_messages_select_self ON public.consultant_messages';
    EXECUTE 'DROP POLICY IF EXISTS consultant_messages_insert_self ON public.consultant_messages';
  END IF;

  IF to_regclass('public.consultant_engagements') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS consultant_engagements_insert_self ON public.consultant_engagements';
    EXECUTE 'DROP POLICY IF EXISTS consultant_engagements_select_self_or_admin ON public.consultant_engagements';
  END IF;

  IF to_regclass('public.consultant_ab_assignments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS consultant_ab_assignments_upsert_self ON public.consultant_ab_assignments';
    EXECUTE 'DROP POLICY IF EXISTS consultant_ab_assignments_select_admin ON public.consultant_ab_assignments';
  END IF;
END $$;

-- 3) Remove storage policies and bucket metadata for retired chat attachments
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'chat-attachments';

-- Note: If storage objects already exist in this bucket, remove them first from storage.objects,
-- then rerun this migration (or run a pre-deploy cleanup script with service role credentials).

-- 4) Drop retired agent tables
DROP TABLE IF EXISTS public.consultant_ab_assignments;
DROP TABLE IF EXISTS public.consultant_engagements;
DROP TABLE IF EXISTS public.consultant_messages;
DROP TABLE IF EXISTS public.consultant_sessions;
DROP TABLE IF EXISTS public.user_agent_subscriptions;
DROP TABLE IF EXISTS public.agent_plans;
