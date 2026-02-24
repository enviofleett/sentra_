
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AddressBook, Address } from '@/components/checkout/AddressBook';
import { ShipmentSplitter, ShipmentGroup } from '@/components/checkout/ShipmentSplitter';
import { calculateShipping } from '@/utils/shippingCalculator';
import { Loader2, ArrowRight, CreditCard, Building, AlertCircle } from 'lucide-react';

import { MIN_ORDER_UNITS } from '@/utils/constants';
import { useCheckoutPolicy } from '@/hooks/useCheckoutPolicy';
import { Badge } from '@/components/ui/badge';
import { normalizeOrderItem } from '@/utils/orderItems';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, totalItems, clearCart, taxAmount, vatRate } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { policy, loading: policyLoading, ready: policyReady } = useCheckoutPolicy();
  
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [shipments, setShipments] = useState<ShipmentGroup[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [shippingCosts, setShippingCosts] = useState<Record<string, number>>({});
  const [totalShipping, setTotalShipping] = useState(0);

  // Promo Wallet State
  const [promoData, setPromoData] = useState<any>(null);
  const [usePromo, setUsePromo] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);

  // Fetch Promo Discount Eligibility
  useEffect(() => {
    const fetchPromo = async () => {
      if (!user || items.length === 0) return;
      
      setPromoLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('calculate-promo-discount', {
            body: { items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })) },
            headers: {
                Authorization: `Bearer ${session?.access_token}`
            }
        });

        if (error) {
            console.error('Error fetching promo discount:', error);
            return;
        }

        setPromoData(data);
        // Auto-enable if user has used it before? No, let them choose.
      } catch (err) {
        console.error('Error in promo fetch:', err);
      } finally {
        setPromoLoading(false);
      }
    };
    
    fetchPromo();
  }, [user, items]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectPath = encodeURIComponent(window.location.pathname);
      navigate(`/auth?redirect=${redirectPath}`);
    }
  }, [user, authLoading, navigate]);

  const requiredMoq = policy.required_moq || MIN_ORDER_UNITS;

  // Redirect if empty or MOQ not met
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }
    
    if (user && policyReady && !policyLoading && totalItems < requiredMoq) {
      toast.error(`Minimum order quantity of ${requiredMoq} units not met`);
      navigate('/cart');
    }
  }, [items, totalItems, navigate, policyLoading, policyReady, requiredMoq, user]);

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

  const promoDiscount = usePromo && promoData ? promoData.applicable_discount : 0;

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
    if (processing) {
      return;
    }

    try {
      setProcessing(true);

      const buildAddressPayload = (address: Address) => ({
        fullName: address.full_name,
        phone: address.phone,
        address: address.street,
        city: address.city,
        state: address.state,
        country: address.country,
      });

      let masterAddress: any;

      if (mode === 'single' && selectedAddress) {
        masterAddress = buildAddressPayload(selectedAddress);
      } else if (mode === 'multi' && shipments.length > 0) {
        masterAddress = buildAddressPayload(shipments[0].address);
      } else {
        throw new Error('No shipping address selected');
      }

      const normalizedOrderItems = items.map((item) =>
        normalizeOrderItem({
          product_id: item.product_id,
          name: item.product?.name,
          quantity: item.quantity,
          price: item.product?.price,
          vendor_id: item.product?.vendor_id,
          vendor_name: item.product?.vendor?.rep_full_name,
          image_url: item.product?.image_url,
        })
      );

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
          shipping_address: masterAddress,
          billing_address: masterAddress,
          items: normalizedOrderItems,
          notes: mode === 'multi' ? 'Multi-address shipment' : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const shipmentRecords: any[] = [];

      if (mode === 'single' && selectedAddress) {
        const addressPayload = buildAddressPayload(selectedAddress);

        const shipmentItems = items.map((item) => {
          const base = normalizeOrderItem({
            product_id: item.product_id,
            name: item.product?.name,
            quantity: item.quantity,
            price: item.product?.price,
            vendor_id: item.product?.vendor_id,
            vendor_name: item.product?.vendor?.rep_full_name,
            image_url: item.product?.image_url,
          });

          return {
            ...base,
            weight: item.product?.weight || 0,
          };
        });

        shipmentRecords.push({
          order_id: order.id,
          shipping_address: addressPayload,
          items: shipmentItems,
          shipping_cost: totalShipping,
          status: 'pending',
        });
      } else if (mode === 'multi') {
        shipments.forEach((group) => {
          const addressPayload = buildAddressPayload(group.address);

          const shipmentItems = group.items.map((item) => {
            const base = normalizeOrderItem({
              product_id: item.product_id,
              name: item.name,
              quantity: item.quantity,
              price: item.product?.price,
              vendor_id: item.vendor_id ?? item.product?.vendor_id,
              vendor_name: item.product?.vendor?.rep_full_name,
              image_url: item.product?.image_url,
            });

            return {
              ...base,
              weight: item.weight || item.product?.weight || 0,
            };
          });

          shipmentRecords.push({
            order_id: order.id,
            shipping_address: addressPayload,
            items: shipmentItems,
            shipping_cost: shippingCosts[group.id] || 0,
            status: 'pending',
          });
        });
      }

      if (shipmentRecords.length > 0) {
        const { error: shipmentError } = await supabase
          .from('order_shipments')
          .insert(shipmentRecords);

        if (shipmentError) throw shipmentError;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke(
        'initialize-standard-payment',
        {
          body: {
            orderId: order.id,
            customerEmail: user!.email!,
            customerName: masterAddress.fullName,
            promoDiscount: promoDiscount,
          },
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : undefined,
        }
      );

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

      window.location.href = paymentResult.paymentUrl;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to place order');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">Checkout Policy</p>
                <p className="text-sm text-muted-foreground">
                  Minimum order: {requiredMoq} unit{requiredMoq > 1 ? 's' : ''} • Paid orders in last 30 days: {policy.paid_orders_last_30d}
                </p>
                {policy.is_influencer && !policy.influencer_moq_enabled && (
                  <p className="text-xs text-amber-700 mt-1">
                    Influencer profile is assigned, but MOQ privilege is currently disabled until admin re-enables it.
                  </p>
                )}
                {policy.is_influencer && policy.influencer_moq_enabled && policy.paid_orders_last_30d <= 4 && (
                  <p className="text-xs text-amber-700 mt-1">
                    You are at the threshold. Keep at least 4 paid orders in rolling 30 days to retain MOQ 1.
                  </p>
                )}
              </div>
              {policy.is_influencer && (
                <Badge variant="secondary">
                  {policy.influencer_moq_enabled ? 'Influencer Active' : 'Influencer Inactive'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

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

                  {/* Promo Wallet Section */}
                  {promoData && promoData.promo_balance > 0 && (
                    <div className="py-3 border-y border-dashed space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="promo-mode" className="text-sm font-medium flex items-center gap-2">
                                  <Building className="h-3 w-3 text-primary" />
                                  Use Promo Balance
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Available: ₦{promoData.promo_balance.toLocaleString()}
                                </p>
                            </div>
                            <Switch 
                                id="promo-mode" 
                                checked={usePromo} 
                                onCheckedChange={setUsePromo} 
                                disabled={promoLoading || promoData.eligible_discount <= 0}
                            />
                        </div>
                        {usePromo && (
                            <div className="flex justify-between text-sm font-medium text-green-600">
                                <span>Promo Discount ({promoData.promo_percentage}%)</span>
                                <span>-₦{promoDiscount.toLocaleString()}</span>
                            </div>
                        )}
                        {promoData.eligible_discount > 0 && !usePromo && (
                             <p className="text-xs text-muted-foreground">
                                You can save up to ₦{Math.min(promoData.eligible_discount, promoData.promo_balance).toLocaleString()} on this order based on profit sharing.
                             </p>
                        )}
                    </div>
                  )}
                  
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
                      <span>₦{(subtotal + totalShipping + taxAmount - promoDiscount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handlePlaceOrder}
                  disabled={processing || calculating || policyLoading || !policyReady || totalItems < requiredMoq}
                >
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Place Order
                </Button>
                {totalItems < requiredMoq && (
                  <div className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Add {requiredMoq - totalItems} more unit{requiredMoq - totalItems > 1 ? 's' : ''} to proceed.
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
