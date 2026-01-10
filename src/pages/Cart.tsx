import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCart } from '@/contexts/CartContext';
import { useCartIncentive } from '@/hooks/useCartIncentive';
import { Minus, Plus, Trash2, ShoppingBag, Gift } from 'lucide-react';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal, totalItems } = useCart();

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

  const { nextThreshold, amountToNext, itemsToNext, progressPercentage, unlockedThreshold } = useCartIncentive(subtotal, totalItems);

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

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items ({totalItems})</span>
                    <span className="font-medium">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-secondary">FREE</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-2xl text-secondary">
                      ₦{subtotal.toLocaleString()}
                    </span>
                  </div>
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