import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Store, Truck, MapPin, ShoppingBasket } from 'lucide-react';
import { VendorShippingRulesDialog } from '@/components/admin/VendorShippingRulesDialog';

interface ShippingRegion {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  rep_full_name: string;
  phone: string | null;
  email: string;
  bank_info: any | null;
  store_location: string | null;
  shipping_region_id: string | null;
  shipping_region?: ShippingRegion | null;
  min_order_quantity: number;
  created_at: string;
  updated_at: string;
}

export function VendorsManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bankInfo, setBankInfo] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [shippingRegions, setShippingRegions] = useState<ShippingRegion[]>([]);
  
  // Shipping rules dialog state
  const [shippingRulesOpen, setShippingRulesOpen] = useState(false);
  const [selectedVendorForRules, setSelectedVendorForRules] = useState<{id: string, name: string} | null>(null);

  const openShippingRulesDialog = (vendor: Vendor) => {
    setSelectedVendorForRules({ id: vendor.id, name: vendor.rep_full_name });
    setShippingRulesOpen(true);
  };

  useEffect(() => {
    fetchVendors();
    fetchShippingRegions();
  }, []);

  const fetchShippingRegions = async () => {
    const { data } = await supabase
      .from('shipping_regions')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    setShippingRegions(data || []);
  };

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        shipping_region:shipping_regions(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load vendors');
      console.error(error);
    } else {
      setVendors(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let parsedBankInfo = null;
    const bankInfoValue = formData.get('bank_info') as string;
    if (bankInfoValue) {
      try {
        parsedBankInfo = JSON.parse(bankInfoValue);
      } catch (error) {
        toast.error('Invalid JSON format for bank info');
        return;
      }
    }

    const vendorData = {
      rep_full_name: formData.get('rep_full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || null,
      store_location: formData.get('store_location') as string || null,
      bank_info: parsedBankInfo,
      shipping_region_id: selectedRegionId && selectedRegionId !== 'none' ? selectedRegionId : null,
      min_order_quantity: parseInt(formData.get('min_order_quantity') as string) || 1
    };

    if (editingVendor) {
      const { error } = await supabase
        .from('vendors')
        .update(vendorData)
        .eq('id', editingVendor.id);

      if (error) {
        toast.error('Failed to update vendor');
        console.error(error);
      } else {
        toast.success('Vendor updated successfully');
        setIsDialogOpen(false);
        fetchVendors();
      }
    } else {
      const { error } = await supabase
        .from('vendors')
        .insert([vendorData]);

      if (error) {
        toast.error('Failed to create vendor');
        console.error(error);
      } else {
        toast.success('Vendor created successfully');
        setIsDialogOpen(false);
        fetchVendors();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This will fail if the vendor has products.')) return;

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete vendor. They may have products assigned.');
      console.error(error);
    } else {
      toast.success('Vendor deleted successfully');
      fetchVendors();
    }
  };

  const openDialog = (vendor?: Vendor) => {
    setEditingVendor(vendor || null);
    setBankInfo(vendor?.bank_info ? JSON.stringify(vendor.bank_info, null, 2) : '');
    setSelectedRegionId(vendor?.shipping_region_id || 'none');
    setIsDialogOpen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Loading vendors...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Vendor Management</h2>
        <p className="text-muted-foreground">Manage vendor partners and their information</p>
      </div>

      {/* Vendors Table */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">All Vendors</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="rep_full_name">Full Name *</Label>
                <Input 
                  id="rep_full_name" 
                  name="rep_full_name" 
                  defaultValue={editingVendor?.rep_full_name} 
                  required 
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email"
                  defaultValue={editingVendor?.email} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    type="tel"
                    defaultValue={editingVendor?.phone || ''} 
                  />
                </div>
                <div>
                  <Label htmlFor="store_location">Store Location</Label>
                  <Input 
                    id="store_location" 
                    name="store_location" 
                    defaultValue={editingVendor?.store_location || ''} 
                  />
                </div>
              </div>

              {/* MOQ Input */}
              <div>
                <Label htmlFor="min_order_quantity" className="flex items-center gap-2">
                  <ShoppingBasket className="h-4 w-4" />
                  MOQ (Minimum Order Quantity)
                </Label>
                <Input 
                  id="min_order_quantity" 
                  name="min_order_quantity" 
                  type="number"
                  min="1"
                  defaultValue={editingVendor?.min_order_quantity || 1} 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum total items a customer must buy from this vendor to checkout
                </p>
              </div>

              {/* Shipping Region Selection */}
              <div>
                <Label htmlFor="shipping_region">Shipping Region</Label>
                <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shipping region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No region assigned</SelectItem>
                    {shippingRegions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  The region where this vendor ships from
                </p>
              </div>

              <div>
                <Label htmlFor="bank_info">Bank Information (JSON)</Label>
                <Textarea 
                  id="bank_info" 
                  name="bank_info"
                  placeholder='{"bank_name": "First Bank", "account_number": "1234567890", "account_name": "Vendor Name"}'
                  defaultValue={bankInfo}
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional. Enter valid JSON format for bank details.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingVendor ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vendors ({vendors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>MOQ</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Shipping</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.rep_full_name}</TableCell>
                  <TableCell>{vendor.email}</TableCell>
                  <TableCell>{vendor.phone || '-'}</TableCell>
                  <TableCell>{vendor.store_location || '-'}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm font-medium">
                      <ShoppingBasket className="h-3 w-3 text-muted-foreground" />
                      {vendor.min_order_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    {vendor.shipping_region ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {vendor.shipping_region.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openShippingRulesDialog(vendor)}
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      Rules
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDialog(vendor)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(vendor.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vendor Shipping Rules Dialog */}
      {selectedVendorForRules && (
        <VendorShippingRulesDialog
          vendorId={selectedVendorForRules.id}
          vendorName={selectedVendorForRules.name}
          isOpen={shippingRulesOpen}
          onClose={() => {
            setShippingRulesOpen(false);
            setSelectedVendorForRules(null);
          }}
        />
      )}
    </div>
  );
}
