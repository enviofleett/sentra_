
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AddressBook, Address } from '@/components/checkout/AddressBook';
import { ShipmentSplitter, ShipmentGroup } from '@/components/checkout/ShipmentSplitter';
import { calculateShipping } from '@/utils/shippingCalculator';
import { Loader2, ArrowRight, CreditCard, Building } from 'lucide-react';

import { MIN_ORDER_UNITS } from '@/utils/constants';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, totalItems, clearCart, taxAmount, vatRate } = useCart();
  const { user } = useAuth();
  
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [shipments, setShipments] = useState<ShipmentGroup[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [shippingCosts, setShippingCosts] = useState<Record<string, number>>({});
  const [totalShipping, setTotalShipping] = useState(0);

  // Redirect if empty or MOQ not met
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }
    
    if (totalItems < MIN_ORDER_UNITS) {
      toast.error(`Minimum order quantity of ${MIN_ORDER_UNITS} units not met`);
      navigate('/cart');
    }
  }, [items, totalItems, navigate]);

  // Calculate shipping when shipments change
  useEffect(() => {
    const calc = async () => {
      setCalculating(true);
      let total = 0;
      const costs: Record<string, number> = {};

      if (mode === 'single') {
        if (selectedAddress && selectedAddress.region_id) {
          // Map items to calculateShipping format
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
          const result = await calculateShipping(cartItems, selectedAddress.region_id);
          total = result.weightBasedCost;
          costs['single'] = total;
        }
      } else {
        // Multi mode
        for (const group of shipments) {
           if (!group.address.region_id) continue;
           
           // Convert group items back to CartItem format
           const groupItems = group.items.map(i => ({
             product_id: i.product_id,
             quantity: i.quantity,
             product: i.product
           }));

           // Calculate shipping with minimum product weight rule enforced for multi-address shipping
           const result = await calculateShipping(groupItems, group.address.region_id, { enforceMinPerProduct: true });
           costs[group.id] = result.weightBasedCost;
           total += result.weightBasedCost;
        }
      }

      setShippingCosts(costs);
      setTotalShipping(total);
      setCalculating(false);
    };

    calc();
  }, [mode, selectedAddress, shipments, items]);

  const handlePlaceOrder = async () => {
    if (mode === 'single' && !selectedAddress) {
      toast.error('Please select a shipping address');
      return;
    }
    if (mode === 'multi' && shipments.length === 0) {
      toast.error('Please assign items to addresses');
      return;
    }

    // Verify all items assigned in multi mode
    if (mode === 'multi') {
      const totalAssigned = shipments.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0), 0);
      const totalInCart = items.reduce((sum, i) => sum + i.quantity, 0);
      if (totalAssigned < totalInCart) {
        toast.error('Please assign all items to an address');
        return;
      }
    }

    setProcessing(true);
    try {
      // 1. Create Master Order
      const masterAddress = mode === 'single' ? selectedAddress : shipments[0].address; // Use first address as billing/primary
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user!.id,
          customer_email: user!.email!,
          status: 'pending',
          payment_status: 'pending',
          subtotal: subtotal,
          tax: taxAmount,
          shipping_cost: totalShipping,
          total_amount: subtotal + totalShipping + taxAmount,
          shipping_address: masterAddress, // Primary contact
          billing_address: masterAddress,
          items: items, // Keep full cart snapshot
          notes: mode === 'multi' ? 'Multi-address shipment' : null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Shipments
      const shipmentRecords = [];
      if (mode === 'single') {
        shipmentRecords.push({
          order_id: order.id,
          shipping_address: selectedAddress,
          items: items,
          shipping_cost: totalShipping,
          status: 'pending'
        });
      } else {
        shipments.forEach(group => {
          shipmentRecords.push({
            order_id: order.id,
            shipping_address: group.address,
            items: group.items,
            shipping_cost: shippingCosts[group.id] || 0,
            status: 'pending'
          });
        });
      }

      const { error: shipmentError } = await supabase
        .from('order_shipments')
        .insert(shipmentRecords);

      if (shipmentError) throw shipmentError;

      // 3. Handle Payment (Paystack)
      // Call initialize-standard-payment edge function
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('initialize-standard-payment', {
        body: {
          orderId: order.id,
          customerEmail: user!.email!,
          customerName: masterAddress.full_name,
          promoDiscount: 0 // We can add promo logic here later if needed
        }
      });

      if (paymentError) {
        console.error('Payment initialization error:', paymentError);
        throw new Error('Failed to initialize payment');
      }

      if (paymentResult?.error) {
        throw new Error(paymentResult.error);
      }

      if (!paymentResult?.paymentUrl) {
        throw new Error('No payment URL returned');
      }

      // Redirect to Paystack
      window.location.href = paymentResult.paymentUrl;

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to place order');
      setProcessing(false); // Only stop processing on error (redirect handles success)
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={mode} onValueChange={(v: any) => setMode(v)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Ship to Single Address</TabsTrigger>
                <TabsTrigger value="multi">Ship to Multiple Addresses</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AddressBook 
                      selectedAddressId={selectedAddress?.id} 
                      onSelect={setSelectedAddress} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="multi" className="space-y-4 mt-4">
                <ShipmentSplitter 
                  items={items} 
                  onShipmentsChange={setShipments} 
                />
              </TabsContent>
            </Tabs>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Select how you want to pay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {/* PAYMENT_GATEWAY_CONFIG: Paystack (Exclusive) - Do not add other gateways without authorization */}
                 <div className="flex items-center gap-4 p-4 border rounded-lg bg-accent/5 border-primary">
                    <CreditCard className="h-6 w-6 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Pay with Card</p>
                      <p className="text-sm text-muted-foreground">Secure payment via Paystack</p>
                    </div>
                    <div className="h-4 w-4 rounded-full bg-primary" />
                 </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                    <span>₦{taxAmount.toLocaleString()}</span>
                  </div>
                  
                  {mode === 'single' ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>
                        {calculating ? <Loader2 className="h-3 w-3 animate-spin inline" /> : `₦${totalShipping.toLocaleString()}`}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between font-medium">
                        <span>Total Shipping</span>
                        <span>
                          {calculating ? <Loader2 className="h-3 w-3 animate-spin inline" /> : `₦${totalShipping.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-2 border-l-2">
                        {shipments.map((g, i) => (
                          <div key={g.id} className="flex justify-between">
                            <span>Shipment {i+1} ({g.address.city})</span>
                            <span>₦{(shippingCosts[g.id] || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>₦{(subtotal + totalShipping + taxAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handlePlaceOrder}
                  disabled={processing || calculating}
                >
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Place Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
