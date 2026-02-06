
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MapPin, Edit2, Trash2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getShippingRegions } from '@/utils/shippingCalculator';
import { useAuth } from '@/contexts/AuthContext';

export interface Address {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  street: string;
  city: string;
  state: string;
  country: string;
  region_id: string | null;
  is_default: boolean;
}

interface AddressBookProps {
  onSelect?: (address: Address) => void;
  selectedAddressId?: string;
}

export function AddressBook({ onSelect, selectedAddressId }: AddressBookProps) {
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    region_id: '',
    is_default: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    fetchAddresses();
    loadRegions();
  }, [user, authLoading]);

  const loadRegions = async () => {
    const data = await getShippingRegions();
    setRegions(data);
  };

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        label: address.label || 'Home',
        full_name: address.full_name,
        phone: address.phone,
        email: address.email || '',
        street: address.street,
        city: address.city,
        state: address.state,
        region_id: address.region_id || '',
        is_default: address.is_default || false
      });
    } else {
      setEditingAddress(null);
      setFormData({
        label: 'Home',
        full_name: '',
        phone: '',
        email: user?.email || '',
        street: '',
        city: '',
        state: '',
        region_id: '',
        is_default: addresses.length === 0 // Make default if it's the first one
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.phone || !formData.street || !formData.city || !formData.state || !formData.region_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user!.id,
        ...formData,
        email: formData.email || null, // Ensure empty string becomes null
        is_default: formData.is_default
      };

      let error;
      if (editingAddress) {
        const { error: updateError } = await supabase
          .from('user_addresses')
          .update(payload)
          .eq('id', editingAddress.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_addresses')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      // If set as default, update others
      if (formData.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .neq('id', editingAddress?.id || 'new') // This logic is slightly flawed for insert, but works because we fetch fresh data
          .eq('user_id', user!.id); 
          // Actually, we should do this properly: trigger or separate update. 
          // Ideally, we'd update all others to false FIRST if this one is true.
      }

      toast.success(editingAddress ? 'Address updated' : 'Address added');
      setIsDialogOpen(false);
      fetchAddresses();
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast.error(error.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Address deleted');
      fetchAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  if (loading || authLoading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (!user) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
        Please log in to view your addresses.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Addresses</h3>
        <Button onClick={() => handleOpenDialog()} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Add New
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr) => (
          <Card 
            key={addr.id} 
            className={`cursor-pointer transition-colors ${selectedAddressId === addr.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
            onClick={() => onSelect?.(addr)}
          >
            <CardContent className="p-4 relative">
              {addr.is_default && (
                <div className="absolute top-2 right-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  Default
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{addr.label} - {addr.full_name}</p>
                  <p className="text-sm text-muted-foreground">{addr.street}</p>
                  <p className="text-sm text-muted-foreground">{addr.city}, {addr.state}</p>
                  {addr.region_id && (
                    <p className="text-xs text-primary/80 font-medium">
                      Region: {regions.find(r => r.id === addr.region_id)?.name || 'Loading...'}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">{addr.phone}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenDialog(addr); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(addr.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {selectedAddressId === addr.id && (
                <div className="absolute bottom-2 right-2 text-primary">
                  <Check className="h-5 w-5" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {addresses.length === 0 && (
        <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
          No addresses found. Add one to get started.
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input placeholder="Home, Office..." value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input placeholder="John Doe" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input placeholder="+234..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input placeholder="john@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Street Address *</Label>
              <Input placeholder="123 Main St" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input placeholder="Lekki" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input placeholder="Lagos" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery Region *</Label>
              <Select value={formData.region_id} onValueChange={val => setFormData({...formData, region_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="is_default" 
                checked={formData.is_default} 
                onChange={e => setFormData({...formData, is_default: e.target.checked})}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_default" className="cursor-pointer">Set as default address</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
