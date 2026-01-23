import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, ExternalLink, Users, Gift, Loader2, Settings, UserPlus, Download, Mail, Send, BarChart3, Eye, MousePointerClick, TestTube } from 'lucide-react';
import { toast } from 'sonner';

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
  social_handle: string | null;
  facebook_handle: string | null;
  tiktok_handle: string | null;
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

type RecipientFilter = 'all' | 'verified' | 'pending';

interface EmailCampaign {
  id: string;
  subject: string;
  recipient_filter: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
  sent_at: string | null;
}

export default function WaitlistManagement() {
  const [list, setList] = useState<WaitlistEntry[]>([]);
  const [settings, setSettings] = useState<PreLaunchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [verifyingAllPending, setVerifyingAllPending] = useState(false);
  const [rewardAmount, setRewardAmount] = useState('100000');
  
  // Bulk email state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  
  // Email analytics state
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

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
    
    // Fetch email campaigns
    const { data: campaignData, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (campaignError) {
      console.error('Error fetching campaigns:', campaignError);
    } else {
      setCampaigns(campaignData || []);
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
        toast.success(data.message || 'User created and wallet credited!');
        fetchData();
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('Verification failed');
    }
    
    setVerifyingId(null);
  };

  const migrateAllVerified = async () => {
    if (!confirm('This will create user accounts for all verified waitlist entries and credit their wallets. Continue?')) {
      return;
    }
    
    setMigrating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-waitlist-social', {
        body: { migrateAll: true }
      });

      if (error) {
        console.error('Migration error:', error);
        toast.error('Migration failed: ' + error.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || 'Migration complete!');
        if (data.errors && data.errors.length > 0) {
          console.warn('Migration errors:', data.errors);
          toast.warning(`${data.errors.length} entries had errors - check console`);
        }
        fetchData();
      }
    } catch (err) {
      console.error('Migration error:', err);
      toast.error('Migration failed');
    }
    
    setMigrating(false);
  };

  const verifyAndMigrateAllPending = async () => {
    const pendingCount = list.filter(e => !e.is_social_verified).length;
    if (pendingCount === 0) {
      toast.error('No pending entries to process');
      return;
    }
    
    if (!confirm(`This will verify ${pendingCount} pending waitlist entries, create user accounts, and credit ₦${parseInt(rewardAmount).toLocaleString()} to each wallet. Continue?`)) {
      return;
    }
    
    setVerifyingAllPending(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-waitlist-social', {
        body: { verifyAllPending: true }
      });

      if (error) {
        console.error('Verify all pending error:', error);
        toast.error('Failed: ' + error.message);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || 'All pending users verified and credited!');
        if (data.errors && data.errors.length > 0) {
          console.warn('Processing errors:', data.errors);
          toast.warning(`${data.errors.length} entries had errors - check console`);
        }
        fetchData();
      }
    } catch (err) {
      console.error('Verify all pending error:', err);
      toast.error('Failed to process pending entries');
    }
    
    setVerifyingAllPending(false);
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

  const exportToCSV = () => {
    if (list.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Name', 'Email', 'Instagram', 'Facebook', 'TikTok', 'Status', 'Joined Date', 'Verified Date'];
    const csvRows = [
      headers.join(','),
      ...list.map(entry => [
        `"${(entry.full_name || '').replace(/"/g, '""')}"`,
        `"${entry.email.replace(/"/g, '""')}"`,
        `"${(entry.social_handle || '').replace(/"/g, '""')}"`,
        `"${(entry.facebook_handle || '').replace(/"/g, '""')}"`,
        `"${(entry.tiktok_handle || '').replace(/"/g, '""')}"`,
        entry.is_social_verified ? 'Verified' : 'Pending',
        new Date(entry.created_at).toLocaleDateString(),
        entry.verified_at ? new Date(entry.verified_at).toLocaleDateString() : ''
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `waitlist-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${list.length} entries`);
  };

  const getRecipientCount = () => {
    if (recipientFilter === 'verified') return stats.verified;
    if (recipientFilter === 'pending') return stats.pending;
    return stats.total;
  };

  const handleSendTestEmail = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast.error('Please fill in subject and content first');
      return;
    }

    if (!testEmailAddress.trim()) {
      toast.error('Please enter a test email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmailAddress)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSendingTestEmail(true);

    try {
      console.log('Sending test email to:', testEmailAddress);
      const { data, error } = await supabase.functions.invoke('send-bulk-email', {
        body: {
          subject: emailSubject,
          htmlContent: emailContent,
          testEmail: testEmailAddress.trim()
        }
      });

      console.log('Test email response:', { data, error });

      if (error) {
        console.error('Test email error:', error);
        toast.error('Failed to send test email: ' + error.message);
      } else if (data?.success) {
        toast.success(`✅ Test email sent to ${testEmailAddress}! Check your inbox.`, {
          duration: 5000
        });
      } else {
        toast.error(data?.error || 'Failed to send test email');
      }
    } catch (err) {
      console.error('Test email error:', err);
      toast.error('Failed to send test email');
    }

    setSendingTestEmail(false);
  };

  const handleSendBulkEmail = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast.error('Please fill in subject and content');
      return;
    }

    const recipientCount = getRecipientCount();
    if (recipientCount === 0) {
      toast.error('No recipients match the selected filter');
      return;
    }

    if (!confirm(`This will send emails to ${recipientCount} waitlist users. Continue?`)) {
      return;
    }

    setSendingEmail(true);

    try {
      // First create a campaign record
      const { data: campaignData, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert({
          subject: emailSubject,
          recipient_filter: recipientFilter,
          total_recipients: recipientCount
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Campaign creation error:', campaignError);
        toast.error('Failed to create campaign record');
        setSendingEmail(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-bulk-email', {
        body: {
          subject: emailSubject,
          htmlContent: emailContent,
          recipientFilter,
          campaignId: campaignData.id
        }
      });

      if (error) {
        console.error('Bulk email error:', error);
        toast.error('Failed to send emails: ' + error.message);
      } else if (data?.success) {
        toast.success(`Sent ${data.sent} emails successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}`);
        setEmailDialogOpen(false);
        setEmailSubject('');
        setEmailContent('');
        setTestEmailAddress('');
        fetchData(); // Refresh campaigns list
      } else {
        toast.error(data?.error || 'Failed to send emails');
      }
    } catch (err) {
      console.error('Bulk email error:', err);
      toast.error('Failed to send emails');
    }

    setSendingEmail(false);
  };

  const loadEmailTemplate = (template: string) => {
    if (template === 'announcement') {
      setEmailSubject('Exciting News from Sentra! 🎉');
      setEmailContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: #d4af37; margin: 0; font-size: 28px; letter-spacing: 2px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #1a1a2e; margin-top: 0; }
    .content p { margin: 16px 0; color: #555; }
    .cta-button { display: inline-block; background: #d4af37; color: #1a1a2e; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 20px 30px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SENTRA</h1>
    </div>
    <div class="content">
      <h2>Hello {{name}},</h2>
      <p>We have some exciting news to share with you!</p>
      <p>Thank you for being part of our waitlist. We're working hard to bring you an exceptional fragrance experience.</p>
      <p>Stay tuned for more updates coming soon!</p>
      <a href="https://sentra.com" class="cta-button">Visit Sentra</a>
    </div>
    <div class="footer">
      <p>© 2025 Sentra. All rights reserved.</p>
      <p>You're receiving this because you signed up for our waitlist.</p>
    </div>
  </div>
</body>
</html>`);
    } else if (template === 'launch') {
      setEmailSubject('We\'re Live! 🚀 Welcome to Sentra');
      setEmailContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: #d4af37; margin: 0; font-size: 28px; letter-spacing: 2px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #1a1a2e; margin-top: 0; }
    .content p { margin: 16px 0; color: #555; }
    .highlight { background: #fff8e7; border-left: 4px solid #d4af37; padding: 15px 20px; margin: 20px 0; border-radius: 0 6px 6px 0; }
    .cta-button { display: inline-block; background: #d4af37; color: #1a1a2e; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 20px 30px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SENTRA</h1>
    </div>
    <div class="content">
      <h2>{{name}}, The Wait is Over!</h2>
      <p>We're thrilled to announce that Sentra is now officially live!</p>
      <div class="highlight">
        <strong>🎁 Your Waitlist Reward:</strong> As a thank you for your patience, you have a special reward waiting in your wallet!
      </div>
      <p>Explore our curated collection of premium fragrances and discover your signature scent.</p>
      <a href="https://sentra.com" class="cta-button">Start Shopping</a>
      <p>Thank you for being an early supporter!</p>
    </div>
    <div class="footer">
      <p>© 2025 Sentra. All rights reserved.</p>
      <p>You're receiving this because you signed up for our waitlist.</p>
    </div>
  </div>
</body>
</html>`);
    } else if (template === 'promo') {
      setEmailSubject('Special Offer Just for You! 💎');
      setEmailContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: #d4af37; margin: 0; font-size: 28px; letter-spacing: 2px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #1a1a2e; margin-top: 0; }
    .content p { margin: 16px 0; color: #555; }
    .promo-box { background: linear-gradient(135deg, #d4af37 0%, #f0d780 100%); padding: 30px; text-align: center; border-radius: 8px; margin: 20px 0; }
    .promo-box h3 { color: #1a1a2e; margin: 0 0 10px 0; font-size: 24px; }
    .promo-box p { color: #1a1a2e; margin: 0; }
    .cta-button { display: inline-block; background: #1a1a2e; color: #d4af37; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 20px 30px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SENTRA</h1>
    </div>
    <div class="content">
      <h2>Hey {{name}}!</h2>
      <p>We have a special offer just for our waitlist members!</p>
      <div class="promo-box">
        <h3>EXCLUSIVE OFFER</h3>
        <p>Get 20% off your first order</p>
      </div>
      <p>Don't miss this limited-time opportunity to try our premium fragrances.</p>
      <a href="https://sentra.com" class="cta-button">Shop Now</a>
    </div>
    <div class="footer">
      <p>© 2025 Sentra. All rights reserved.</p>
      <p>You're receiving this because you signed up for our waitlist.</p>
    </div>
  </div>
</body>
</html>`);
    }
  };

  const hasSocialHandle = (entry: WaitlistEntry) => {
    return entry.social_handle || entry.facebook_handle || entry.tiktok_handle;
  };

  const stats = {
    total: list.length,
    verified: list.filter(e => e.is_social_verified).length,
    pending: list.filter(e => !e.is_social_verified && hasSocialHandle(e)).length,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">Waitlist Management</h1>
          <p className="text-muted-foreground mt-1">Verify social handles and credit launch rewards</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="gap-2">
                <Mail className="h-4 w-4" />
                Send Bulk Email
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Send Bulk Email to Waitlist
                </DialogTitle>
                <DialogDescription>
                  Compose and send an email to all waitlist users. Use {"{{name}}"} to personalize with recipient's name.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label>Quick Templates</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => loadEmailTemplate('announcement')}>
                      📢 Announcement
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadEmailTemplate('launch')}>
                      🚀 Launch
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadEmailTemplate('promo')}>
                      💎 Promo
                    </Button>
                  </div>
                </div>

                {/* Recipient Filter */}
                <div className="space-y-2">
                  <Label htmlFor="recipientFilter">Recipients</Label>
                  <Select value={recipientFilter} onValueChange={(v) => setRecipientFilter(v as RecipientFilter)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Waitlist Users ({stats.total})</SelectItem>
                      <SelectItem value="verified">Verified Only ({stats.verified})</SelectItem>
                      <SelectItem value="pending">Pending Only ({stats.pending})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input
                    id="emailSubject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="bg-background/50"
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="emailContent">Email Content (HTML)</Label>
                  <Textarea
                    id="emailContent"
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Enter HTML email content..."
                    className="min-h-[300px] font-mono text-sm bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Use {"{{name}}"} for recipient's name and {"{{email}}"} for their email address.
                  </p>
                </div>

                {/* Preview */}
                {emailContent && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div className="border rounded-lg p-4 bg-white max-h-[300px] overflow-auto">
                      <div dangerouslySetInnerHTML={{ __html: emailContent.replace(/{{name}}/g, 'John Doe').replace(/{{email}}/g, 'john@example.com') }} />
                    </div>
                  </div>
                )}

                {/* Test Email Section */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="flex items-center gap-2">
                    <TestTube className="h-4 w-4" />
                    Send Test Email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Send a test email to yourself before sending to all recipients.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter your email address..."
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className="flex-1 bg-background/50"
                    />
                    <Button 
                      variant="outline"
                      onClick={handleSendTestEmail} 
                      disabled={sendingTestEmail || !emailSubject || !emailContent || !testEmailAddress}
                      className="gap-2"
                    >
                      {sendingTestEmail ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      Send Test
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendBulkEmail} 
                  disabled={sendingEmail || !emailSubject || !emailContent}
                  className="gap-2"
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send to {getRecipientCount()} Recipients
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Migrate All Verified</CardTitle>
            <UserPlus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <Button 
              onClick={migrateAllVerified} 
              disabled={migrating || stats.verified === 0}
              size="sm"
              className="w-full"
            >
              {migrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Create Users & Credit
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-amber-500/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verify All Pending</CardTitle>
            <CheckCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <Button 
              onClick={verifyAndMigrateAllPending} 
              disabled={verifyingAllPending || list.filter(e => !e.is_social_verified).length === 0}
              size="sm"
              variant="outline"
              className="w-full border-amber-500/50 hover:bg-amber-500/10"
            >
              {verifyingAllPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Verify & Credit ({list.filter(e => !e.is_social_verified).length})
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Email Analytics */}
      {campaigns.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Email Analytics
                </CardTitle>
                <CardDescription>Track open rates and click-through rates for your campaigns</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                {showAnalytics ? 'Hide' : 'Show'} Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns.slice(0, showAnalytics ? 10 : 3).map((campaign) => {
                const openRate = campaign.sent_count > 0 
                  ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1) 
                  : '0';
                const clickRate = campaign.opened_count > 0 
                  ? ((campaign.clicked_count / campaign.opened_count) * 100).toFixed(1) 
                  : '0';
                
                return (
                  <div key={campaign.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{campaign.subject}</h4>
                        <p className="text-xs text-muted-foreground">
                          {campaign.sent_at 
                            ? `Sent ${new Date(campaign.sent_at).toLocaleDateString()} at ${new Date(campaign.sent_at).toLocaleTimeString()}`
                            : 'Sending in progress...'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {campaign.recipient_filter}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="text-lg font-bold text-foreground">{campaign.sent_count}</div>
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <Send className="h-3 w-3" /> Sent
                        </div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="text-lg font-bold text-blue-500">{campaign.opened_count}</div>
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <Eye className="h-3 w-3" /> Opens ({openRate}%)
                        </div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="text-lg font-bold text-green-500">{campaign.clicked_count}</div>
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <MousePointerClick className="h-3 w-3" /> Clicks ({clickRate}%)
                        </div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="text-lg font-bold text-red-500">{campaign.failed_count}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                      </div>
                    </div>
                    
                    {/* Progress bars */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Open Rate</span>
                          <span>{openRate}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${Math.min(parseFloat(openRate), 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Click Rate (of opens)</span>
                          <span>{clickRate}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${Math.min(parseFloat(clickRate), 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead>Social Handles</TableHead>
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
                        <div className="flex flex-col gap-1">
                          {entry.social_handle && (
                            <a
                              href={`https://instagram.com/${entry.social_handle.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-pink-500 hover:underline text-sm"
                            >
                              <span className="w-4">📷</span> {entry.social_handle}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {entry.facebook_handle && (
                            <a
                              href={`https://facebook.com/${entry.facebook_handle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-500 hover:underline text-sm"
                            >
                              <span className="w-4">📘</span> {entry.facebook_handle}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {entry.tiktok_handle && (
                            <a
                              href={`https://tiktok.com/@${entry.tiktok_handle.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-foreground hover:underline text-sm"
                            >
                              <span className="w-4">🎵</span> {entry.tiktok_handle}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {!entry.social_handle && !entry.facebook_handle && !entry.tiktok_handle && (
                            <span className="text-muted-foreground text-sm">Not provided</span>
                          )}
                        </div>
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
                        {!entry.is_social_verified && (entry.social_handle || entry.facebook_handle || entry.tiktok_handle) && (
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
