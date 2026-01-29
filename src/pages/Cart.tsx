import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMembership } from '@/hooks/useMembership';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AuthFormContent } from '@/pages/Auth';
import { Phone, Wallet, CreditCard, Loader2, Truck, Clock, MapPin, Gift, AlertCircle, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { calculateShipping, ShippingCalculationResult, getShippingRegions } from '@/utils/shippingCalculator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useCartIncentive } from '@/hooks/useCartIncentive';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  state: z.string().min(2, 'State is required'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function Cart() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, clearCart, totalItems, updateQuantity, removeFromCart } = useCart();
  const { isMember, balance, isEnabled: membershipEnabled, refetch: refetchMembership } = useMembership();
  
  // Cart Incentive Hook
  const {
    nextThreshold,
    amountToNext,
    itemsToNext,
    progressPercentage,
    unlockedThreshold
  } = useCartIncentive(subtotal, totalItems);

  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'membership'>('paystack');
  const [termsContent, setTermsContent] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [emailPreFilled, setEmailPreFilled] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  
  // Shipping calculation state
  const [shippingData, setShippingData] = useState<ShippingCalculationResult | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingRegions, setShippingRegions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  
  // Promo discount state
  interface PromoCalculation {
    eligible_discount: number;
    applicable_discount: number;
    promo_balance: number;
    promo_percentage: number;
    breakdown: Array<{
      product_id: string;
      name: string;
      gross_margin: number;
      max_discount: number;
    }>;
  }
  const [promoData, setPromoData] = useState<PromoCalculation | null>(null);
  const [calculatingPromo, setCalculatingPromo] = useState(false);

  // MOQ Validation Logic - tracks per-vendor quantities
  const vendorMoqData = useMemo(() => {
    const vendorGroups: Record<string, {
      name: string;
      moq: number;
      count: number;
      needed: number;
      met: boolean;
    }> = {};

    // Group items by vendor
    items.forEach(item => {
      const vendor = item.product?.vendor;
      const vendorId = item.product?.vendor_id;
      
      // Use vendor object if available, otherwise try to get vendor_id
      if (vendor && vendor.id) {
        if (!vendorGroups[vendor.id]) {
          vendorGroups[vendor.id] = {
            name: vendor.rep_full_name || 'Unknown Vendor',
            moq: Math.max(1, vendor.min_order_quantity || 1),
            count: 0,
            needed: 0,
            met: true
          };
        }
        vendorGroups[vendor.id].count += item.quantity;
      } else if (vendorId) {
        // Fallback: if we have vendor_id but no vendor object, still track it
        if (!vendorGroups[vendorId]) {
          vendorGroups[vendorId] = {
            name: 'Unknown Vendor',
            moq: 1, // Default to 1 if we can't get MOQ
            count: 0,
            needed: 0,
            met: true
          };
        }
        vendorGroups[vendorId].count += item.quantity;
      }
    });

    // Calculate needed items for each vendor
    Object.keys(vendorGroups).forEach(vendorId => {
      const group = vendorGroups[vendorId];
      if (group.count < group.moq) {
        group.needed = group.moq - group.count;
        group.met = false;
      }
    });

    // Build errors array for checkout blocking
    // Only show errors for vendors with MOQ > 1 that aren't met
    const errors = Object.values(vendorGroups)
      .filter(g => !g.met && g.moq > 1)
      .map(g => ({
        vendorName: g.name,
        needed: g.needed,
        moq: g.moq
      }));
    
    return {
      groups: vendorGroups,
      errors,
      canCheckout: errors.length === 0
    };
  }, [items]);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      state: '',
    }
  });

  useEffect(() => {
    fetchTerms();
    loadShippingRegions();
  }, []);

  const loadShippingRegions = async () => {
    const regions = await getShippingRegions();
    setShippingRegions(regions);
  };

  // Calculate shipping when cart items or region changes
  useEffect(() => {
    const fetchShipping = async () => {
      if (items.length === 0) {
        setShippingData(null);
        return;
      }
      
      setCalculatingShipping(true);
      try {
        // Map cart items to format expected by calculateShipping
        const cartItems = items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          product: item.product ? {
            id: item.product_id,
            name: item.product.name,
            weight: item.product.weight,
            size: item.product.size,
            vendor_id: item.product.vendor_id || undefined
          } : undefined
        }));
        
        const result = await calculateShipping(cartItems, selectedRegionId || undefined);
        setShippingData(result);
      } catch (error) {
        console.error('Failed to calculate shipping:', error);
        toast({
          title: 'Shipping Calculation Error',
          description: 'Failed to calculate shipping costs. Please try again.',
          variant: 'destructive'
        });
        setShippingData(null);
      } finally {
        setCalculatingShipping(false);
      }
    };
    
    fetchShipping();
  }, [items, selectedRegionId]);

  // Calculate promo discount when cart items change
  useEffect(() => {
    const fetchPromoDiscount = async () => {
      if (!user || items.length === 0) {
        setPromoData(null);
        return;
      }
      
      setCalculatingPromo(true);
      try {
        const { data, error } = await supabase.functions.invoke('calculate-promo-discount', {
          body: { items: items.map(item => ({ product_id: item.product_id, quantity: item.quantity })) }
        });
        
        if (error) {
          console.error('Promo calculation error:', error);
          setPromoData(null);
        } else {
          setPromoData(data);
        }
      } catch (error) {
        console.error('Failed to calculate promo discount:', error);
        setPromoData(null);
      } finally {
        setCalculatingPromo(false);
      }
    };
    
    fetchPromoDiscount();
  }, [user, items]);

  const fetchTerms = async () => {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'terms_and_conditions')
      .maybeSingle();
    
    if (data?.value && typeof data.value === 'object' && 'content' in data.value) {
      setTermsContent(data.value.content as string);
    }
  };

  // Check user profile for missing phone number and pre-populate region
  useEffect(() => {
    const checkProfile = async () => {
      if (!user || profileChecked) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, full_name, default_shipping_address')
        .eq('id', user.id)
        .maybeSingle();
      
      setProfileChecked(true);
      
      // Pre-fill form with profile data
      if (profile?.full_name) {
        form.setValue('fullName', profile.full_name);
      }
      if (profile?.phone) {
        form.setValue('phone', profile.phone);
      } else {
        // Show phone modal if no phone number
        setIsPhoneModalOpen(true);
      }
      
      // Pre-populate shipping address and region from saved default
      const savedAddress = profile?.default_shipping_address as { 
        street?: string; city?: string; state?: string; region_id?: string 
      } | null;
      
      if (savedAddress) {
        if (savedAddress.street) {
          form.setValue('address', savedAddress.street);
        }
        if (savedAddress.city) {
          form.setValue('city', savedAddress.city);
        }
        if (savedAddress.state) {
          form.setValue('state', savedAddress.state);
        }
        // Pre-select the saved region for shipping calculation
        if (savedAddress.region_id && shippingRegions.length > 0) {
          const regionExists = shippingRegions.some(r => r.id === savedAddress.region_id);
          if (regionExists) {
            setSelectedRegionId(savedAddress.region_id);
          }
        }
      }
    };
    
    if (user && !authLoading) {
      checkProfile();
    }
  }, [user, authLoading, profileChecked, form, shippingRegions]);

  // Handle cart empty check
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  // Handle authentication modal
  useEffect(() => {
    if (!authLoading && !user) {
      setIsAuthModalOpen(true);
    }
  }, [authLoading, user]);

  // Smart email pre-fill (only once when user logs in)
  useEffect(() => {
    if (user?.email && !emailPreFilled) {
      form.setValue('email', user.email);
      setEmailPreFilled(true);
    }
  }, [user, emailPreFilled, form]);

  // Save phone number to profile
  const handleSavePhone = async () => {
    if (!phoneInput || phoneInput.length < 10) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number (at least 10 digits)',
        variant: 'destructive'
      });
      return;
    }

    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone: phoneInput })
        .eq('id', user!.id);

      if (error) throw error;

      form.setValue('phone', phoneInput);
      setIsPhoneModalOpen(false);
      toast({
        title: 'Phone number saved',
        description: 'Your phone number has been added to your profile.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save phone number',
        variant: 'destructive'
      });
    } finally {
      setSavingPhone(false);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    toast({
      title: 'Welcome!',
      description: 'You can now complete your checkout.',
    });
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // If cart is empty, show empty state
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center space-y-6">
            <ShoppingBag className="h-24 w-24 mx-auto text-muted-foreground/50" />
            <h2 className="text-3xl font-bold">Your cart is empty</h2>
            <p className="text-muted-foreground">Add some fragrances to get started</p>
            <Button asChild size="lg">
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  const shippingCost = shippingData?.weightBasedCost || 0;
  const promoDiscount = promoData?.applicable_discount || 0;
  const totalBeforePromo = subtotal + shippingCost;
  const totalAmount = Math.max(0, totalBeforePromo - promoDiscount);
  const canPayWithMembership = membershipEnabled && isMember && balance >= totalAmount;

  const handleMembershipPayment = async (data: CheckoutFormData) => {
    // Verify session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }

    // --- BEGIN VALIDATION CHECKS BEFORE ORDER CREATION ---
    
    // 1. Global minimum order validation (4 units)
    if (totalItems < 4) {
      toast({
        title: 'Minimum Order Required',
        description: `You need a minimum of 4 items to proceed. You currently have ${totalItems} item${totalItems !== 1 ? 's' : ''}. Please add ${4 - totalItems} more item${4 - totalItems > 1 ? 's' : ''} to your cart.`,
        variant: 'destructive'
      });
      return;
    }
    
    // 2. Shipping region validation
    if (!selectedRegionId) {
      toast({
        title: 'Shipping Region Required',
        description: 'Please select a delivery region to calculate shipping costs.',
        variant: 'destructive'
      });
      return;
    }

    // 3. Shipping calculation validation
    if (calculatingShipping) {
      toast({
        title: 'Shipping Calculation In Progress',
        description: 'Please wait for shipping calculation to complete before proceeding.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!shippingData) {
      toast({
        title: 'Shipping Calculation Required',
        description: 'Shipping costs could not be calculated. Please try selecting the region again or refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    // 4. MOQ validation
    if (!vendorMoqData.canCheckout) {
      const moqErrors = vendorMoqData.errors.map(e => 
        `${e.vendorName}: need ${e.needed} more item(s) to meet minimum of ${e.moq}`
      ).join('; ');
      toast({
        title: 'Minimum Order Quantity Not Met',
        description: moqErrors,
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);

    try {
      // Stock check
      const productIds = items.map(item => item.product_id);
      const { data: productsInStock, error: stockError } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .in('id', productIds);

      if (stockError) throw new Error("Could not verify stock. Please try again.");

      const outOfStockItems: string[] = [];
      for (const item of items) {
        const dbProduct = productsInStock.find(p => p.id === item.product_id);
        if (!dbProduct || dbProduct.stock_quantity < item.quantity) {
          outOfStockItems.push(item.product?.name || 'An item');
        }
      }

      if (outOfStockItems.length > 0) {
        toast({
          title: 'Stock Error',
          description: `One or more items are out of stock: ${outOfStockItems.join(', ')}`,
          variant: 'destructive'
        });
        setProcessing(false);
        return;
      }

      // Call pay-with-membership edge function
      const { data: result, error } = await supabase.functions.invoke('pay-with-membership', {
        body: {
          orderData: {
            items: items.map(item => ({
              product_id: item.product_id,
              name: item.product?.name,
              price: item.product?.price,
              quantity: item.quantity,
              vendor_id: item.product?.vendor_id
            })),
            subtotal: subtotal,
            tax: 0,
            shipping_cost: shippingCost,
            total_amount: totalBeforePromo,
            shipping_address: {
              fullName: data.fullName,
              phone: data.phone,
              address: data.address,
              city: data.city,
              state: data.state,
            },
            customer_email: data.email,
            notes: shippingData?.consolidatedSchedule ? `Delivery: ${shippingData.consolidatedSchedule}` : null
          },
          cartTotal: totalBeforePromo,
          promoDiscount: promoDiscount
        }
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      // Success - clear cart and redirect
      clearCart();
      refetchMembership();
      
      toast({
        title: 'Order Placed!',
        description: 'Your order has been paid with your membership credit.',
      });

      navigate(`/checkout/success?order_id=${result.order_id}&type=membership_payment`);
    } catch (error: any) {
      console.error('Membership payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process membership payment',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    // If paying with membership credit
    if (paymentMethod === 'membership') {
      return handleMembershipPayment(data);
    }

    // Verify session is still valid
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAuthModalOpen(true);
      toast({
        title: 'Session Expired',
        description: 'Please sign in again to complete your order.',
        variant: 'destructive'
      });
      return;
    }

    // --- BEGIN VALIDATION CHECKS BEFORE ORDER CREATION ---
    
    // 1. Global minimum order validation (4 units)
    if (totalItems < 4) {
      toast({
        title: 'Minimum Order Required',
        description: `You need a minimum of 4 items to proceed. You currently have ${totalItems} item${totalItems !== 1 ? 's' : ''}. Please add ${4 - totalItems} more item${4 - totalItems > 1 ? 's' : ''} to your cart.`,
        variant: 'destructive'
      });
      return;
    }
    
    // 2. Shipping region validation
    if (!selectedRegionId) {
      toast({
        title: 'Shipping Region Required',
        description: 'Please select a delivery region to calculate shipping costs.',
        variant: 'destructive'
      });
      return;
    }

    // 3. Shipping calculation validation
    if (calculatingShipping) {
      toast({
        title: 'Shipping Calculation In Progress',
        description: 'Please wait for shipping calculation to complete before proceeding.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!shippingData) {
      toast({
        title: 'Shipping Calculation Required',
        description: 'Shipping costs could not be calculated. Please try selecting the region again or refresh the page.',
        variant: 'destructive'
      });
      return;
    }

    // 4. MOQ validation
    if (!vendorMoqData.canCheckout) {
      const moqErrors = vendorMoqData.errors.map(e => 
        `${e.vendorName}: need ${e.needed} more item(s) to meet minimum of ${e.moq}`
      ).join('; ');
      toast({
        title: 'Minimum Order Quantity Not Met',
        description: moqErrors,
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);

    try {
      // --- BEGIN STOCK CHECK ---
      const productIds = items.map(item => item.product_id);
      const { data: productsInStock, error: stockError } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .in('id', productIds);

      if (stockError) throw new Error("Could not verify stock. Please try again.");

      const outOfStockItems: string[] = [];
      for (const item of items) {
        const dbProduct = productsInStock.find(p => p.id === item.product_id);
        if (!dbProduct || dbProduct.stock_quantity < item.quantity) {
          outOfStockItems.push(item.product?.name || 'An item');
        }
      }

      if (outOfStockItems.length > 0) {
        toast({
          title: 'Stock Error',
          description: `One or more items are out of stock: ${outOfStockItems.join(', ')}`,
          variant: 'destructive'
        });
        setProcessing(false);
        return;
      }
      // --- END STOCK CHECK ---

      // Create order
      const orderData = {
        user_id: user!.id,
        customer_email: data.email,
        status: 'pending' as const,
        items: items.map(item => ({
          product_id: item.product_id,
          name: item.product?.name,
          price: item.product?.price,
          quantity: item.quantity,
          vendor_id: item.product?.vendor_id
        })),
        subtotal: subtotal,
        tax: 0,
        shipping_cost: shippingCost,
        total_amount: totalAmount,
        shipping_address: {
          fullName: data.fullName,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
        },
        billing_address: {
          fullName: data.fullName,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
        },
        notes: shippingData?.consolidatedSchedule ? `Delivery: ${shippingData.consolidatedSchedule}` : null
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      console.log('[Checkout] Order created:', order.id);

      // Use server-side payment initialization for reliable redirect-based checkout
      // This eliminates popup blockers and ensures consistent callback URL
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('initialize-standard-payment', {
        body: {
          orderId: order.id,
          customerEmail: data.email,
          customerName: data.fullName,
          promoDiscount: promoDiscount
        }
      });

      if (paymentError) {
        console.error('[Checkout] Payment initialization error:', paymentError);
        throw new Error('Failed to initialize payment. Please try again.');
      }

      // Check if order was fully paid with promo credit
      if (paymentResult?.success && paymentResult?.paymentUrl === null) {
        // Order fully covered by promo credit
        clearCart();
        toast({
          title: 'Order Placed!',
          description: 'Your order has been paid with your promo credit.',
        });
        navigate(`/checkout/success?order_id=${order.id}&type=promo_payment`);
        return;
      }

      if (!paymentResult?.paymentUrl) {
        console.error('[Checkout] No payment URL returned:', paymentResult);
        throw new Error(paymentResult?.error || 'Payment service unavailable. Please try again.');
      }

      console.log('[Checkout] Redirecting to Paystack:', paymentResult.paymentUrl);

      // Show processing toast before redirect
      toast({
        title: 'Redirecting to Payment...',
        description: 'You will be redirected to complete your payment securely.',
      });

      // Small delay to allow toast to show, then redirect to Paystack
      setTimeout(() => {
        window.location.href = paymentResult.paymentUrl;
      }, 500);

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to place order',
        variant: 'destructive'
      });
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Authentication Modal - NON-DISMISSIBLE */}
      <Dialog open={isAuthModalOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Sign In to Checkout</DialogTitle>
            <DialogDescription>
              Please sign in or create an account to complete your purchase securely.
              <span className="block mt-2 text-xs text-muted-foreground">
                Your cart will be saved and ready when you return.
              </span>
            </DialogDescription>
          </DialogHeader>
          <AuthFormContent 
            onSuccess={handleAuthSuccess}
            navigate={navigate}
          />
        </DialogContent>
      </Dialog>

      {/* Phone Number Modal - Required for waitlist users */}
      <Dialog open={isPhoneModalOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Phone Number Required
            </DialogTitle>
            <DialogDescription>
              Please add your phone number to continue with checkout. This is required for delivery coordination.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="tel"
              placeholder="+234 800 000 0000"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="text-lg"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleSavePhone}
              disabled={savingPhone || phoneInput.length < 10}
              className="w-full"
            >
              {savingPhone ? 'Saving...' : 'Save & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>



        {/* MOQ Validation Errors */}
        {vendorMoqData.errors.length > 0 && (
          <div className="mb-6 space-y-3">
            {vendorMoqData.errors.map((error, idx) => (
              <Alert key={idx} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Minimum Order Not Met</AlertTitle>
                <AlertDescription>
                  You need <strong>{error.needed} more item{error.needed > 1 ? 's' : ''}</strong> from <strong>{error.vendorName}</strong> to meet the minimum order of {error.moq}.
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Cart Incentive Progress Bar */}
        {nextThreshold && (
          <div className="mb-8 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                {nextThreshold.type === 'value'
                  ? `Add ₦${amountToNext.toLocaleString()} more to unlock ${nextThreshold.discount_type === 'percentage' ? `${nextThreshold.discount_value}% OFF` : `₦${nextThreshold.discount_value} OFF`}!`
                  : `Add ${itemsToNext} more item${itemsToNext > 1 ? 's' : ''} to unlock ${nextThreshold.discount_type === 'percentage' ? `${nextThreshold.discount_value}% OFF` : `₦${nextThreshold.discount_value} OFF`}!`
                }
              </p>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {Math.round(progressPercentage)}% to next reward
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+234 800 000 0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main Street" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="Lagos State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Shipping Region Selection - REQUIRED */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Delivery Region <span className="text-destructive font-bold">*</span>
                        <span className="text-xs text-muted-foreground font-normal">(Required)</span>
                      </Label>
                      <Select value={selectedRegionId} onValueChange={setSelectedRegionId} required>
                        <SelectTrigger className={!selectedRegionId ? 'border-destructive border-2' : 'border-green-500 border-2'}>
                          <SelectValue placeholder="Select your delivery region (required)" />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingRegions.map((region) => (
                            <SelectItem key={region.id} value={region.id}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!selectedRegionId && (
                        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                          <AlertCircle className="h-3 w-3" />
                          <span className="font-medium">Please select a delivery region to calculate shipping costs and continue checkout</span>
                        </div>
                      )}
                      {selectedRegionId && !calculatingShipping && shippingData && (
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-800">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span>Shipping cost calculated: ₦{shippingCost.toLocaleString()}</span>
                        </div>
                      )}
                      {selectedRegionId && calculatingShipping && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Calculating shipping for selected region...</span>
                        </div>
                      )}
                    </div>

                    {/* MOQ Validation Warnings - Always show prominently */}
                    {vendorMoqData.errors.length > 0 && (
                      <div className="space-y-3 border-2 border-destructive rounded-lg p-4 bg-destructive/10">
                        <div className="flex items-center gap-2 text-destructive font-semibold">
                          <AlertCircle className="h-5 w-5" />
                          <span>Minimum Order Quantity (MOQ) Not Met</span>
                        </div>
                        <div className="space-y-2">
                          {vendorMoqData.errors.map((error, idx) => (
                            <Alert key={idx} variant="destructive" className="border-destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle className="font-semibold">Action Required</AlertTitle>
                              <AlertDescription className="font-medium">
                                You need <strong className="text-destructive">{error.needed} more item{error.needed > 1 ? 's' : ''}</strong> from <strong>{error.vendorName}</strong> to meet the minimum order quantity of <strong>{error.moq}</strong>.
                                <span className="block mt-1 text-sm font-normal">
                                  Please add more items from this vendor to your cart to proceed with checkout.
                                </span>
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* MOQ Status - Show even when met for transparency */}
                    {vendorMoqData.errors.length === 0 && vendorMoqData.groups && Object.keys(vendorMoqData.groups).length > 0 && (
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="font-medium">All minimum order quantities (MOQ) are met</span>
                        </div>
                      </div>
                    )}



                    {/* Payment Method Selection */}
                    {membershipEnabled && user && (
                      <div className="space-y-3">
                        <FormLabel>Payment Method</FormLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Paystack Option */}
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('paystack')}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              paymentMethod === 'paystack'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">Pay with Card</p>
                                <p className="text-xs text-muted-foreground">Paystack secure payment</p>
                              </div>
                            </div>
                          </button>

                          {/* Membership Wallet Option */}
                          <button
                            type="button"
                            onClick={() => canPayWithMembership && setPaymentMethod('membership')}
                            disabled={!canPayWithMembership}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                              paymentMethod === 'membership'
                                ? 'border-primary bg-primary/5'
                                : canPayWithMembership
                                  ? 'border-border hover:border-primary/50'
                                  : 'border-border opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Wallet className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">Membership Credit</p>
                                <p className="text-xs text-muted-foreground">
                                  Balance: ₦{balance.toLocaleString()}
                                  {!canPayWithMembership && balance < subtotal && (
                                    <span className="text-destructive ml-1">(Insufficient)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Validation Status Messages */}
                    {(!selectedRegionId || calculatingShipping || !vendorMoqData.canCheckout) && (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="text-sm font-medium text-foreground">Checkout Requirements:</div>
                        <div className="space-y-1 text-xs">
                          {!selectedRegionId && (
                            <div className="flex items-center gap-2 text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              <span>Please select a delivery region</span>
                            </div>
                          )}
                          {calculatingShipping && (
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Calculating shipping costs...</span>
                            </div>
                          )}
                          {!vendorMoqData.canCheckout && (
                            <div className="flex items-center gap-2 text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              <span>Minimum order quantities not met (see warnings above)</span>
                            </div>
                          )}
                          {selectedRegionId && !calculatingShipping && vendorMoqData.canCheckout && (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span>All requirements met - ready to checkout</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    

                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {items.map(item => (
                    <div key={item.id} className="flex flex-col gap-2 py-3 border-b last:border-0">
                      <div className="flex justify-between items-start">
                         <span className="font-medium text-sm flex-1 mr-2">{item.product?.name}</span>
                         <span className="font-semibold text-sm">₦{((item.product?.price || 0) * item.quantity).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 bg-muted/30 rounded-md p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateQuantity(item.id, item.quantity - 1);
                              } else {
                                removeFromCart(item.id);
                              }
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs w-6 text-center font-medium">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={item.product?.stock_quantity !== undefined && item.quantity >= item.product.stock_quantity}
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      Shipping
                    </span>
                    {calculatingShipping ? (
                      <span className="text-muted-foreground text-sm">Calculating...</span>
                    ) : !selectedRegionId ? (
                      <span className="text-muted-foreground text-sm italic">Select region</span>
                    ) : shippingCost > 0 ? (
                      <span>₦{shippingCost.toLocaleString()}</span>
                    ) : (
                      <span className="text-secondary font-medium">FREE</span>
                    )}
                  </div>
                  
                  {/* Promo Credit Applied */}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between items-center text-secondary">
                      <span className="flex items-center gap-1">
                        <Gift className="h-4 w-4" />
                        Promo Credit
                      </span>
                      <span className="font-medium">-₦{promoDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {/* Promo credit info when user has balance but it's calculating */}
                  {calculatingPromo && (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gift className="h-4 w-4" />
                        Promo Credit
                      </span>
                      <span className="text-sm">Calculating...</span>
                    </div>
                  )}
                  
                  {/* Show promo balance info if user has promo but none applicable */}
                  {!calculatingPromo && promoData && promoData.promo_balance > 0 && promoDiscount === 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      <span className="flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        You have ₦{promoData.promo_balance.toLocaleString()} in promo credits
                      </span>
                      <span className="block mt-1">
                        (Not applicable to items in your cart)
                      </span>
                    </div>
                  )}
                  
                  {/* Shipping Breakdown - Always show when region is selected */}
                  {selectedRegionId ? (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span>Shipping Breakdown</span>
                      </div>
                      {calculatingShipping ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Calculating shipping breakdown...
                        </div>
                      ) : shippingData && shippingData.hasLocationBasedPricing && shippingData.vendorBreakdown.length > 0 ? (
                        <div className="space-y-2">
                          {shippingData.vendorBreakdown.map((breakdown, index) => {
                            const hasRoute = breakdown.shippingCost > 0 || breakdown.estimatedDays;
                            return (
                              <div key={index} className="text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground truncate max-w-[140px]">
                                    {breakdown.vendorName}
                                  </span>
                                  <span className="font-medium">
                                    {hasRoute ? `₦${breakdown.shippingCost.toLocaleString()}` : 'No route'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-muted-foreground mt-0.5">
                                  <span>{breakdown.vendorRegionName || 'Unknown'} → Your Region</span>
                                  <span>{breakdown.totalWeight.toFixed(2)}kg</span>
                                </div>
                                {breakdown.estimatedDays ? (
                                  <span className="text-xs text-primary">{breakdown.estimatedDays} days</span>
                                ) : !hasRoute && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400">
                                    Shipping will be calculated at checkout
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : shippingData ? (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Shipping cost calculated based on total weight: {shippingData.totalWeight.toFixed(2)}kg</p>
                          {shippingData.hasLocationBasedPricing && shippingData.vendorBreakdown.length === 0 && (
                            <p className="text-amber-600 dark:text-amber-400">
                              Vendor-specific routes not available. Using standard shipping rates.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Waiting for shipping calculation...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                        <AlertCircle className="h-4 w-4" />
                        <span>Select a delivery region above to see shipping breakdown</span>
                      </div>
                    </div>
                  )}

                  {/* Vendor Delivery Schedules */}
                  {shippingData?.hasVendorRules && shippingData.vendorSchedules.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                        <Clock className="h-4 w-4" />
                        Shipping Schedule
                      </div>
                      <div className="space-y-1">
                        {shippingData.vendorSchedules.map((vs, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                            <span>{vs.vendorName}</span>
                            <span className="font-medium text-foreground">{vs.schedule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                      <Truck className="h-4 w-4" />
                      Shipping Instructions
                    </div>
                    <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                      As soon as your shipment is processed by GIG Logistics, you will get a waybill number to track your order. Please note the shipping schedules are exclusively managed by GIG Logistics.
                    </p>
                  </div>

                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">₦{totalAmount.toLocaleString()}</span>
                  </div>
                  
                  {/* Show savings if promo applied */}
                  {promoDiscount > 0 && (
                    <div className="text-xs text-secondary text-center">
                      You're saving ₦{promoDiscount.toLocaleString()} with promo credit!
                    </div>
                  )}

                   {/* Validation Status Messages */}
                    {(!selectedRegionId || calculatingShipping || !vendorMoqData.canCheckout) && (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border mt-4">
                        <div className="text-sm font-medium text-foreground">Checkout Requirements:</div>
                        <div className="space-y-1 text-xs">
                          {!selectedRegionId && (
                            <div className="flex items-center gap-2 text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              <span>Please select a delivery region</span>
                            </div>
                          )}
                          {calculatingShipping && (
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Calculating shipping costs...</span>
                            </div>
                          )}
                          {!vendorMoqData.canCheckout && (
                            <div className="flex items-center gap-2 text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              <span>Minimum order quantities not met (see warnings above)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  <Button 
                      type="submit"
                      form="checkout-form"
                      size="lg" 
                      className="w-full mt-6" 
                      disabled={processing || calculatingShipping || !vendorMoqData.canCheckout || !selectedRegionId}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : !selectedRegionId ? (
                        <>
                          <MapPin className="mr-2 h-4 w-4" />
                          Select Region
                        </>
                      ) : calculatingShipping ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Calculating...
                        </>
                      ) : !vendorMoqData.canCheckout ? (
                        <>
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Fix MOQ Issues
                        </>
                      ) : paymentMethod === 'membership' ? (
                        <>
                          <Wallet className="mr-2 h-4 w-4" />
                          Pay ₦{totalAmount.toLocaleString()}
                        </>
                      ) : (
                        `Place Order - ₦${totalAmount.toLocaleString()}`
                      )}
                    </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
