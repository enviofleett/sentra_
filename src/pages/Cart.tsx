import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { useCartIncentive } from '@/hooks/useCartIncentive';
import { calculateShipping, ShippingCalculationResult, getShippingRegions } from '@/utils/shippingCalculator';
import { Minus, Plus, Trash2, ShoppingBag, Gift, Truck, Clock, Loader2, MapPin } from 'lucide-react';

interface ShippingRegion {
  id: string;
  name: string;
}

export default function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();
  const [shippingData, setShippingData] = useState<ShippingCalculationResult | null>(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [regions, setRegions] = useState<ShippingRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [loadingRegions, setLoadingRegions] = useState(true);
  
  // Hook must be called before any conditional returns
  const { nextThreshold, amountToNext, itemsToNext, progressPercentage, unlockedThreshold } = useCartIncentive(subtotal, totalItems);

  // Fetch shipping regions on mount
  useEffect(() => {
    const fetchRegions = async () => {
      setLoadingRegions(true);
      const data = await getShippingRegions();
      setRegions(data);
      setLoadingRegions(false);
    };
    fetchRegions();
  }, []);

  // Calculate shipping when items or selected region changes
  useEffect(() => {
    const calculateShippingCost = async () => {
      if (items.length === 0) {
        setShippingData(null);
        return;
      }

      setCalculatingShipping(true);
      try {
        const cartItems = items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          product: item.product ? {
            id: item.product_id,
            name: item.product.name,
            weight: (item.product as Record<string, unknown>).weight as number | undefined,
            size: (item.product as Record<string, unknown>).size as string | undefined,
            vendor_id: item.product.vendor_id
          } : undefined
        }));
        const result = await calculateShipping(cartItems, selectedRegionId || undefined);
        setShippingData(result);
      } catch (error) {
        console.error('Error calculating shipping:', error);
      } finally {
        setCalculatingShipping(false);
      }
    };

    calculateShippingCost();
  }, [items, selectedRegionId]);

  const shippingCost = shippingData?.weightBasedCost || 0;
  const estimatedTotal = subtotal + shippingCost;

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8">Shopping Cart</h1>

        {/* Cart Incentive Progress Bar */}
        {nextThreshold && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-800">
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

        {/* Show unlocked discount */}
        {unlockedThreshold && !nextThreshold && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-300 dark:border-green-700">
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                🎉 You've unlocked {unlockedThreshold.discount_type === 'percentage' ? `${unlockedThreshold.discount_value}% OFF` : `₦${unlockedThreshold.discount_value} OFF`}!
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="w-full sm:w-24 h-48 sm:h-24 bg-accent rounded-lg overflow-hidden flex-shrink-0">
                      {item.product?.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${item.product_id}`}
                        className="font-semibold text-base sm:text-lg hover:text-secondary transition-smooth block truncate"
                      >
                        {item.product?.name}
                      </Link>
                      <p className="text-secondary font-bold mt-1 text-lg sm:text-xl">
                        ₦{(item.product?.price || 0).toLocaleString()}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= (item.product?.stock_quantity || 0)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="text-right sm:self-start">
                      <p className="font-bold text-base sm:text-lg">
                        ₦{((item.product?.price || 0) * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-24">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-xl font-bold">Order Summary</h3>

                {/* Region Selector for Shipping Estimate */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Delivery Region
                  </Label>
                  <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingRegions ? "Loading regions..." : "Select your region"} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map(region => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedRegionId && (
                    <p className="text-xs text-muted-foreground">
                      Select your region for accurate shipping estimate
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                    <span className="font-medium">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      Shipping
                    </span>
                    {calculatingShipping ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Calculating...
                      </span>
                    ) : !selectedRegionId ? (
                      <span className="text-muted-foreground text-xs">Select region above</span>
                    ) : shippingCost === 0 ? (
                      <span className="font-medium text-green-600 dark:text-green-400">FREE</span>
                    ) : (
                      <span className="font-medium">₦{shippingCost.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Vendor Breakdown with Location-Based Pricing */}
                {shippingData && shippingData.hasLocationBasedPricing && shippingData.vendorBreakdown.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>Shipping Breakdown</span>
                    </div>
                    <div className="space-y-2">
                      {shippingData.vendorBreakdown.map((breakdown, index) => (
                        <div key={index} className="text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground truncate max-w-[140px]">
                              {breakdown.vendorName}
                            </span>
                            <span className="font-medium">
                              ₦{breakdown.shippingCost.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground mt-0.5">
                            <span>{breakdown.vendorRegionName || 'Unknown'} → Your Region</span>
                            <span>{breakdown.totalWeight.toFixed(2)}kg</span>
                          </div>
                          {breakdown.estimatedDays && (
                            <span className="text-xs text-primary">{breakdown.estimatedDays}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vendor Delivery Schedules (MOQ-based) */}
                {shippingData && shippingData.vendorSchedules.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Estimated Delivery</span>
                    </div>
                    <div className="space-y-1.5">
                      {shippingData.vendorSchedules.map((schedule, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-[120px]">
                            {schedule.vendorName}
                          </span>
                          <span className="font-medium text-foreground">
                            {schedule.schedule}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-lg">Estimated Total</span>
                    <span className="font-bold text-2xl text-secondary">
                      ₦{estimatedTotal.toLocaleString()}
                    </span>
                  </div>
                  {!selectedRegionId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Final shipping calculated at checkout
                    </p>
                  )}
                </div>

                <Button asChild size="lg" className="w-full">
                  <Link to="/checkout">Proceed to Checkout</Link>
                </Button>

                <Button asChild variant="outline" className="w-full">
                  <Link to="/products">Continue Shopping</Link>
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