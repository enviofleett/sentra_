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
    fetchCurrentRate();
    fetchHistory();
  }, []);

  const fetchCurrentRate = async () => {
    try {
      const { data, error } = await supabase
        .from('vat_settings')
        .select('rate')
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      if (data) {
        setCurrentRate(data.rate);
        setNewRate(data.rate.toString());
      }
    } catch (error) {
      console.error('Error fetching VAT rate:', error);
      toast({
        title: "Error",
        description: "Failed to load current VAT rate",
        variant: "destructive"
      });
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
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
      console.error('Error fetching tax history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRate = async () => {
    if (!newRate) return;
    setSaving(true);
    
    try {
      const rateValue = parseFloat(newRate);
      if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
        throw new Error('Invalid VAT rate');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Log the change
      const { error: logError } = await supabase
        .from('vat_audit_logs')
        .insert({
          old_rate: currentRate,
          new_rate: rateValue,
          changed_by: user.id
        });

      if (logError) throw logError;

      // 2. Update the setting
      // First try to update existing active record
      const { data: existing, error: fetchError } = await supabase
        .from('vat_settings')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('vat_settings')
          .update({ 
            rate: rateValue,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('id', existing.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new if none exists
        const { error: insertError } = await supabase
          .from('vat_settings')
          .insert({
            rate: rateValue,
            is_active: true,
            updated_by: user.id
          });
          
        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "VAT Rate updated successfully",
      });

      setCurrentRate(rateValue);
      fetchHistory();
    } catch (error: any) {
      console.error('Error updating VAT rate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update VAT rate",
        variant: "destructive"
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
                <Button onClick={handleUpdateRate} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Rate'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change History</CardTitle>
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
