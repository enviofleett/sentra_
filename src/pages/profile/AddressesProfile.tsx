import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Edit, Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().min(1, 'Country is required').max(100),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AddressesProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingShipping, setEditingShipping] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<AddressFormData | null>(null);
  const [billingAddress, setBillingAddress] = useState<AddressFormData | null>(null);

  const shippingForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Nigeria',
    },
  });

  const billingForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Nigeria',
    },
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('default_shipping_address, default_billing_address')
      .eq('id', user.id)
      .single();
    
    if (data) {
      if (data.default_shipping_address) {
        setShippingAddress(data.default_shipping_address as AddressFormData);
        shippingForm.reset(data.default_shipping_address as AddressFormData);
      }
      if (data.default_billing_address) {
        setBillingAddress(data.default_billing_address as AddressFormData);
        billingForm.reset(data.default_billing_address as AddressFormData);
      }
    }
  };

  const saveShippingAddress = async (data: AddressFormData) => {
    if (!user) return;
    setLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ default_shipping_address: data })
      .eq('id', user.id);

    setLoading(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save shipping address',
        variant: 'destructive',
      });
    } else {
      setShippingAddress(data);
      setEditingShipping(false);
      toast({
        title: 'Success',
        description: 'Shipping address updated successfully',
      });
    }
  };

  const saveBillingAddress = async (data: AddressFormData) => {
    if (!user) return;
    setLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ default_billing_address: data })
      .eq('id', user.id);

    setLoading(false);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save billing address',
        variant: 'destructive',
      });
    } else {
      setBillingAddress(data);
      setEditingBilling(false);
      toast({
        title: 'Success',
        description: 'Billing address updated successfully',
      });
    }
  };

  const AddressDisplay = ({ address }: { address: AddressFormData | null }) => {
    if (!address) {
      return <p className="text-muted-foreground">No address saved</p>;
    }
    return (
      <div className="text-sm space-y-1">
        <p>{address.street}</p>
        <p>{address.city}, {address.state} {address.postalCode}</p>
        <p>{address.country}</p>
      </div>
    );
  };

  const AddressForm = ({ 
    form, 
    onSubmit, 
    onCancel 
  }: { 
    form: ReturnType<typeof useForm<AddressFormData>>, 
    onSubmit: (data: AddressFormData) => void,
    onCancel: () => void
  }) => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="street">Street Address</Label>
        <Input {...form.register('street')} placeholder="123 Main Street" />
        {form.formState.errors.street && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.street.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input {...form.register('city')} placeholder="Abuja" />
          {form.formState.errors.city && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.city.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input {...form.register('state')} placeholder="FCT" />
          {form.formState.errors.state && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.state.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input {...form.register('postalCode')} placeholder="900001" />
          {form.formState.errors.postalCode && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.postalCode.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input {...form.register('country')} placeholder="Nigeria" />
          {form.formState.errors.country && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.country.message}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          Save Address
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">My Addresses</h2>
      
      <div className="grid gap-6">
        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Shipping Address</CardTitle>
              </div>
              {!editingShipping && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingShipping(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingShipping ? (
              <AddressForm 
                form={shippingForm}
                onSubmit={saveShippingAddress}
                onCancel={() => {
                  setEditingShipping(false);
                  if (shippingAddress) {
                    shippingForm.reset(shippingAddress);
                  }
                }}
              />
            ) : (
              <AddressDisplay address={shippingAddress} />
            )}
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Billing Address</CardTitle>
              </div>
              {!editingBilling && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingBilling(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingBilling ? (
              <AddressForm 
                form={billingForm}
                onSubmit={saveBillingAddress}
                onCancel={() => {
                  setEditingBilling(false);
                  if (billingAddress) {
                    billingForm.reset(billingAddress);
                  }
                }}
              />
            ) : (
              <AddressDisplay address={billingAddress} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
