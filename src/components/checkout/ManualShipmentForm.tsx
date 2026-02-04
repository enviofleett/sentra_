
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle } from 'lucide-react';
import { getShippingRegions } from '@/utils/shippingCalculator';
import { Address } from './AddressBook';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

const addressSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format (e.g., +2348012345678)'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  street: z.string().min(5, 'Street address is too short'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip_code: z.string().optional().default(''),
  country: z.string().min(1, 'Country is required'),
  region_id: z.string().min(1, 'Delivery region is required'),
  save_to_book: z.boolean().default(false)
});

type AddressFormData = z.infer<typeof addressSchema>;

interface ManualShipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (address: Address) => void;
  initialData?: Address | null;
}

export function ManualShipmentForm({ open, onOpenChange, onSave, initialData }: ManualShipmentFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'Nigeria',
      region_id: '',
      save_to_book: false
    }
  });

  useEffect(() => {
    if (open) {
      loadRegions();
      if (initialData) {
        form.reset({
          full_name: initialData.full_name,
          phone: initialData.phone,
          email: initialData.email || '',
          street: initialData.street,
          city: initialData.city,
          state: initialData.state,
          zip_code: '',
          country: 'Nigeria', // Default to Nigeria if not in data, or add field to Address type later
          region_id: initialData.region_id || '',
          save_to_book: false
        });
      } else {
        form.reset({
          full_name: '',
          phone: '',
          email: user?.email || '',
          street: '',
          city: '',
          state: '',
          zip_code: '',
          country: 'Nigeria',
          region_id: '',
          save_to_book: false
        });
      }
      setStep('form');
    }
  }, [open, initialData, user]);

  const loadRegions = async () => {
    const data = await getShippingRegions();
    setRegions(data);
  };

  const onSubmit = (data: AddressFormData) => {
    setStep('review');
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    const data = form.getValues();

    try {
      let addressId = initialData?.id || `temp-${Math.random().toString(36).substr(2, 9)}`;
      
      // If "Save to Address Book" is checked, save to DB
      if (data.save_to_book && user) {
        const { data: savedAddr, error } = await supabase
          .from('user_addresses')
          .insert({
            user_id: user.id,
            full_name: data.full_name,
            phone: data.phone,
            email: data.email || null,
            street: data.street,
            city: data.city,
            state: data.state,
            region_id: data.region_id,
            label: 'Manual Entry',
            is_default: false
          })
          .select()
          .single();

        if (error) throw error;
        if (savedAddr) addressId = savedAddr.id;
        toast.success('Address saved to your address book');
      }

      const finalAddress: Address = {
        id: addressId,
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        street: data.street,
        city: data.city,
        state: data.state,
        region_id: data.region_id,
        label: 'Manual Shipment',
        is_default: false
      };

      onSave(finalAddress);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast.error('Failed to process address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0 gap-0 overflow-hidden rounded-xl transition-all duration-300 ease-in-out">
        <DialogHeader className="p-6 pb-2 space-y-2 border-b bg-muted/10">
          <DialogTitle className="text-xl md:text-2xl font-semibold tracking-tight">
            {step === 'form' ? 'Destination Details' : 'Verify Information'}
          </DialogTitle>
          <DialogDescription className="text-sm md:text-base text-muted-foreground">
            {step === 'form' 
              ? 'Enter the recipient and delivery information below.' 
              : 'Please review the details carefully before confirming.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' ? (
          <form id="shipment-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full max-h-[75vh]">
            <ScrollArea className="flex-1 px-6 py-6">
              <div className="grid gap-8">
                {/* Contact Info Section */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <h4 className="font-semibold text-base md:text-lg text-foreground">Contact Information</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-sm font-medium">Recipient Name <span className="text-destructive">*</span></Label>
                      <Input 
                        id="full_name" 
                        placeholder="e.g. John Doe" 
                        {...form.register('full_name')} 
                        className="h-11 md:h-12 text-base transition-colors focus:ring-2"
                        aria-invalid={!!form.formState.errors.full_name}
                      />
                      {form.formState.errors.full_name && (
                        <p className="text-xs text-destructive font-medium flex items-center gap-1.5 animate-in slide-in-from-left-1">
                          <AlertCircle className="h-3.5 w-3.5" /> {form.formState.errors.full_name.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Phone Number <span className="text-destructive">*</span></Label>
                      <Input 
                        id="phone" 
                        placeholder="e.g. +234 801 234 5678" 
                        {...form.register('phone')} 
                        className="h-11 md:h-12 text-base transition-colors focus:ring-2"
                        aria-invalid={!!form.formState.errors.phone}
                      />
                      <p className="text-xs text-muted-foreground">International format required (e.g., +234)</p>
                      {form.formState.errors.phone && (
                        <p className="text-xs text-destructive font-medium flex items-center gap-1.5 animate-in slide-in-from-left-1">
                          <AlertCircle className="h-3.5 w-3.5" /> {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="e.g. john@example.com" 
                        {...form.register('email')} 
                        className="h-11 md:h-12 text-base transition-colors focus:ring-2"
                      />
                      {form.formState.errors.email && (
                        <p className="text-xs text-destructive font-medium flex items-center gap-1.5 animate-in slide-in-from-left-1">
                          <AlertCircle className="h-3.5 w-3.5" /> {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Address Info Section */}
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <h4 className="font-semibold text-base md:text-lg text-foreground">Delivery Address</h4>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="street" className="text-sm font-medium">Street Address <span className="text-destructive">*</span></Label>
                      <Input 
                        id="street" 
                        placeholder="e.g. 123 Main St, Apt 4B" 
                        {...form.register('street')} 
                        className="h-11 md:h-12 text-base transition-colors focus:ring-2"
                      />
                      {form.formState.errors.street && (
                        <p className="text-xs text-destructive font-medium flex items-center gap-1.5 animate-in slide-in-from-left-1">
                          <AlertCircle className="h-3.5 w-3.5" /> {form.formState.errors.street.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-medium">City <span className="text-destructive">*</span></Label>
                        <Input 
                          id="city" 
                          placeholder="e.g. Lekki" 
                          {...form.register('city')} 
                          className="h-11 md:h-12 text-base transition-colors focus:ring-2"
                        />
                        {form.formState.errors.city && (
                          <p className="text-xs text-destructive font-medium flex items-center gap-1.5 animate-in slide-in-from-left-1">
                            <AlertCircle className="h-3.5 w-3.5" /> {form.formState.errors.city.message}
                          </p>
                        )}
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-medium">State/Province <span className="text-destructive">*</span></Label>
                        <Input 
                          id="state" 
                          placeholder="e.g. Lagos" 
                          {...form.register('state')} 
                          className="h-11 md:h-12 text-base transition-colors focus:ring-2"
                        />
                        {form.formState.errors.state && (
                          <p className="text-xs text-destructive font-medium flex items-center gap-1.5 animate-in slide-in-from-left-1">
                            <AlertCircle className="h-3.5 w-3.5" /> {form.formState.errors.state.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-sm font-medium">Country <span className="text-destructive">*</span></Label>
                        <Controller
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                            >
                              <SelectTrigger className="h-11 md:h-12 text-base focus:ring-2">
                                <SelectValue placeholder="Select Country" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Nigeria" className="h-10 cursor-pointer">Nigeria</SelectItem>
                                <SelectItem value="United States" className="h-10 cursor-pointer">United States</SelectItem>
                                <SelectItem value="United Kingdom" className="h-10 cursor-pointer">United Kingdom</SelectItem>
                                <SelectItem value="Canada" className="h-10 cursor-pointer">Canada</SelectItem>
                                <SelectItem value="Ghana" className="h-10 cursor-pointer">Ghana</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {form.formState.errors.country && (
                          <p className="text-xs text-destructive font-medium flex items-center gap-1.5 animate-in slide-in-from-left-1">
                            <AlertCircle className="h-3.5 w-3.5" /> {form.formState.errors.country.message}
                          </p>
                        )}
                      </div>
                    </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="region_id" className="text-sm font-medium">Shipping Region <span className="text-destructive">*</span></Label>
                      <Controller
                        control={form.control}
                        name="region_id"
                        render={({ field }) => (
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <SelectTrigger className="h-11 md:h-12 text-base focus:ring-2">
                              <SelectValue placeholder="Select Region for Shipping" />
                            </SelectTrigger>
                            <SelectContent>
                              {regions.map(r => (
                                <SelectItem key={r.id} value={r.id} className="h-10 cursor-pointer">{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.region_id && (
                        <p className="text-xs text-destructive font-medium flex items-center gap-1.5 animate-in slide-in-from-left-1">
                          <AlertCircle className="h-3.5 w-3.5" /> {form.formState.errors.region_id.message}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {user && (
                  <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <Checkbox 
                      id="save_to_book" 
                      checked={form.watch('save_to_book')}
                      onCheckedChange={(checked) => form.setValue('save_to_book', checked as boolean)}
                      className="mt-0.5 h-5 w-5"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label 
                        htmlFor="save_to_book" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Save to Address Book
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Save this destination for quicker checkout next time.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-6 border-t bg-muted/10 flex gap-3 justify-end mt-auto">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                type="button"
                className="h-11 md:h-12 px-6"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="shipment-form"
                className="h-11 md:h-12 px-8 font-medium"
              >
                Review Details
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                <div className="bg-muted/30 p-6 rounded-xl border border-border/50 space-y-4">
                   <h4 className="font-semibold text-lg flex items-center gap-2">
                     <span className="h-2 w-2 rounded-full bg-green-500 block" />
                     Review Destination
                   </h4>
                   
                   <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                      <div className="space-y-1">
                        <dt className="text-muted-foreground font-medium">Recipient Name</dt>
                        <dd className="font-medium text-base">{form.getValues('full_name')}</dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-muted-foreground font-medium">Phone Number</dt>
                        <dd className="font-medium text-base">{form.getValues('phone')}</dd>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <dt className="text-muted-foreground font-medium">Email</dt>
                        <dd className="font-medium text-base">{form.getValues('email') || 'N/A'}</dd>
                      </div>
                      
                      <div className="sm:col-span-2 pt-4 border-t border-border/50"></div>
                      
                      <div className="space-y-1 sm:col-span-2">
                         <dt className="text-muted-foreground font-medium">Street Address</dt>
                         <dd className="font-medium text-base">{form.getValues('street')}</dd>
                      </div>
                      <div className="space-y-1">
                         <dt className="text-muted-foreground font-medium">City</dt>
                         <dd className="font-medium text-base">{form.getValues('city')}</dd>
                      </div>
                      <div className="space-y-1">
                         <dt className="text-muted-foreground font-medium">State/Province</dt>
                         <dd className="font-medium text-base">{form.getValues('state')}</dd>
                      </div>
                      <div className="space-y-1">
                         <dt className="text-muted-foreground font-medium">Country</dt>
                         <dd className="font-medium text-base">{form.getValues('country')}</dd>
                      </div>
                      <div className="space-y-1 sm:col-span-2 pt-2">
                         <dt className="text-muted-foreground font-medium">Shipping Region</dt>
                         <dd className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {regions.find(r => r.id === form.getValues('region_id'))?.name}
                         </dd>
                      </div>
                   </dl>
                </div>
                
                <p className="text-center text-sm text-muted-foreground">
                  Please verify that all details are correct. Shipping costs will be calculated based on the selected region.
                </p>
              </div>
            </ScrollArea>

            <div className="p-6 border-t bg-muted/10 flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setStep('form')} 
                disabled={saving}
                className="h-11 md:h-12 px-6"
              >
                Back to Edit
              </Button>
              <Button 
                onClick={handleFinalSubmit} 
                disabled={saving}
                className="h-11 md:h-12 px-8 font-medium"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Destination
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
