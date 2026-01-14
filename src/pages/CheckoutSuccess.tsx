import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Package, Users, Loader2, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type VerificationStatus = 'verifying' | 'success' | 'pending' | 'failed';

interface OrderDetails {
  id: string;
  total_amount: number;
  payment_status: string;
  status: string;
  customer_email: string;
  items: any[];
}

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('verifying');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const successNotificationShown = useRef(false);

  const orderId = searchParams.get('order_id');
  const commitmentId = searchParams.get('commitment_id');
  const type = searchParams.get('type');
  const isGroupBuy = type === 'group_buy';

  const verifyPayment = async () => {
    if (!orderId && !commitmentId) {
      setVerificationStatus('failed');
      return;
    }

    try {
      if (isGroupBuy && commitmentId) {
        // Verify group buy commitment
        const { data: commitment, error } = await supabase
          .from('group_buy_commitments')
          .select('id, status, committed_price, quantity')
          .eq('id', commitmentId)
          .single();

        if (error || !commitment) {
          console.error('Commitment verification failed:', error);
          setVerificationStatus('failed');
          return;
        }

        // Check if payment was successful
        if (commitment.status === 'committed_paid' || commitment.status === 'paid_finalized') {
          setVerificationStatus('success');
          await clearCart();
          if (!successNotificationShown.current) {
            toast.success('Payment Successful!', {
              description: 'Your group buy commitment has been confirmed.',
              duration: 5000,
            });
            successNotificationShown.current = true;
          }
        } else if (commitment.status === 'committed_unpaid') {
          // Payment might still be processing
          if (retryCount < 5) {
            setRetryCount(prev => prev + 1);
            setTimeout(verifyPayment, 2000);
          } else {
            setVerificationStatus('pending');
          }
        } else {
          setVerificationStatus('failed');
        }
      } else if (orderId) {
        // First check current order status
        const { data: order, error } = await supabase
          .from('orders')
          .select('id, total_amount, payment_status, status, customer_email, items, payment_reference')
          .eq('id', orderId)
          .single();

        if (error || !order) {
          console.error('Order verification failed:', error);
          setVerificationStatus('failed');
          return;
        }

        setOrderDetails(order as OrderDetails);

        // If already paid, we're done
        if (order.payment_status === 'paid') {
          setVerificationStatus('success');
          await clearCart();
          if (!successNotificationShown.current) {
            toast.success('Payment Successful!', {
              description: `Your order #${order.id.slice(0, 8).toUpperCase()} has been confirmed.`,
              duration: 5000,
            });
            successNotificationShown.current = true;
          }
          return;
        }

        // If still pending, call verify-payment edge function to check with Paystack directly
        // Note: verify-payment is now READ-ONLY - it reports Paystack status but doesn't update DB
        if (order.payment_status === 'pending' && retryCount < 5) {
          console.log(`[CheckoutSuccess] Calling verify-payment API (attempt ${retryCount + 1})`);
          
          try {
            const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-payment', {
              body: { orderId: orderId }
            });
            
            console.log('[CheckoutSuccess] Verify result:', verifyResult);
            
            if (verifyError) {
              console.error('[CheckoutSuccess] Verify API error:', verifyError);
              // Continue with retry - don't fail immediately
            } else if (verifyResult?.verified && verifyResult?.status === 'success') {
              // Paystack confirms payment - now wait for webhook to update DB
              // Re-check the database to see if webhook has processed
              const { data: refreshedOrder } = await supabase
                .from('orders')
                .select('id, total_amount, payment_status, status, customer_email, items')
                .eq('id', orderId)
                .single();
              
              if (refreshedOrder?.payment_status === 'paid') {
                // Webhook has updated the order
                setOrderDetails(refreshedOrder as OrderDetails);
                setVerificationStatus('success');
                await clearCart();
                if (!successNotificationShown.current) {
                  toast.success('Payment Successful!', {
                    description: `Your order #${refreshedOrder.id.slice(0, 8).toUpperCase()} has been confirmed.`,
                    duration: 5000,
                  });
                  successNotificationShown.current = true;
                }
                return;
              } else {
                // Paystack says success but webhook hasn't processed yet
                // Continue retrying to give webhook time
                console.log('[CheckoutSuccess] Paystack confirmed but waiting for webhook...');
              }
            } else if (verifyResult?.status === 'failed' || verifyResult?.status === 'abandoned') {
              setVerificationStatus('failed');
              return;
            }
          } catch (e) {
            console.error('[CheckoutSuccess] Verify API call failed:', e);
          }
          
          // Still pending, retry with increasing delay
          setRetryCount(prev => prev + 1);
          const delay = Math.min(2000 + retryCount * 1000, 5000); // 2s, 3s, 4s, 5s, 5s
          setTimeout(verifyPayment, delay);
        } else if (order.payment_status === 'pending') {
          // After retries exhausted, show pending state
          setVerificationStatus('pending');
        } else {
          setVerificationStatus('failed');
        }
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setVerificationStatus('failed');
    }
  };

  useEffect(() => {
    // Start verification after a short delay to allow webhook to process
    const timer = setTimeout(verifyPayment, 1500);
    return () => clearTimeout(timer);
  }, []);

  const displayId = orderId?.slice(0, 8) || commitmentId?.slice(0, 8) || 'N/A';

  // Loading state
  if (verificationStatus === 'verifying') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="pt-12 pb-12 space-y-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-16 h-16 text-primary mx-auto" />
              </motion.div>
              <h1 className="text-2xl font-bold">Verifying Payment...</h1>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment with Paystack. This should only take a moment.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span>Checking payment status...</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Pending state (payment still processing)
  if (verificationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader className="pb-4">
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-2xl">Payment Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Your payment is being processed. This may take a few moments. You'll receive a confirmation email once completed.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Package className="w-4 h-4" />
                  <span>Reference ID</span>
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
                  Check Order Status
                </Button>
                <Button
                  onClick={() => {
                    setVerificationStatus('verifying');
                    setRetryCount(0);
                    verifyPayment();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Failed state
  if (verificationStatus === 'failed') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader className="pb-4">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl">Payment Verification Failed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                We couldn't verify your payment. This could be because the payment was cancelled or there was an issue with processing.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => navigate('/cart')}
                  className="flex-1"
                >
                  Return to Cart
                </Button>
                <Button
                  onClick={() => navigate('/profile/orders')}
                  variant="outline"
                  className="flex-1"
                >
                  View Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader className="pb-4">
              <motion.div 
                className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto flex items-center justify-center mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </motion.div>
              <CardTitle className="text-3xl">
                {isGroupBuy ? '🎉 Spot Secured!' : '🎉 Payment Successful!'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                {isGroupBuy 
                  ? 'Your group buy commitment has been successfully processed. You will receive updates as the campaign progresses.'
                  : 'Thank you for your purchase! Your order is confirmed and is now being processed. You will receive a confirmation email shortly.'
                }
              </p>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  {isGroupBuy ? <Users className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  <span>{isGroupBuy ? 'Commitment ID' : 'Order ID'}</span>
                </div>
                <p className="font-mono text-lg font-semibold text-primary">
                  #{displayId.toUpperCase()}
                </p>
                
                {orderDetails && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium text-green-600 dark:text-green-400 capitalize">
                        {orderDetails.payment_status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-semibold">₦{orderDetails.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-sm text-green-700 dark:text-green-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>A confirmation email has been sent to your email address.</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {!isGroupBuy && orderId && (
                  <Button
                    onClick={() => navigate(`/orders/${orderId}/track`)}
                    className="flex-1"
                  >
                    Track Order
                  </Button>
                )}
                <Button
                  onClick={() => navigate(isGroupBuy ? '/profile/groupbuys' : '/profile/orders')}
                  variant={isGroupBuy ? 'default' : 'outline'}
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
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
