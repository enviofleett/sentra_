import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MembershipGuardProps {
  children: React.ReactNode;
}

export function MembershipGuard({ children }: MembershipGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isMember, isEnabled, isLoading: membershipLoading, balance, requiredAmount, amountNeeded } = useMembership();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check if user is admin (admins bypass membership requirement)
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc('is_admin');
      setIsAdmin(data === true);
    };
    checkAdmin();
  }, [user]);

  // Show loading state
  if (authLoading || membershipLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking membership status...</p>
        </div>
      </div>
    );
  }

  // If membership mode is disabled, allow access
  if (!isEnabled) {
    return <>{children}</>;
  }

  // Admins bypass membership requirement
  if (isAdmin) {
    return <>{children}</>;
  }

  // Not logged in - redirect to auth
  if (!user) {
    const redirectPath = encodeURIComponent(location.pathname);
    navigate(`/auth?redirect=${redirectPath}`, { replace: true });
    return null;
  }

  // User is a member - allow access
  if (isMember) {
    return <>{children}</>;
  }

  // User is not a member - show upgrade prompt
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-xl border shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Members Only</h1>
        <p className="text-muted-foreground mb-6">
          Access to our exclusive wholesale shop requires a minimum membership deposit.
        </p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Your Balance</span>
            <span className="font-semibold">₦{balance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Required Deposit</span>
            <span className="font-semibold">₦{requiredAmount.toLocaleString()}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Amount Needed</span>
              <span className="font-bold text-primary">₦{amountNeeded.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => navigate('/membership/topup')} 
          className="w-full"
          size="lg"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Top Up Now
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          Your deposit goes into your membership wallet and can be used for purchases.
        </p>
      </div>
    </div>
  );
}
