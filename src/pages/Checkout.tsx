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
import { sendEmail } from '@/utils/emailService';
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
    setProcessing(true);

    try {
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

      // Get Paystack public key from environment
      const paystackPublicKey = 'pk_test_xxxxxxxxxxxxxxxxxxxxxx';
      
      // @ts-ignore - PaystackPop is loaded from script in index.html
      if (typeof PaystackPop === 'undefined') {
        throw new Error('Paystack payment library not loaded. Please refresh the page.');
      }

      // @ts-ignore
      const handler = PaystackPop.setup({
        key: paystackPublicKey,
        email: data.email,
        amount: subtotal * 100,
        ref: order.id,
        metadata: {
          order_id: order.id,
          customer_name: data.fullName,
        },
        onSuccess: async (transaction: any) => {
          console.log('Payment successful:', transaction.reference);
          
          toast({
            title: 'Payment successful!',
            description: 'Processing your order...'
          });

          await sendEmail(data.email, 'ORDER_CONFIRMATION', {
            customer_name: data.fullName,
            order_id: order.id.slice(0, 8),
            total_amount: subtotal.toLocaleString()
          });

          await clearCart();
          navigate('/profile/orders');
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

      {/* Authentication Modal */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In to Checkout</DialogTitle>
            <DialogDescription>
              Please sign in or create an account to complete your purchase securely.
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
