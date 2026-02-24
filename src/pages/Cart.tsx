
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight, Gift, AlertCircle } from 'lucide-react';
import { useCartIncentive } from '@/hooks/useCartIncentive';
import { Progress } from '@/components/ui/progress';
import { MIN_ORDER_UNITS } from '@/utils/constants';
import { useCheckoutPolicy } from '@/hooks/useCheckoutPolicy';
import { Badge } from '@/components/ui/badge';

export default function Cart() {
  const navigate = useNavigate();
  const { items, subtotal, totalItems, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const { policy, loading: policyLoading, ready: policyReady } = useCheckoutPolicy();
  
  // Cart Incentive Hook
  const {
    nextThreshold,
    amountToNext,
    itemsToNext,
    progressPercentage,
    unlockedThreshold
  } = useCartIncentive(subtotal, totalItems);

  const requiredMoq = policy.required_moq || MIN_ORDER_UNITS;
  const remainingForMoq = Math.max(0, requiredMoq - totalItems);
  const isMoqMet = totalItems >= requiredMoq;

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
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

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
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 flex gap-4 items-center">
                   {/* Product Image placeholder if we had one */}
                   <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                     <ShoppingBag className="h-8 w-8" />
                   </div>
                   
                   <div className="flex-1">
                     <h3 className="font-medium">{item.product?.name}</h3>
                     <p className="text-sm text-muted-foreground">
                        Unit Price: ₦{(item.product?.price || 0).toLocaleString()}
                     </p>
                   </div>

                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-muted/30 rounded-md p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
                        <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.product?.stock_quantity !== undefined && item.quantity >= item.product.stock_quantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="text-right min-w-[80px]">
                        <p className="font-bold">₦{((item.product?.price || 0) * item.quantity).toLocaleString()}</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Sidebar */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  {user && (
                    <div className="mb-3 p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Checkout Policy</p>
                        {policy.is_influencer && (
                          <Badge variant="secondary">
                            {policy.influencer_moq_enabled ? 'Influencer Active' : 'Influencer Inactive'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Required MOQ: {requiredMoq} unit{requiredMoq > 1 ? 's' : ''} • Paid orders in last 30 days: {policy.paid_orders_last_30d}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-lg mb-4">
                    <span>Total</span>
                    <span>₦{subtotal.toLocaleString()}</span>
                  </div>
                  
                  {!isMoqMet && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-sm text-amber-800">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Minimum Order Required</p>
                        <p>Please add {remainingForMoq} more unit{remainingForMoq > 1 ? 's' : ''} to proceed. Minimum {requiredMoq} units required.</p>
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={() => navigate('/checkout')}
                    disabled={!isMoqMet || policyLoading || !policyReady}
                  >
                    {isMoqMet ? (
                      <>
                        Proceed to Checkout
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      `Add ${remainingForMoq} more unit${remainingForMoq > 1 ? 's' : ''}`
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
