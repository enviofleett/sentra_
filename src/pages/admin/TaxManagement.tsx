import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, History, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TaxManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentRate, setCurrentRate] = useState<number>(0);
  const [newRate, setNewRate] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch active rate
      const { data: settings } = await supabase
        .from('vat_settings')
        .select('rate')
        .eq('is_active', true)
        .maybeSingle();
      
      if (settings) {
        setCurrentRate(Number(settings.rate));
        setNewRate(settings.rate.toString());
      }

      // Fetch audit logs
      const { data: logs } = await supabase
        .from('vat_audit_logs')
        .select(`
          id, old_rate, new_rate, changed_at,
          changed_by_user:changed_by(email)
        `)
        .order('changed_at', { ascending: false })
        .limit(10);
      
      setHistory(logs || []);
    } catch (error) {
      console.error('Error fetching tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRate = async () => {
    const rateValue = parseFloat(newRate);
    if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
      toast({
        title: "Validation Error",
        description: "VAT rate must be between 0 and 100%",
        variant: "destructive",
      });
      return;
    }

    if (rateValue === currentRate) {
      toast({
        title: "No Change",
        description: "The new rate is the same as the current rate.",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      // 1. Log the change
      const { error: logError } = await supabase.from('vat_audit_logs').insert({
        old_rate: currentRate,
        new_rate: rateValue,
        changed_by: user.id
      });
      if (logError) throw logError;

      // 2. Update the setting
      const { error: settingError } = await supabase
        .from('vat_settings')
        .update({ 
          rate: rateValue, 
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('is_active', true);

      if (settingError) throw settingError;

      setCurrentRate(rateValue);
      fetchData(); // Refresh logs

      toast({
        title: "Success",
        description: `VAT Rate updated to ${rateValue}%`,
      });
    } catch (error: any) {
      console.error('Error updating rate:', error);
      toast({
        title: "Error",
        description: "Failed to update VAT rate",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Tax Management</h2>
        <p className="text-muted-foreground">Configure Value Added Tax (VAT) rates and view change history.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>VAT Configuration</CardTitle>
            <CardDescription>Set the global VAT percentage applied to all orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
              <span className="text-sm font-medium">Current Active Rate</span>
              <span className="text-2xl font-bold text-primary">{currentRate}%</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vat-rate">New VAT Rate (%)</Label>
              <div className="flex gap-2">
                <Input 
                  id="vat-rate" 
                  type="number" 
                  step="0.01"
                  min="0"
                  max="100"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="e.g. 7.5"
                />
                <Button onClick={handleUpdateRate} disabled={saving || loading}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Rate'}
                </Button>
              </div>
            </div>

            <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Updating this rate will immediately affect all new checkouts. Existing orders will not be changed.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Audit Log
            </CardTitle>
            <CardDescription>Recent changes to tax settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No history available
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.changed_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-muted-foreground line-through mr-2">{log.old_rate}%</span>
                        <span className="font-bold text-green-600">{log.new_rate}%</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.changed_by_user?.email || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
