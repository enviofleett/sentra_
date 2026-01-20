import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Scale } from 'lucide-react';

interface WeightRate {
  id: string;
  min_weight: number;
  max_weight: number;
  cost: number;
  created_at: string;
}

export function ShippingRateManager() {
  const [rates, setRates] = useState<WeightRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [cost, setCost] = useState('');

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('shipping_weight_rates')
      .select('*')
      .order('min_weight', { ascending: true });

    if (error) {
      toast.error('Failed to load shipping rates');
      console.error(error);
    } else {
      setRates(data || []);
    }
    setLoading(false);
  };

  const handleAddRate = async () => {
    const min = parseFloat(minWeight);
    const max = parseFloat(maxWeight);
    const rateCost = parseFloat(cost);

    if (isNaN(min) || min < 0) {
      toast.error('Minimum weight must be 0 or greater');
      return;
    }
    if (isNaN(max) || max <= min) {
      toast.error('Maximum weight must be greater than minimum');
      return;
    }
    if (isNaN(rateCost) || rateCost < 0) {
      toast.error('Cost must be 0 or greater');
      return;
    }

    // Check for overlapping ranges
    const hasOverlap = rates.some(r => 
      (min >= r.min_weight && min < r.max_weight) ||
      (max > r.min_weight && max <= r.max_weight) ||
      (min <= r.min_weight && max >= r.max_weight)
    );
    
    if (hasOverlap) {
      toast.error('This range overlaps with an existing rate');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('shipping_weight_rates').insert({
      min_weight: min,
      max_weight: max,
      cost: rateCost,
    });

    if (error) {
      toast.error('Failed to add shipping rate');
      console.error(error);
    } else {
      toast.success('Shipping rate added');
      setMinWeight('');
      setMaxWeight('');
      setCost('');
      fetchRates();
    }
    setSaving(false);
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('Delete this shipping rate?')) return;

    const { error } = await supabase
      .from('shipping_weight_rates')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete rate');
      console.error(error);
    } else {
      toast.success('Rate deleted');
      setRates(rates.filter(r => r.id !== id));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Scale className="h-5 w-5" />
          Weight-Based Shipping Rates
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure global shipping costs based on package weight. These rates apply across all orders.
        </p>
      </div>

      {/* Add New Rate Form */}
      <Card>
        <CardContent className="pt-4">
          <h4 className="font-medium text-sm mb-3">Add New Rate</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="min-weight" className="text-xs">Min Weight (kg)</Label>
              <Input
                id="min-weight"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={minWeight}
                onChange={(e) => setMinWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max-weight" className="text-xs">Max Weight (kg)</Label>
              <Input
                id="max-weight"
                type="number"
                min="0"
                step="0.1"
                placeholder="2"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rate-cost" className="text-xs">Cost (₦)</Label>
              <Input
                id="rate-cost"
                type="number"
                min="0"
                step="100"
                placeholder="2000"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAddRate}
              disabled={saving || !minWeight || !maxWeight || !cost}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Rate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Rates */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Current Rates</h4>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No shipping rates configured yet. Add your first rate above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rates.map((rate) => (
              <Card key={rate.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-mono">
                      {rate.min_weight} - {rate.max_weight} kg
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-semibold">
                      {formatCurrency(rate.cost)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRate(rate.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Make sure weight ranges don't overlap. If a cart's total weight doesn't match any range, 
        shipping will default to ₦0 or require manual calculation.
      </p>
    </div>
  );
}
