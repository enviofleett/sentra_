import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
// sendEmail removed - emails are now sent by the webhook after payment confirmation
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AuthFormContent } from '@/pages/Auth';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const [processing, setProcessing] = useState(false);
  const [termsContent, setTermsContent] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [emailPreFilled, setEmailPreFilled] = useState(false);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
    }
  });

  useEffect(() => {
    fetchTerms();
  }, []);

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

  // If cart is empty, effect will redirect
  if (items.length === 0) {
    return null;
  }

  const onSubmit = async (data: CheckoutFormData) => {
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
        shipping_cost: 0,
        total_amount: subtotal,
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
        }
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // Generate unique payment reference
      const paymentReference = `order_${order.id}_${Date.now()}`;

      // Update order with payment reference BEFORE initiating payment
      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_reference: paymentReference })
        .eq('id', order.id);

      if (updateError) {
        console.error('Failed to save payment reference:', updateError);
        throw new Error('Failed to initialize payment. Please try again.');
      }

      // Get Paystack public key from environment
      const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      
      // Validate Paystack configuration - check for ad blockers or network issues
      // @ts-ignore - PaystackPop is loaded from script in index.html
      if (typeof window.PaystackPop === 'undefined') {
        console.error('[Checkout] PaystackPop script not loaded. Possible causes: ad blocker, network issue, or missing script tag.');
        toast({
          title: 'Payment Service Unavailable',
          description: 'The payment service could not load. This may be due to an ad blocker or network issue. Please disable ad blockers, refresh the page, and try again.',
          variant: 'destructive'
        });
        setProcessing(false);
        return;
      }
      
      if (!paystackPublicKey || paystackPublicKey === 'pk_live_YOUR_PAYSTACK_PUBLIC_KEY') {
        console.error('Paystack public key not configured or is placeholder value.');
        throw new Error('Payment service is not properly configured. Please contact support.');
      }

      // Build callback URL for Paystack redirect
      const callbackUrl = `${window.location.origin}/checkout/success?order_id=${order.id}&type=standard_order`;

      // @ts-ignore
      const handler = PaystackPop.setup({
        key: paystackPublicKey,
        email: data.email,
        amount: subtotal * 100,
        ref: paymentReference,
        callback_url: callbackUrl,
        metadata: {
          order_id: order.id,
          customer_name: data.fullName,
          type: 'standard_order'
        },
        onSuccess: (transaction: any) => {
          // SECURITY: Do NOT update database here - webhook is the single source of truth
          // Do NOT assume payment was successful - let the verification page confirm
          console.log('[Checkout] Payment popup closed with reference:', transaction.reference);
          
          toast({
            title: 'Processing payment...',
            description: 'Redirecting to verify your payment.'
          });

          // Immediately redirect to verification page - do not write to database
          navigate(`/checkout/success?order_id=${order.id}&type=standard_order`);
        },
        onCancel: () => {
          console.log('Payment cancelled');
          toast({
            title: 'Payment cancelled',
            description: 'Your order has been saved. You can complete payment later.',
            variant: 'destructive'
          });
          
          navigate('/profile/orders');
        }
      });

      handler.openIframe();
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to place order',
        variant: 'destructive'
      });
    } finally {
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

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Lagos" {...field} />
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
                    </div>

                    {termsContent && (
                      <div className="rounded-md border p-4 bg-muted/50">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {termsContent}
                        </p>
                      </div>
                    )}

                    <Button type="submit" size="lg" className="w-full" disabled={processing}>
                      {processing ? 'Processing...' : 'Place Order'}
                    </Button>
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
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.product?.name} x{item.quantity}</span>
                      <span>₦{((item.product?.price || 0) * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-secondary">FREE</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-secondary">₦{subtotal.toLocaleString()}</span>
                  </div>
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
