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
}

type BulkResetTarget = 'all' | 'before_date' | 'selected';

export function UsersManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bulk reset state
  const [bulkResetOpen, setBulkResetOpen] = useState(false);
  const [bulkResetTarget, setBulkResetTarget] = useState<BulkResetTarget>('all');
  const [bulkResetBeforeDate, setBulkResetBeforeDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [sendingBulkReset, setSendingBulkReset] = useState(false);
  const [bulkResetProgress, setBulkResetProgress] = useState({ sent: 0, total: 0 });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles excluding admins
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out admin users
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);
      const customers = profiles?.filter(p => !adminIds.has(p.id)) || [];
      
      setUsers(customers);
    } catch (error) {
      console.error('Error fetching users:', error);
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
        .eq('id', adminUser?.id)
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
                  <TableHead>Registration Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={bulkResetTarget === 'selected' ? 5 : 4} className="text-center py-8 text-muted-foreground">
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
                        {user.full_name || 'No name provided'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || 'N/A'}</TableCell>
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
                        <div className="font-medium mb-1">{user.full_name || 'No name provided'}</div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>{user.email}</div>
                          {user.phone && <div>{user.phone}</div>}
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
