import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Wallet, Copy, TrendingUp, ArrowDownRight, ArrowUpRight, Loader2, Gift, Link as LinkIcon, Users, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const withdrawalSchema = z.object({
  amount: z.number().min(5000, 'Minimum withdrawal is ₦5,000'),
  bank_name: z.string().min(2, 'Bank name is required'),
  account_number: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
  account_name: z.string().min(2, 'Account name is required'),
});

type WithdrawalForm = z.infer<typeof withdrawalSchema>;

interface WalletData {
  id: string;
  balance_real: number;
  balance_promo: number;
  total_earned: number;
  total_withdrawn: number;
  pending_withdrawal: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  is_promo: boolean;
  description: string;
  created_at: string;
}

interface AffiliateLink {
  id: string;
  code: string;
  clicks: number;
  signups: number;
  conversions: number;
  total_revenue: number;
}

export default function WalletProfile() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [affiliateLink, setAffiliateLink] = useState<AffiliateLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);

  const form = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 5000,
      bank_name: '',
      account_number: '',
      account_name: '',
    },
  });

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user]);

  const loadWalletData = async () => {
    if (!user) return;
    setLoading(true);

    // Load wallet
    const { data: walletData } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletData) {
      setWallet(walletData);

      // Load transactions
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txData) setTransactions(txData);
    }

    // Load affiliate link
    const { data: linkData } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (linkData) setAffiliateLink(linkData);

    setLoading(false);
  };

  const createAffiliateLink = async () => {
    if (!user) return;
    setCreatingLink(true);

    // Generate unique code
    const { data: code } = await supabase.rpc('generate_affiliate_code', { p_user_id: user.id });

    if (code) {
      const { data: newLink, error } = await supabase
        .from('affiliate_links')
        .insert({ user_id: user.id, code })
        .select()
        .single();

      if (error) {
        toast.error('Failed to create affiliate link');
      } else {
        setAffiliateLink(newLink);
        toast.success('Affiliate link created!');
      }
    }

    setCreatingLink(false);
  };

  const copyAffiliateLink = () => {
    if (!affiliateLink) return;
    const url = `${window.location.origin}/?ref=${affiliateLink.code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleWithdraw = async (data: WithdrawalForm) => {
    if (!user || !wallet) return;

    if (data.amount > wallet.balance_real - wallet.pending_withdrawal) {
      toast.error('Insufficient available balance');
      return;
    }

    // Create withdrawal request
    const { error: withdrawError } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        amount: data.amount,
        bank_name: data.bank_name,
        account_number: data.account_number,
        account_name: data.account_name,
      });

    if (withdrawError) {
      toast.error('Failed to submit withdrawal request');
      return;
    }

    // Update pending withdrawal in wallet
    await supabase
      .from('user_wallets')
      .update({
        balance_real: wallet.balance_real - data.amount,
        pending_withdrawal: wallet.pending_withdrawal + data.amount,
      })
      .eq('id', wallet.id);

    toast.success('Withdrawal request submitted!');
    setWithdrawDialogOpen(false);
    form.reset();
    loadWalletData();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'affiliate_commission':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'referral_signup':
        return <Gift className="h-4 w-4 text-primary" />;
      case 'withdrawal_completed':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case 'promo_credit':
        return <Gift className="h-4 w-4 text-blue-500" />;
      default:
        return <ArrowUpRight className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          My Wallet
        </h2>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Available Balance</CardDescription>
            <CardTitle className="text-2xl text-primary">
              ₦{((wallet?.balance_real || 0) - (wallet?.pending_withdrawal || 0)).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!wallet || wallet.balance_real - wallet.pending_withdrawal < 5000}>
                  Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Withdrawal</DialogTitle>
                  <DialogDescription>
                    Enter your bank details to withdraw funds. Minimum ₦5,000.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleWithdraw)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₦)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. GTBank" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="account_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="0123456789" maxLength={10} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="account_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Promo Balance</CardDescription>
            <CardTitle className="text-2xl text-secondary">
              ₦{(wallet?.balance_promo || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Use on your next purchase</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Earned</CardDescription>
            <CardTitle className="text-2xl">
              ₦{(wallet?.total_earned || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Withdrawn: ₦{(wallet?.total_withdrawn || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {wallet?.pending_withdrawal > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Pending withdrawal: ₦{wallet.pending_withdrawal.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Affiliate Link Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          My Referral Link
        </h3>

        {affiliateLink ? (
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Input 
                  value={`${window.location.origin}/?ref=${affiliateLink.code}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyAffiliateLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{affiliateLink.clicks}</p>
                  <p className="text-xs text-muted-foreground">Link Clicks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{affiliateLink.signups}</p>
                  <p className="text-xs text-muted-foreground">Sign Ups</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{affiliateLink.conversions}</p>
                  <p className="text-xs text-muted-foreground">Purchases</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">₦{affiliateLink.total_revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-4 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Start earning by sharing your referral link with friends!
              </p>
              <Button onClick={createAffiliateLink} disabled={creatingLink}>
                {creatingLink ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate My Link
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      {/* Transaction History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Transaction History
        </h3>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="pt-4 text-center text-muted-foreground">
              No transactions yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <Card key={tx.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(tx.type)}
                    <div>
                      <p className="text-sm font-medium">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                    </p>
                    {tx.is_promo && <Badge variant="secondary" className="text-xs">Promo</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
