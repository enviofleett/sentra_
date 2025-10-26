import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Store } from 'lucide-react';

interface Vendor {
  id: string;
  rep_full_name: string;
  phone: string | null;
  email: string;
  bank_info: any | null;
  store_location: string | null;
  created_at: string;
  updated_at: string;
}

export function VendorsManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bankInfo, setBankInfo] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
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
      bank_info: parsedBankInfo
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
    </div>
  );
}
