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
import { Plus, Trash2, Route, Loader2, ArrowRight, Info, Pencil } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  // Edit state
  const [editingRoute, setEditingRoute] = useState<ShippingMatrixRoute | null>(null);
  const [editBaseCost, setEditBaseCost] = useState('');
  const [editWeightRate, setEditWeightRate] = useState('');
  const [editEstimatedDays, setEditEstimatedDays] = useState('');
  const [updating, setUpdating] = useState(false);

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

  const handleEditClick = (route: ShippingMatrixRoute) => {
    setEditingRoute(route);
    setEditBaseCost(route.base_cost.toString());
    setEditWeightRate(route.weight_rate.toString());
    setEditEstimatedDays(route.estimated_days || '');
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute) return;

    if (!editBaseCost || parseFloat(editBaseCost) < 0) {
      toast.error('Please enter a valid base cost');
      return;
    }

    setUpdating(true);
    const { error } = await supabase
      .from('shipping_matrix')
      .update({
        base_cost: parseFloat(editBaseCost),
        weight_rate: parseFloat(editWeightRate) || 0,
        estimated_days: editEstimatedDays.trim() || null
      })
      .eq('id', editingRoute.id);

    if (error) {
      toast.error('Failed to update route');
      console.error(error);
    } else {
      toast.success('Route updated successfully');
      setEditingRoute(null);
      fetchData();
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Shipping Routes (Matrix)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-50/50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 font-medium">ML to KG Weight Calculation Logic</AlertTitle>
            <AlertDescription className="text-blue-700 text-sm mt-2 space-y-2">
              <p>
                Shipping rates are calculated in <strong>KG</strong>. Since products are listed in <strong>ML</strong>, 
                the system automatically converts volume to weight using a tiered model that accounts for glass bottles and packaging:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
                <li><strong>≤ 30ml:</strong> 0.15kg base + liquid weight (e.g., 30ml ≈ 0.18kg)</li>
                <li><strong>≤ 60ml:</strong> 0.20kg base + liquid weight (e.g., 50ml ≈ 0.25kg)</li>
                <li><strong>≤ 100ml:</strong> 0.30kg base + liquid weight (e.g., 100ml ≈ 0.40kg)</li>
                <li><strong>&gt; 100ml:</strong> 0.50kg base + liquid weight (e.g., 200ml ≈ 0.70kg)</li>
              </ul>
              <p className="pt-1 text-xs italic">
                * Note: Liquid density is estimated at 1g/ml.
              </p>
            </AlertDescription>
          </Alert>

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
                  <TableHead className="w-[120px]">Actions</TableHead>
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(route)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(route.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      <Dialog open={!!editingRoute} onOpenChange={(open) => !open && setEditingRoute(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Shipping Rate</DialogTitle>
            <DialogDescription>
              Update shipping costs and details for {editingRoute?.origin_region?.name} to {editingRoute?.destination_region?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-base-cost">Base Cost (₦)</Label>
              <Input
                id="edit-base-cost"
                type="number"
                value={editBaseCost}
                onChange={(e) => setEditBaseCost(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-weight-rate">Per KG Rate (₦)</Label>
              <Input
                id="edit-weight-rate"
                type="number"
                value={editWeightRate}
                onChange={(e) => setEditWeightRate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-days">Estimated Days</Label>
              <Input
                id="edit-days"
                value={editEstimatedDays}
                onChange={(e) => setEditEstimatedDays(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoute(null)}>Cancel</Button>
            <Button onClick={handleUpdateRoute} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
