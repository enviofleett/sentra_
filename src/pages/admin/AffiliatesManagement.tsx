import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Users, Wallet, TrendingUp, Award, DollarSign, ArrowDownCircle, Loader2, Check, X, Clock, AlertTriangle } from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

interface AffiliateStats {
  id: string;
  code: string;
  clicks: number;
  signups: number;
  conversions: number;
  total_revenue: number;
  is_active: boolean;
  profiles?: { full_name: string; email: string } | null;
}

interface ResellerRank {
  id: string;
  name: string;
  slug: string;
  min_monthly_volume: number;
  discount_percentage: number;
  description: string;
  badge_color: string;
  display_order: number;
  is_active: boolean;
}

export default function AffiliatesManagement() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateStats[]>([]);
  const [ranks, setRanks] = useState<ResellerRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingRank, setEditingRank] = useState<ResellerRank | null>(null);
  const [budgetValidation, setBudgetValidation] = useState<{
    maxGrowthBudget: number | null;
    isValidating: boolean;
    error: string | null;
  }>({ maxGrowthBudget: null, isValidating: false, error: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Load pending withdrawals
    const { data: withdrawalData } = await supabase
      .from('withdrawal_requests')
      .select('*, profiles:user_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (withdrawalData) setWithdrawals(withdrawalData as any);

    // Load affiliate stats
    const { data: affiliateData } = await supabase
      .from('affiliate_links')
      .select('*, profiles:user_id(full_name, email)')
      .order('total_revenue', { ascending: false });

    if (affiliateData) setAffiliates(affiliateData as any);

    // Load reseller ranks
    const { data: rankData } = await supabase
      .from('reseller_ranks')
      .select('*')
      .order('display_order');

    if (rankData) setRanks(rankData);

    setLoading(false);
  };

  const processWithdrawal = async (id: string, status: 'completed' | 'rejected', notes?: string) => {
    setProcessingId(id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.rpc('process_withdrawal', {
      p_withdrawal_id: id,
      p_status: status,
      p_admin_id: user.id,
      p_notes: notes || null,
    });

    if (error) {
      toast.error('Failed to process withdrawal');
    } else {
      toast.success(`Withdrawal ${status}`);
      loadData();
    }

    setProcessingId(null);
  };

  // Validate discount against budget limits
  const validateBudgetLimits = async (discountPercentage: number): Promise<{ valid: boolean; maxBudget: number | null; error: string | null }> => {
    setBudgetValidation({ maxGrowthBudget: null, isValidating: true, error: null });
    
    try {
      // Fetch a sample of active products to calculate average budget
      const { data: products } = await supabase
        .from('products')
        .select('id, price, cost_price')
        .eq('is_active', true)
        .not('cost_price', 'is', null)
        .limit(10);

      if (!products || products.length === 0) {
        setBudgetValidation({ maxGrowthBudget: null, isValidating: false, error: null });
        return { valid: true, maxBudget: null, error: null };
      }

      // Calculate budget limits for each product
      const budgetPromises = products.map(async (product) => {
        const { data } = await supabase.rpc('calculate_budget_limits', { p_product_id: product.id });
        return data?.[0];
      });

      const budgets = await Promise.all(budgetPromises);
      const validBudgets = budgets.filter(b => b && b.gross_profit > 0);
      
      if (validBudgets.length === 0) {
        setBudgetValidation({ maxGrowthBudget: null, isValidating: false, error: null });
        return { valid: true, maxBudget: null, error: null };
      }

      // Calculate average growth budget percentage across products
      const avgGrowthBudgetPct = validBudgets.reduce((sum, b) => {
        const pct = (b.growth_budget_amount / b.gross_profit) * 100;
        return sum + pct;
      }, 0) / validBudgets.length;

      const maxBudget = Math.round(avgGrowthBudgetPct * 100) / 100;

      if (discountPercentage > maxBudget) {
        const error = `Discount ${discountPercentage}% exceeds Growth Budget limit of ${maxBudget}%`;
        setBudgetValidation({ maxGrowthBudget: maxBudget, isValidating: false, error });
        return { valid: false, maxBudget, error };
      }

      setBudgetValidation({ maxGrowthBudget: maxBudget, isValidating: false, error: null });
      return { valid: true, maxBudget, error: null };
    } catch (err) {
      console.error('Budget validation error:', err);
      setBudgetValidation({ maxGrowthBudget: null, isValidating: false, error: null });
      return { valid: true, maxBudget: null, error: null }; // Allow save on error
    }
  };

  const updateRank = async (rank: ResellerRank) => {
    // Validate budget limits before saving
    const validation = await validateBudgetLimits(rank.discount_percentage);
    
    if (!validation.valid) {
      toast.error(validation.error || 'Discount exceeds budget limits');
      return;
    }

    const { error } = await supabase
      .from('reseller_ranks')
      .update({
        name: rank.name,
        min_monthly_volume: rank.min_monthly_volume,
        discount_percentage: rank.discount_percentage,
        description: rank.description,
        badge_color: rank.badge_color,
        is_active: rank.is_active,
      })
      .eq('id', rank.id);

    if (error) {
      toast.error('Failed to update rank');
    } else {
      toast.success('Rank updated');
      setEditingRank(null);
      setBudgetValidation({ maxGrowthBudget: null, isValidating: false, error: null });
      loadData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-500"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-500"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Calculate summary stats
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const totalPendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const totalAffiliateRevenue = affiliates.reduce((sum, a) => sum + a.total_revenue, 0);
  const totalConversions = affiliates.reduce((sum, a) => sum + a.conversions, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Affiliates & Resellers</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Active Affiliates
            </CardDescription>
            <CardTitle className="text-2xl">{affiliates.filter(a => a.is_active).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Total Conversions
            </CardDescription>
            <CardTitle className="text-2xl">{totalConversions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Revenue Generated
            </CardDescription>
            <CardTitle className="text-2xl text-primary">₦{totalAffiliateRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={pendingWithdrawals.length > 0 ? 'border-yellow-500/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" /> Pending Withdrawals
            </CardDescription>
            <CardTitle className="text-2xl">
              {pendingWithdrawals.length} (₦{totalPendingAmount.toLocaleString()})
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="withdrawals">
            Withdrawals {pendingWithdrawals.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingWithdrawals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="ranks">Reseller Ranks</TabsTrigger>
        </TabsList>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>Process pending withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{w.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{w.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">₦{w.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{w.bank_name}</p>
                          <p className="text-muted-foreground">{w.account_number}</p>
                          <p className="text-muted-foreground">{w.account_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(w.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(w.status)}</TableCell>
                      <TableCell>
                        {w.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => processWithdrawal(w.id, 'completed')}
                              disabled={processingId === w.id}
                            >
                              {processingId === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => processWithdrawal(w.id, 'rejected', 'Rejected by admin')}
                              disabled={processingId === w.id}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {w.admin_notes && (
                          <p className="text-xs text-muted-foreground mt-1">{w.admin_notes}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {withdrawals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No withdrawal requests
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates">
          <Card>
            <CardHeader>
              <CardTitle>Affiliate Performance</CardTitle>
              <CardDescription>Track affiliate link performance and earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-center">Clicks</TableHead>
                    <TableHead className="text-center">Signups</TableHead>
                    <TableHead className="text-center">Conversions</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{a.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{a.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{a.code}</TableCell>
                      <TableCell className="text-center">{a.clicks}</TableCell>
                      <TableCell className="text-center">{a.signups}</TableCell>
                      <TableCell className="text-center">{a.conversions}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        ₦{a.total_revenue.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.is_active ? 'default' : 'secondary'}>
                          {a.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {affiliates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No affiliates yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ranks Tab */}
        <TabsContent value="ranks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Reseller Ranks
              </CardTitle>
              <CardDescription>Configure volume-based discount tiers for resellers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Min Monthly Volume</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranks.map((rank) => (
                    <TableRow key={rank.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: rank.badge_color }}
                          />
                          <span className="font-medium">{rank.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>₦{rank.min_monthly_volume.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-primary">{rank.discount_percentage}%</TableCell>
                      <TableCell className="text-muted-foreground">{rank.description}</TableCell>
                      <TableCell>
                        <Badge variant={rank.is_active ? 'default' : 'secondary'}>
                          {rank.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingRank(rank)}>
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Rank: {rank.name}</DialogTitle>
                              <DialogDescription>Update rank settings and discount percentage</DialogDescription>
                            </DialogHeader>
                            {editingRank && editingRank.id === rank.id && (
                              <div className="space-y-4">
                                <div>
                                  <Label>Rank Name</Label>
                                  <Input
                                    value={editingRank.name}
                                    onChange={(e) => setEditingRank({ ...editingRank, name: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Min Monthly Volume (₦)</Label>
                                  <Input
                                    type="number"
                                    value={editingRank.min_monthly_volume}
                                    onChange={(e) => setEditingRank({ ...editingRank, min_monthly_volume: Number(e.target.value) })}
                                  />
                                </div>
                                <div>
                                  <Label>Discount Percentage</Label>
                                  <Input
                                    type="number"
                                    value={editingRank.discount_percentage}
                                    onChange={(e) => setEditingRank({ ...editingRank, discount_percentage: Number(e.target.value) })}
                                  />
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <Input
                                    value={editingRank.description}
                                    onChange={(e) => setEditingRank({ ...editingRank, description: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Badge Color</Label>
                                  <Input
                                    type="color"
                                    value={editingRank.badge_color}
                                    onChange={(e) => setEditingRank({ ...editingRank, badge_color: e.target.value })}
                                    className="h-10"
                                  />
                                </div>
                                
                                {/* Budget Validation Warning */}
                                {budgetValidation.error && (
                                  <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                      {budgetValidation.error}
                                    </AlertDescription>
                                  </Alert>
                                )}
                                
                                {budgetValidation.maxGrowthBudget !== null && !budgetValidation.error && (
                                  <p className="text-sm text-muted-foreground">
                                    Max allowed discount based on Growth Budget: <strong>{budgetValidation.maxGrowthBudget}%</strong>
                                  </p>
                                )}

                                <Button 
                                  onClick={() => updateRank(editingRank)} 
                                  className="w-full"
                                  disabled={budgetValidation.isValidating}
                                >
                                  {budgetValidation.isValidating ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Validating Budget...
                                    </>
                                  ) : (
                                    'Save Changes'
                                  )}
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
