import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { CheckCircle, Package, Users, Loader2 } from 'lucide-react';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [isVerifying, setIsVerifying] = useState(true);

  const orderId = searchParams.get('order_id');
  const commitmentId = searchParams.get('commitment_id');
  const type = searchParams.get('type');
  const isGroupBuy = type === 'group_buy';

  useEffect(() => {
    // Clear cart on successful checkout
    const handleSuccess = async () => {
      // Wait for webhook to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Clear cart for standard orders
      if (!isGroupBuy) {
        await clearCart();
      }
      
      setIsVerifying(false);
    };

    handleSuccess();
  }, [clearCart, isGroupBuy]);

  const displayId = orderId?.slice(0, 8) || commitmentId?.slice(0, 8) || 'N/A';

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="pt-12 pb-12 space-y-6">
              <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
              <h1 className="text-2xl font-bold">Verifying Payment...</h1>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment. This should only take a moment.
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-24">
        <Card className="max-w-lg mx-auto text-center">
          <CardHeader className="pb-4">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-3xl">
              {isGroupBuy ? '🎉 Spot Secured!' : '🎉 Order Confirmed!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              {isGroupBuy 
                ? 'Your group buy commitment has been successfully processed. You will receive updates as the campaign progresses.'
                : 'Thank you for your purchase! Your order is now being processed and you will receive a confirmation email shortly.'
              }
            </p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {isGroupBuy ? <Users className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                <span>{isGroupBuy ? 'Commitment ID' : 'Order ID'}</span>
              </div>
              <p className="font-mono text-lg font-semibold text-primary">
                #{displayId.toUpperCase()}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={() => navigate(isGroupBuy ? '/profile/groupbuys' : '/profile/orders')}
                className="flex-1"
              >
                {isGroupBuy ? 'View My Commitments' : 'View My Orders'}
              </Button>
              <Button
                onClick={() => navigate('/products')}
                variant="outline"
                className="flex-1"
              >
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
