import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Wallet, CreditCard, Check, ArrowRight } from 'lucide-react';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function MembershipTopUp() {
  const { user, loading: authLoading } = useAuth();
  const { balance, requiredAmount, amountNeeded, isMember, refetch } = useMembership();
  const navigate = useNavigate();
  
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [paystackLoaded, setPaystackLoaded] = useState(false);

  // Set default deposit amount to amount needed
  useEffect(() => {
    if (amountNeeded > 0) {
      setDepositAmount(amountNeeded);
    } else if (requiredAmount > 0) {
      setDepositAmount(requiredAmount);
    }
  }, [amountNeeded, requiredAmount]);

  // Load Paystack script
  useEffect(() => {
    if (window.PaystackPop) {
      setPaystackLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setPaystackLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/membership/topup');
    }
  }, [user, authLoading, navigate]);

  const handleDeposit = async () => {
    if (!user || !paystackLoaded) return;
    if (depositAmount < 1000) {
      toast.error('Minimum deposit is ₦1,000');
      return;
    }

    setProcessing(true);

    try {
      // Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      const email = profile?.email || user.email;
      if (!email) {
        toast.error('Email not found');
        setProcessing(false);
        return;
      }

      // Get Paystack public key from app_config
      const { data: paystackConfig } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'paystack_public_key')
        .single();

      const configValue = paystackConfig?.value as { key?: string } | null;
      const publicKey = configValue?.key || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      
      if (!publicKey) {
        toast.error('Payment configuration error');
        setProcessing(false);
        return;
      }

      const reference = `MBRSHIP_DEP_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: depositAmount * 100, // Convert to kobo
        currency: 'NGN',
        ref: reference,
        metadata: {
          type: 'membership_deposit',
          user_id: user.id,
          custom_fields: [
            {
              display_name: 'Payment Type',
              variable_name: 'payment_type',
              value: 'Membership Wallet Deposit',
            },
          ],
        },
        callback: function (response: any) {
          console.log('Payment successful:', response);
          toast.success('Deposit successful! Your wallet has been credited.');
          refetch();
          // Navigate to products after short delay
          setTimeout(() => {
            navigate('/products');
          }, 2000);
        },
        onClose: function () {
          setProcessing(false);
          toast.info('Payment window closed');
        },
      });

      handler.openIframe();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Payment initialization failed');
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const suggestedAmounts = [50000, 100000, 200000, 500000];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Membership Wallet</h1>
          <p className="text-muted-foreground">
            Top up your wallet to access exclusive wholesale prices
          </p>
        </div>

        {/* Current Balance Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold">₦{balance.toLocaleString()}</p>
                </div>
              </div>
              {isMember && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Active Member</span>
                </div>
              )}
            </div>

            {!isMember && amountNeeded > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Deposit at least <strong>₦{amountNeeded.toLocaleString()}</strong> more to unlock shop access
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Up Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Top Up Wallet
            </CardTitle>
            <CardDescription>
              Enter the amount you want to deposit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Amount Buttons */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Quick Select</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {suggestedAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={depositAmount === amount ? "default" : "outline"}
                    onClick={() => setDepositAmount(amount)}
                    className="w-full"
                  >
                    ₦{amount.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <Label htmlFor="amount">Or enter custom amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input
                  id="amount"
                  type="number"
                  min={1000}
                  step={1000}
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="pl-8"
                  placeholder="Enter amount"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum deposit: ₦1,000</p>
            </div>

            {/* Deposit Button */}
            <Button 
              onClick={handleDeposit}
              disabled={processing || !paystackLoaded || depositAmount < 1000}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Deposit ₦{depositAmount.toLocaleString()}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Payments are processed securely via Paystack. Your wallet balance can be used for all purchases.
            </p>
          </CardContent>
        </Card>

        {/* Already a member - show shop link */}
        {isMember && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => navigate('/products')}>
              Browse Shop <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
