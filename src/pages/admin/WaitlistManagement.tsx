import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, ExternalLink, Users, Gift, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
  social_handle: string | null;
  is_social_verified: boolean;
  reward_credited: boolean;
  verified_at: string | null;
  created_at: string;
}

interface PreLaunchSettings {
  id: string;
  is_prelaunch_mode: boolean;
  waitlist_reward_amount: number;
  launch_date: string | null;
}

export default function WaitlistManagement() {
  const [list, setList] = useState<WaitlistEntry[]>([]);
  const [settings, setSettings] = useState<PreLaunchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('100000');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch waitlist entries
    const { data: waitlistData, error: waitlistError } = await supabase
      .from('waiting_list')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (waitlistError) {
      console.error('Error fetching waitlist:', waitlistError);
      toast.error('Failed to load waitlist');
    } else {
      setList(waitlistData || []);
    }
    
    // Fetch settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('pre_launch_settings')
      .select('*')
      .maybeSingle();
    
    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
    } else if (settingsData) {
      setSettings(settingsData);
      setRewardAmount(settingsData.waitlist_reward_amount?.toString() || '100000');
    }
    
    setLoading(false);
  };

  const verifyUser = async (entryId: string) => {
    setVerifyingId(entryId);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-waitlist-social', {
        body: { entryId }
      });

      if (error) {
        console.error('Verification error:', error);
        toast.error('Verification failed: ' + error.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || 'Social handle verified and reward credited!');
        fetchData();
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('Verification failed');
    }
    
    setVerifyingId(null);
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSavingSettings(true);
    
    const { error } = await supabase
      .from('pre_launch_settings')
      .update({ waitlist_reward_amount: parseFloat(rewardAmount) || 100000 })
      .eq('id', settings.id);
    
    if (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } else {
      toast.success('Reward amount updated');
      fetchData();
    }
    
    setSavingSettings(false);
  };

  const getSocialLink = (handle: string | null) => {
    if (!handle) return null;
    const cleanHandle = handle.replace('@', '').trim();
    return `https://instagram.com/${cleanHandle}`;
  };

  const stats = {
    total: list.length,
    verified: list.filter(e => e.is_social_verified).length,
    pending: list.filter(e => !e.is_social_verified && e.social_handle).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">Waitlist Management</h1>
        <p className="text-muted-foreground mt-1">Verify social handles and credit launch rewards</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified & Credited</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.verified}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verification</CardTitle>
            <Gift className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reward Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Reward Settings
          </CardTitle>
          <CardDescription>Configure the reward amount for verified waitlist signups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="rewardAmount">Reward Amount (₦)</Label>
              <Input
                id="rewardAmount"
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                placeholder="100000"
                className="bg-background/50"
              />
            </div>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Waitlist Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Waitlist Entries</CardTitle>
          <CardDescription>Click verify to check the social handle and credit the reward</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>User</TableHead>
                  <TableHead>Social Handle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No waitlist entries yet
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{entry.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{entry.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.social_handle ? (
                          <a
                            href={getSocialLink(entry.social_handle) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            {entry.social_handle}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Not provided</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={entry.is_social_verified ? "default" : "secondary"}
                          className={entry.is_social_verified ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                        >
                          {entry.is_social_verified ? "Verified & Credited" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {!entry.is_social_verified && entry.social_handle && (
                          <Button 
                            size="sm" 
                            onClick={() => verifyUser(entry.id)}
                            disabled={verifyingId === entry.id}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {verifyingId === entry.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Verify & Reward
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
