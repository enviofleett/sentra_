import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag, DollarSign, KeyRound, Loader2, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  default_shipping_address: any;
  default_billing_address: any;
  wallet_balance_real?: number;
  wallet_balance_promo?: number;
  membership_balance?: number;
}

type Order = Pick<
  Tables<'orders'>,
  'id' | 'created_at' | 'total_amount' | 'status' | 'payment_status' | 'paystack_status' | 'items' | 'promo_discount_applied'
>;

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);

  // Credit Wallet State
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditType, setCreditType] = useState<'real' | 'promo'>('real');
  const [creditReason, setCreditReason] = useState('');
  const [crediting, setCrediting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userId = id as string;
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch wallet balances
      const { data: userWallet } = await supabase
        .from('user_wallets')
        .select('balance_real, balance_promo')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: membershipWallet } = await supabase
        .from('membership_wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      setProfile({
        ...profileData,
        wallet_balance_real: userWallet?.balance_real || 0,
        wallet_balance_promo: userWallet?.balance_promo || 0,
        membership_balance: membershipWallet?.balance || 0
      });

      // Fetch user orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status, payment_status, paystack_status, items, promo_discount_applied')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders((ordersData || []) as Order[]);
    } catch (error: unknown) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateSafe = (iso: string | null, pattern: string) => {
    if (!iso) return 'Unknown date';
    try {
      return format(new Date(iso), pattern);
    } catch {
      return 'Unknown date';
    }
  };

  const handleSendPasswordReset = async () => {
    if (!profile?.email) return;

    setSendingReset(true);
    try {
      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          emails: [profile.email],
          adminId: adminUser?.id
        }
      });

      if (error) throw error;

      if (data?.success && data?.results?.[0]?.success) {
        toast.success('Password reset email sent successfully');
      } else {
        const errorMsg = data?.results?.[0]?.error || 'Failed to send email';
        toast.error(`Failed to send: ${errorMsg}`);
      }
    } catch (error: unknown) {
      console.error('Error sending password reset:', error);
      const msg = error instanceof Error ? error.message : 'Failed to send password reset email';
      toast.error(msg);
    } finally {
      setSendingReset(false);
    }
  };

  const handleCreditWallet = async () => {
    if (!profile || !creditAmount || !creditReason) {
      toast.error('Please fill in all fields');
      return;
    }

    setCrediting(true);
    try {
      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      if (!adminUser) {
        throw new Error('Admin session expired. Please login again.');
      }

      const payload = {
        userId: profile.id,
        amount: parseFloat(creditAmount),
        type: creditType,
        description: creditReason,
        adminId: adminUser.id
      };

      console.log('Sending credit request:', payload);

      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData?.session?.access_token || null;
      const nowSec = Math.floor(Date.now() / 1000);
      const expiresAt = sessionData?.session?.expires_at || 0;
      if (!accessToken || expiresAt < nowSec + 30) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw new Error(refreshError.message || 'Failed to refresh session');
        }
        accessToken = refreshed.session?.access_token || null;
      }

      const { data, error } = await supabase.functions.invoke('admin-credit-wallet', {
        body: payload,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
      });

      if (error) {
        // If the error is a FunctionsHttpError, try to parse the response body if available
        let errorMessage = error.message || 'Failed to credit wallet';
        if (error instanceof Error && 'context' in error) {
             // @ts-ignore
             const context = error.context as any;
             if (context?.response?.json) {
                 try {
                     const errorBody = await context.response.json();
                     errorMessage = errorBody.error || errorMessage;
                 } catch (e) {
                     // ignore json parse error
                 }
             }
        }
        throw new Error(errorMessage);
      }

      if (data?.success) {
        toast.success('Wallet credited successfully');
        setCreditDialogOpen(false);
        setCreditAmount('');
        setCreditReason('');
        // Refresh data
        fetchUserData();
      } else {
        throw new Error(data?.error || 'Failed to credit wallet');
      }
    } catch (error: any) {
      console.error('Error crediting wallet:', error);
      toast.error(error.message || 'Failed to credit wallet');
    } finally {
      setCrediting(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'processing':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const totalSpent = orders
    .filter(o => o.status === 'delivered' || o.payment_status === 'paid' || o.paystack_status === 'success')
    .reduce((sum, order) => sum + Number(order.total_amount), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/users')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Users
      </Button>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {profile.full_name?.charAt(0)?.toUpperCase() || profile.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <CardTitle>{profile.full_name || 'No name provided'}</CardTitle>
                <CardDescription>
                  Registered {formatDateSafe(profile.created_at, 'MMM d, yyyy')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>

              {profile.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{profile.phone}</p>
                  </div>
                </div>
              )}

              {profile.default_shipping_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Default Shipping Address</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.default_shipping_address.street}
                      {profile.default_shipping_address.city && `, ${profile.default_shipping_address.city}`}
                      {profile.default_shipping_address.state && `, ${profile.default_shipping_address.state}`}
                      {profile.default_shipping_address.zipCode && ` ${profile.default_shipping_address.zipCode}`}
                    </p>
                  </div>
                </div>
              )}

              {profile.default_billing_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Default Billing Address</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.default_billing_address.street}
                      {profile.default_billing_address.city && `, ${profile.default_billing_address.city}`}
                      {profile.default_billing_address.state && `, ${profile.default_billing_address.state}`}
                      {profile.default_billing_address.zipCode && ` ${profile.default_billing_address.zipCode}`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="pt-4 border-t grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="text-sm">Total Orders</span>
                  </div>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Lifetime Value</span>
                  </div>
                  <p className="text-2xl font-bold">₦{totalSpent.toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-4 border-t grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Main Wallet</span>
                  <p className="font-semibold text-lg">₦{(profile.wallet_balance_real || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Promo Wallet</span>
                  <p className="font-semibold text-lg">₦{(profile.wallet_balance_promo || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Membership</span>
                  <p className="font-semibold text-lg">₦{(profile.membership_balance || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-4 border-t flex flex-col gap-2">
                <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Credit User Wallet
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Credit User Wallet</DialogTitle>
                      <DialogDescription>
                        Add funds to {profile.full_name}'s wallet. They will receive an email notification.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Wallet Type</Label>
                        <RadioGroup value={creditType} onValueChange={(v) => setCreditType(v as 'real' | 'promo')} className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="real" id="real" />
                            <Label htmlFor="real">Main Wallet (Real Money)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="promo" id="promo" />
                            <Label htmlFor="promo">Promo Wallet (Credits)</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>Amount (₦)</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Reason / Note</Label>
                        <Textarea 
                          placeholder="e.g. Refund for Order #123, Bonus credit, etc." 
                          value={creditReason}
                          onChange={(e) => setCreditReason(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">This note will be visible to the user in the email.</p>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreditWallet} disabled={crediting}>
                        {crediting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Credit Wallet
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={handleSendPasswordReset}
                  disabled={sendingReset}
                  className="w-full"
                >
                  {sendingReset ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Send Password Reset Email
                    </>
                  )}
                </Button>
              </div>
          </CardContent>
        </Card>

        {/* Order History Card */}
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <CardDescription>All orders placed by this customer</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders yet
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateSafe(order.created_at, 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status ?? 'pending')}>
                        {order.status}
                      </Badge>
                    </div>
                      <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {Array.isArray(order.items) ? order.items.length : 0} item(s)
                      </p>
                      <div className="text-right">
                        <p className="font-semibold">₦{Number(order.total_amount).toLocaleString()}</p>
                        {order.promo_discount_applied && order.promo_discount_applied > 0 && (
                          <p className="text-xs text-green-600">
                            -₦{order.promo_discount_applied.toLocaleString()} Promo
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Orders Table (Desktop) */}
      {orders.length > 0 && (
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle>Detailed Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{formatDateSafe(order.created_at, 'MMM d, yyyy')}</TableCell>
                      <TableCell>{Array.isArray(order.items) ? order.items.length : 0}</TableCell>
                      <TableCell className="font-semibold">
                        ₦{Number(order.total_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status ?? 'pending')}>
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
