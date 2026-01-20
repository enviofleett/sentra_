import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Route, Loader2, ArrowRight } from 'lucide-react';

interface ShippingRegion {
  id: string;
  name: string;
}

interface ShippingMatrixRoute {
  id: string;
  origin_region_id: string;
  destination_region_id: string;
  base_cost: number;
  weight_rate: number;
  estimated_days: string | null;
  is_active: boolean;
  origin_region?: ShippingRegion;
  destination_region?: ShippingRegion;
}

export function ShippingMatrixManager() {
  const [routes, setRoutes] = useState<ShippingMatrixRoute[]>([]);
  const [regions, setRegions] = useState<ShippingRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form state for new route
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [baseCost, setBaseCost] = useState('');
  const [weightRate, setWeightRate] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch regions
    const { data: regionsData } = await supabase
      .from('shipping_regions')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    setRegions(regionsData || []);

    // Fetch routes with region names
    const { data: routesData, error } = await supabase
      .from('shipping_matrix')
      .select(`
        *,
        origin_region:shipping_regions!shipping_matrix_origin_region_id_fkey(id, name),
        destination_region:shipping_regions!shipping_matrix_destination_region_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load shipping routes');
      console.error(error);
    } else {
      setRoutes(routesData || []);
    }
    setLoading(false);
  };

  const handleAddRoute = async () => {
    if (!originId || !destinationId) {
      toast.error('Please select both origin and destination regions');
      return;
    }

    if (!baseCost || parseFloat(baseCost) < 0) {
      toast.error('Please enter a valid base cost');
      return;
    }

    setAdding(true);
    const { error } = await supabase
      .from('shipping_matrix')
      .insert([{
        origin_region_id: originId,
        destination_region_id: destinationId,
        base_cost: parseFloat(baseCost),
        weight_rate: parseFloat(weightRate) || 0,
        estimated_days: estimatedDays.trim() || null
      }]);

    if (error) {
      if (error.code === '23505') {
        toast.error('This route already exists');
      } else {
        toast.error('Failed to add route');
        console.error(error);
      }
    } else {
      toast.success('Route added successfully');
      // Reset form
      setOriginId('');
      setDestinationId('');
      setBaseCost('');
      setWeightRate('');
      setEstimatedDays('');
      fetchData();
    }
    setAdding(false);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('shipping_matrix')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update route');
      console.error(error);
    } else {
      setRoutes(routes.map(r => r.id === id ? { ...r, is_active: isActive } : r));
      toast.success(`Route ${isActive ? 'activated' : 'deactivated'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shipping route?')) return;

    const { error } = await supabase
      .from('shipping_matrix')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete route');
      console.error(error);
    } else {
      toast.success('Route deleted');
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Shipping Routes (Matrix)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Route Form */}
        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
          <h4 className="font-medium">Add New Route</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Origin Region</Label>
              <Select value={originId} onValueChange={setOriginId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select origin" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destination Region</Label>
              <Select value={destinationId} onValueChange={setDestinationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Base Cost (₦)</Label>
              <Input
                type="number"
                placeholder="e.g., 2000"
                value={baseCost}
                onChange={(e) => setBaseCost(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Per KG Rate (₦)</Label>
              <Input
                type="number"
                placeholder="e.g., 500"
                value={weightRate}
                onChange={(e) => setWeightRate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Est. Days</Label>
              <Input
                placeholder="e.g., 1-2 Days"
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleAddRoute} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Route
          </Button>
        </div>

        {/* Routes Table */}
        {routes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No shipping routes defined yet. Add your first route above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Base Cost</TableHead>
                <TableHead>Per KG</TableHead>
                <TableHead>Est. Days</TableHead>
                <TableHead className="w-[80px]">Active</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <span>{route.origin_region?.name}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span>{route.destination_region?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>₦{route.base_cost.toLocaleString()}</TableCell>
                  <TableCell>₦{route.weight_rate.toLocaleString()}/kg</TableCell>
                  <TableCell>{route.estimated_days || '-'}</TableCell>
                  <TableCell>
                    <Switch
                      checked={route.is_active}
                      onCheckedChange={(checked) => handleToggleActive(route.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(route.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {regions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            ⚠️ No active regions available. Please add shipping regions first.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
