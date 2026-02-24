import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MIN_ORDER_UNITS } from '@/utils/constants';

export interface CheckoutPolicy {
  required_moq: number;
  is_influencer: boolean;
  influencer_moq_enabled: boolean;
  paid_orders_last_30d: number;
}

const defaultPolicy: CheckoutPolicy = {
  required_moq: MIN_ORDER_UNITS,
  is_influencer: false,
  influencer_moq_enabled: false,
  paid_orders_last_30d: 0,
};

export function useCheckoutPolicy() {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<CheckoutPolicy>(defaultPolicy);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fetchPolicy = async () => {
      if (!user) {
        setPolicy(defaultPolicy);
        setReady(true);
        return;
      }

      setLoading(true);
      setReady(false);
      try {
        const { data, error } = await supabase.rpc('get_user_checkout_policy');

        if (error) {
          console.error('Failed to fetch checkout policy:', error);
          setPolicy(defaultPolicy);
          return;
        }

        const row = Array.isArray(data) ? data[0] : null;
        if (!row) {
          setPolicy(defaultPolicy);
          return;
        }

        setPolicy({
          required_moq: Number(row.required_moq) || MIN_ORDER_UNITS,
          is_influencer: Boolean(row.is_influencer),
          influencer_moq_enabled: Boolean(row.influencer_moq_enabled),
          paid_orders_last_30d: Number(row.paid_orders_last_30d) || 0,
        });
      } catch (err) {
        console.error('Unexpected checkout policy error:', err);
        setPolicy(defaultPolicy);
      } finally {
        setLoading(false);
        setReady(true);
      }
    };

    fetchPolicy();
  }, [user]);

  return { policy, loading, ready };
}
