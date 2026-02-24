import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Users, UserPlus, KeyRound, Loader2, Mail, AlertTriangle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  total_orders?: number;
  total_spent?: number;
  is_admin?: boolean;
  wallet_balance_real?: number;
  wallet_balance_promo?: number;
  membership_balance?: number;
  is_influencer?: boolean;
  influencer_moq_enabled?: boolean;
  influencer_last_paid_orders_30d?: number;
}

type BulkResetTarget = 'all' | 'before_date' | 'selected';

export function UsersManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Bulk reset state
  const [bulkResetOpen, setBulkResetOpen] = useState(false);
  const [bulkResetTarget, setBulkResetTarget] = useState<BulkResetTarget>('all');
  const [bulkResetBeforeDate, setBulkResetBeforeDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sendingBulkReset, setSendingBulkReset] = useState(false);
  const [bulkResetProgress, setBulkResetProgress] = useState({ sent: 0, total: 0 });
  const [updatingInfluencerUserId, setUpdatingInfluencerUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles for admin customer list:', profilesError);
        setLoadError('Failed to load customer profiles. Please try again.');
        setUsers([]);
        return;
      }

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, user_id, total_amount, status, payment_status, paystack_status');

      if (ordersError) {
        console.error('Error fetching orders for admin customer list:', ordersError);
      }

      const { data: userWallets, error: userWalletsError } = await supabase
        .from('user_wallets')
        .select('user_id, balance_real, balance_promo');

      if (userWalletsError) {
        console.error('Error fetching user wallets:', userWalletsError);
        // Don't throw, just log error and continue without wallet data
      }

      // 4. Fetch membership wallets
      const { data: membershipWallets, error: membershipWalletsError } = await supabase
        .from('membership_wallets')
        .select('user_id, balance');

      if (membershipWalletsError) {
        console.error('Error fetching membership wallets:', membershipWalletsError);
        // Don't throw
      }
      // Filter out admin users
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')

      const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);
      
      console.log('Fetched profiles:', profiles?.length);
      console.log('Fetched admin roles:', adminRoles?.length);
      console.log('Fetched orders for customers:', orders?.length);
      console.log('Fetched user wallets:', userWallets?.length);
      console.log('Fetched membership wallets:', membershipWallets?.length);
      
      const customers = profiles
        ?.map(profile => {
          const userOrders = orders?.filter(o => o.user_id === profile.id) || [];
          
          const validOrders = userOrders.filter(o => 
            o.status === 'delivered' || 
            o.payment_status === 'paid' || 
            o.paystack_status === 'success'
          );
          
          const totalSpent = validOrders.reduce((sum, order) => 
            sum + (Number(order.total_amount) || 0), 0
          );

          // Find wallets
          const userWallet = userWallets?.find(w => w.user_id === profile.id);
          const membershipWallet = membershipWallets?.find(w => w.user_id === profile.id);

          return {
            ...profile,
            total_orders: userOrders.length,
            total_spent: totalSpent,
            is_admin: adminIds.has(profile.id),
            wallet_balance_real: userWallet?.balance_real || 0,
            wallet_balance_promo: userWallet?.balance_promo || 0,
            membership_balance: membershipWallet?.balance || 0
          };
        }) || [];
      
      setUsers(customers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.phone?.toLowerCase().includes(query)
    );
  });

  const thisWeekCount = users.filter(u => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(u.created_at) > weekAgo;
  }).length;

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const getEmailsForBulkReset = (): string[] => {
    let targetUsers: Profile[] = [];

    switch (bulkResetTarget) {
      case 'all':
        targetUsers = users;
        break;
      case 'before_date':
        const beforeDate = new Date(bulkResetBeforeDate);
        targetUsers = users.filter(u => new Date(u.created_at) <= beforeDate);
        break;
      case 'selected':
        targetUsers = users.filter(u => selectedUserIds.has(u.id));
        break;
    }

    return targetUsers.map(u => u.email);
  };

  const handleBulkPasswordReset = async () => {
    const emails = getEmailsForBulkReset();
    
    if (emails.length === 0) {
      toast.error('No users selected for password reset');
      return;
    }

    setSendingBulkReset(true);
    setBulkResetProgress({ sent: 0, total: emails.length });

    try {
      // Get current admin user and their email
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      // Get admin's email from profile
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', adminUser?.id as string)
        .single();

      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          emails,
          adminId: adminUser?.id,
          adminEmail: adminProfile?.email,
          sendConfirmation: true
        }
      });

      if (error) throw error;

      if (data?.success) {
        const { sent, failed } = data.summary;
        setBulkResetProgress({ sent, total: emails.length });
        
        if (failed === 0) {
          toast.success(`Password reset emails sent to all ${sent} users`);
        } else {
          toast.warning(`Sent ${sent} emails, ${failed} failed`);
        }
        
        setBulkResetOpen(false);
        setSelectedUserIds(new Set());
      } else {
        throw new Error(data?.error || 'Failed to send emails');
      }
    } catch (error: any) {
      console.error('Error sending bulk password reset:', error);
      toast.error(error.message || 'Failed to send password reset emails');
    } finally {
      setSendingBulkReset(false);
    }
  };

  const updateInfluencerProfile = async (user: Profile, isInfluencer: boolean, enableMoq: boolean) => {
    setUpdatingInfluencerUserId(user.id);
    try {
      const wasInfluencer = !!user.is_influencer;
      const wasMoqEnabled = !!user.influencer_moq_enabled;

      const { data, error } = await supabase.rpc('admin_set_influencer_profile', {
        p_user_id: user.id,
        p_is_influencer: isInfluencer,
        p_enable_moq: enableMoq,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : null;
      const currentMoq = Number(result?.required_moq || 4);
      const paidOrders = Number(result?.paid_orders_last_30d || 0);

      toast.success(
        `Influencer updated: MOQ ${currentMoq}${isInfluencer ? ` • Paid orders (30d): ${paidOrders}` : ''}`
      );

      const dashboardLink = `${window.location.origin}/profile`;

      if (!wasInfluencer && isInfluencer && user.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: user.email,
            templateId: 'INFLUENCER_PROMOTION',
            data: {
              name: user.full_name || user.email,
              email: user.email,
              required_moq: String(currentMoq),
              paid_orders_30d: String(paidOrders),
              dashboard_link: dashboardLink,
              current_year: String(new Date().getFullYear()),
            },
          },
        });
      }

      if (isInfluencer && enableMoq && !wasMoqEnabled && user.email) {
        await supabase.functions.invoke('send-email', {
          body: {
            to: user.email,
            templateId: 'INFLUENCER_MOQ_SUCCESS',
            data: {
              name: user.full_name || user.email,
              email: user.email,
              required_moq: String(currentMoq),
              paid_orders_30d: String(paidOrders),
              dashboard_link: dashboardLink,
              current_year: String(new Date().getFullYear()),
            },
          },
        });
      }

      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating influencer profile:', error);
      toast.error(error.message || 'Failed to update influencer profile');
    } finally {
      setUpdatingInfluencerUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Customer Management</h1>
          <p className="text-muted-foreground">View and manage all registered customers</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        
        <Skeleton className="h-96" />
      </div>
    );
  }

  const targetEmailCount = getEmailsForBulkReset().length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Customer Management</h1>
        <p className="text-muted-foreground">View and manage all registered customers</p>
      </div>

      {loadError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{loadError}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered users on the platform
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Customers in the last 7 days
            </p>
          </CardContent>
        </Card>

        {/* Bulk Password Reset Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Password Reset</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Dialog open={bulkResetOpen} onOpenChange={setBulkResetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Bulk Reset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Bulk Password Reset</DialogTitle>
                  <DialogDescription>
                    Send password reset emails to multiple users. This is useful for fixing broken reset links.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <RadioGroup value={bulkResetTarget} onValueChange={(v) => setBulkResetTarget(v as BulkResetTarget)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all">All users ({users.length})</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="before_date" id="before_date" />
                      <Label htmlFor="before_date">Users registered before:</Label>
                    </div>
                    {bulkResetTarget === 'before_date' && (
                      <Input
                        type="date"
                        value={bulkResetBeforeDate}
                        onChange={(e) => setBulkResetBeforeDate(e.target.value)}
                        className="ml-6 w-auto"
                      />
                    )}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="selected" id="selected" />
                      <Label htmlFor="selected">Selected users only ({selectedUserIds.size})</Label>
                    </div>
                  </RadioGroup>

                  {bulkResetTarget === 'selected' && selectedUserIds.size === 0 && (
                    <p className="text-sm text-muted-foreground ml-6">
                      Select users from the table below first
                    </p>
                  )}

                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      This will send {targetEmailCount} email(s). Processing may take {Math.ceil(targetEmailCount * 1.5)} seconds due to rate limiting.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setBulkResetOpen(false)} disabled={sendingBulkReset}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBulkPasswordReset} 
                    disabled={sendingBulkReset || targetEmailCount === 0}
                  >
                    {sendingBulkReset ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending ({bulkResetProgress.sent}/{bulkResetProgress.total})
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send {targetEmailCount} Email{targetEmailCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <p className="text-xs text-muted-foreground mt-2">
              Fix broken password reset links
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            Search and view customer profiles. 
            {bulkResetTarget === 'selected' && (
              <span className="ml-1 text-primary">Click rows to select users for bulk reset.</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                list="user-suggestions"
              />
              <datalist id="user-suggestions">
                {filteredUsers.slice(0, 5).map((user) => (
                  <option key={user.id} value={user.email} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {bulkResetTarget === 'selected' && (
                    <TableHead className="w-12">Select</TableHead>
                  )}
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Wallet Balances</TableHead>
                  <TableHead>Registration Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={bulkResetTarget === 'selected' ? 9 : 8} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No customers found matching your search' : 'No customers yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selectedUserIds.has(user.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => {
                        if (bulkResetTarget === 'selected') {
                          toggleUserSelection(user.id);
                        } else {
                          navigate(`/admin/users/${user.id}`);
                        }
                      }}
                    >
                      {bulkResetTarget === 'selected' && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{user.full_name || 'No name provided'}</span>
                          {user.is_admin && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full w-fit mt-1">
                              Admin
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || 'N/A'}</TableCell>
                      <TableCell>{user.total_orders || 0}</TableCell>
                      <TableCell>₦{(user.total_spent || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs">
                            {user.is_influencer ? (user.influencer_moq_enabled ? 'Active MOQ 1' : 'Assigned (MOQ off)') : 'Not assigned'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Paid 30d: {user.influencer_last_paid_orders_30d || 0}
                          </span>
                          <div className="flex gap-1">
                            {user.is_influencer ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={updatingInfluencerUserId === user.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateInfluencerProfile(user, false, false);
                                  }}
                                >
                                  Remove
                                </Button>
                                <Button
                                  size="sm"
                                  variant={user.influencer_moq_enabled ? 'secondary' : 'default'}
                                  disabled={updatingInfluencerUserId === user.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateInfluencerProfile(user, true, !user.influencer_moq_enabled);
                                  }}
                                >
                                  {user.influencer_moq_enabled ? 'Disable MOQ1' : 'Enable MOQ1'}
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={updatingInfluencerUserId === user.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateInfluencerProfile(user, true, false);
                                }}
                              >
                                Assign
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1 text-xs">
                          <div className="flex justify-between w-32">
                            <span className="text-muted-foreground">Main:</span>
                            <span className="font-medium">₦{(user.wallet_balance_real || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between w-32">
                            <span className="text-muted-foreground">Promo:</span>
                            <span className="font-medium">₦{(user.wallet_balance_promo || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between w-32">
                            <span className="text-muted-foreground">Membership:</span>
                            <span className="font-medium">₦{(user.membership_balance || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No customers found matching your search' : 'No customers yet'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className={`cursor-pointer hover:bg-muted/50 ${selectedUserIds.has(user.id) ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => {
                    if (bulkResetTarget === 'selected') {
                      toggleUserSelection(user.id);
                    } else {
                      navigate(`/admin/users/${user.id}`);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                          <div className="font-medium mb-1">
                            {user.full_name || 'No name provided'}
                            {user.is_admin && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                Admin
                              </span>
                            )}
                            {user.is_influencer && (
                              <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">
                                {user.influencer_moq_enabled ? 'Influencer MOQ1' : 'Influencer'}
                              </span>
                            )}
                          </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>{user.email}</div>
                          {user.phone && <div>{user.phone}</div>}
                          <div className="font-medium text-foreground">
                            {user.total_orders || 0} Orders • ₦{(user.total_spent || 0).toLocaleString()} Spent
                          </div>
                          <div className="text-xs space-y-0.5 mt-1 bg-muted p-2 rounded">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Influencer:</span>
                              <span className="font-medium">
                                {user.is_influencer ? (user.influencer_moq_enabled ? 'MOQ1 Active' : 'Assigned') : 'No'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Paid (30d):</span>
                              <span className="font-medium">{user.influencer_last_paid_orders_30d || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Main Wallet:</span>
                              <span className="font-medium">₦{(user.wallet_balance_real || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Promo Wallet:</span>
                              <span className="font-medium">₦{(user.wallet_balance_promo || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Membership:</span>
                              <span className="font-medium">₦{(user.membership_balance || 0).toLocaleString()}</span>
                            </div>
                          </div>
                          <div>{format(new Date(user.created_at), 'MMM d, yyyy')}</div>
                        </div>
                      </div>
                      {bulkResetTarget === 'selected' && (
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
