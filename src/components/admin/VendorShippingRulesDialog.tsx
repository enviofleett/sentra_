import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Package } from 'lucide-react';

interface ShippingRule {
  id: string;
  vendor_id: string;
  min_quantity: number;
  shipping_schedule: string;
  is_active: boolean;
  created_at: string;
}

interface VendorShippingRulesDialogProps {
  vendorId: string;
  vendorName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VendorShippingRulesDialog({
  vendorId,
  vendorName,
  isOpen,
  onClose,
}: VendorShippingRulesDialogProps) {
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMinQty, setNewMinQty] = useState('');
  const [newSchedule, setNewSchedule] = useState('');

  useEffect(() => {
    if (isOpen && vendorId) {
      fetchRules();
    }
  }, [isOpen, vendorId]);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vendor_shipping_rules')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('min_quantity', { ascending: true });

    if (error) {
      toast.error('Failed to load shipping rules');
      console.error(error);
    } else {
      setRules(data || []);
    }
    setLoading(false);
  };

  const handleAddRule = async () => {
    const minQty = parseInt(newMinQty);
    if (!minQty || minQty < 1) {
      toast.error('Minimum quantity must be at least 1');
      return;
    }
    if (!newSchedule.trim()) {
      toast.error('Please enter a shipping schedule');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('vendor_shipping_rules').insert({
      vendor_id: vendorId,
      min_quantity: minQty,
      shipping_schedule: newSchedule.trim(),
      is_active: true,
    });

    if (error) {
      toast.error('Failed to add rule');
      console.error(error);
    } else {
      toast.success('Shipping rule added');
      setNewMinQty('');
      setNewSchedule('');
      fetchRules();
    }
    setSaving(false);
  };

  const handleToggleActive = async (ruleId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('vendor_shipping_rules')
      .update({ is_active: !currentValue })
      .eq('id', ruleId);

    if (error) {
      toast.error('Failed to update rule');
      console.error(error);
    } else {
      setRules(rules.map(r => 
        r.id === ruleId ? { ...r, is_active: !currentValue } : r
      ));
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this shipping rule?')) return;

    const { error } = await supabase
      .from('vendor_shipping_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      toast.error('Failed to delete rule');
      console.error(error);
    } else {
      toast.success('Rule deleted');
      setRules(rules.filter(r => r.id !== ruleId));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Shipping Rules: {vendorName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Rule Form */}
          <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
            <h4 className="font-medium text-sm">Add New Rule</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="min-qty" className="text-xs">Min Quantity</Label>
                <Input
                  id="min-qty"
                  type="number"
                  min="1"
                  placeholder="e.g., 4"
                  value={newMinQty}
                  onChange={(e) => setNewMinQty(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="schedule" className="text-xs">Shipping Schedule</Label>
                <Input
                  id="schedule"
                  placeholder="e.g., Ships Wednesdays"
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleAddRule}
              disabled={saving || !newMinQty || !newSchedule}
              size="sm"
              className="w-full"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Rule
            </Button>
          </div>

          {/* Existing Rules */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Existing Rules</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No shipping rules configured for this vendor.
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      rule.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {rule.min_quantity}+ units
                        </span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-sm">{rule.shipping_schedule}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleActive(rule.id, rule.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Rules are applied based on quantity thresholds. The highest matching tier is used.
            Example: If qty is 12 and rules are "4+ → Ships Wed" and "10+ → Ships 24hrs", 
            the "10+" rule applies.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
