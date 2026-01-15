import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MembershipStatus {
  isMember: boolean;
  balance: number;
  requiredAmount: number;
  amountNeeded: number;
  isEnabled: boolean;
  isLoading: boolean;
  refetch: () => void;
}

export function useMembership(): MembershipStatus {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if membership mode is enabled
  const { data: membershipEnabled } = useQuery({
    queryKey: ['membership-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'membership_enabled')
        .single();
      
      if (error) return false;
      const value = data?.value as { enabled?: boolean } | null;
      return value?.enabled === true;
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Check membership status for logged-in user
  const { data: membershipData, isLoading, refetch } = useQuery({
    queryKey: ['membership-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .rpc('check_membership_status', { p_user_id: user.id });
      
      if (error) {
        console.error('Error checking membership status:', error);
        return null;
      }
      
      return data?.[0] || null;
    },
    enabled: !!user && membershipEnabled === true,
    staleTime: 30000, // Cache for 30 seconds
  });

  const balance = membershipData?.balance ?? 0;
  const requiredAmount = membershipData?.required_amount ?? 50000;
  const isMember = membershipData?.is_member ?? false;
  const amountNeeded = Math.max(0, requiredAmount - balance);

  return {
    isMember,
    balance,
    requiredAmount,
    amountNeeded,
    isEnabled: membershipEnabled === true,
    isLoading,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-status'] });
      refetch();
    },
  };
}
