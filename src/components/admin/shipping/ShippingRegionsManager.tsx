import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin, Loader2 } from 'lucide-react';

interface ShippingRegion {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export function ShippingRegionsManager() {
  const [regions, setRegions] = useState<ShippingRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRegionName, setNewRegionName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    const { data, error } = await supabase
      .from('shipping_regions')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast.error('Failed to load shipping regions');
      console.error(error);
    } else {
      setRegions(data || []);
    }
    setLoading(false);
  };

  const handleAddRegion = async () => {
    if (!newRegionName.trim()) {
      toast.error('Please enter a region name');
      return;
    }

    setAdding(true);
    const { error } = await supabase
      .from('shipping_regions')
      .insert([{ name: newRegionName.trim() }]);

    if (error) {
      toast.error('Failed to add region');
      console.error(error);
    } else {
      toast.success('Region added successfully');
      setNewRegionName('');
      fetchRegions();
    }
    setAdding(false);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('shipping_regions')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update region');
      console.error(error);
    } else {
      setRegions(regions.map(r => r.id === id ? { ...r, is_active: isActive } : r));
      toast.success(`Region ${isActive ? 'activated' : 'deactivated'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will also delete all shipping matrix routes using this region.')) return;

    const { error } = await supabase
      .from('shipping_regions')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete region');
      console.error(error);
    } else {
      toast.success('Region deleted');
      fetchRegions();
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
          <MapPin className="h-5 w-5" />
          Shipping Regions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Region Form */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter region name (e.g., Lagos Island)"
            value={newRegionName}
            onChange={(e) => setNewRegionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRegion()}
          />
          <Button onClick={handleAddRegion} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-2">Add</span>
          </Button>
        </div>

        {/* Regions Table */}
        {regions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No shipping regions defined yet. Add your first region above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region Name</TableHead>
                <TableHead className="w-[100px]">Active</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map((region) => (
                <TableRow key={region.id}>
                  <TableCell className="font-medium">{region.name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={region.is_active}
                      onCheckedChange={(checked) => handleToggleActive(region.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(region.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
