import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ShoppingCart,
  RefreshCw,
  CreditCard,
  CheckCircle2
} from 'lucide-react';

interface MembershipTransaction {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export default function MembershipWalletProfile() {
  const { user } = useAuth();
  const { isMember, balance, requiredAmount, amountNeeded, isEnabled, isLoading, refetch } = useMembership();
  const [transactions, setTransactions] = useState<MembershipTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('membership_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setTransactions(data);
    }
    setLoadingTransactions(false);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'purchase':
        return <ShoppingCart className="h-4 w-4 text-orange-500" />;
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'refund':
        return 'text-green-600';
      case 'purchase':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (!isEnabled) {
    return (
      <div className="p-4 md:p-6 text-center">
        <Wallet className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Membership Not Available</h2>
        <p className="text-muted-foreground">
          The membership system is currently disabled.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">Membership Wallet</h2>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
              {isLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  ₦{balance.toLocaleString()}
                </p>
              )}
            </div>
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Membership Status */}
          <div className="mt-4 pt-4 border-t border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isMember ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-600">Active Member</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 text-orange-500" />
                    <span className="font-medium text-orange-600">
                      ₦{amountNeeded.toLocaleString()} needed for membership
                    </span>
                  </>
                )}
              </div>
              <Badge variant={isMember ? 'default' : 'secondary'}>
                Min: ₦{requiredAmount.toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button asChild className="h-auto py-4" variant={isMember ? 'outline' : 'default'}>
          <Link to="/membership/topup">
            <div className="flex flex-col items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              <span>Top Up</span>
            </div>
          </Link>
        </Button>
        <Button asChild className="h-auto py-4" variant="outline" disabled={!isMember}>
          <Link to="/products">
            <div className="flex flex-col items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Shop Now</span>
            </div>
          </Link>
        </Button>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTransactions ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
              <Button asChild className="mt-4" size="sm">
                <Link to="/membership/topup">Make Your First Deposit</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      {getTransactionIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description || tx.reference_id?.slice(0, 12) || 'No description'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getTransactionColor(tx.type)}`}>
                      {tx.amount > 0 ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bal: ₦{tx.balance_after.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
