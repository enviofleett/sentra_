import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  XCircle,
  CreditCard
} from 'lucide-react';
import { NormalizedOrderItem, normalizeOrderItems } from '@/utils/orderItems';

interface Order {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  payment_status: string;
  total_amount: number;
  subtotal: number;
  shipping_cost: number;
  items: NormalizedOrderItem[];
  shipping_address: any;
  tracking_number?: string;
  customer_email: string;
}

const ORDER_STEPS = [
  { 
    key: 'pending', 
    label: 'Order Placed', 
    icon: Clock,
    description: 'Your order has been received'
  },
  { 
    key: 'processing', 
    label: 'Processing', 
    icon: Package,
    description: 'We are preparing your order'
  },
  { 
    key: 'shipped', 
    label: 'Shipped', 
    icon: Truck,
    description: 'Your order is on its way'
  },
  { 
    key: 'delivered', 
    label: 'Delivered', 
    icon: CheckCircle,
    description: 'Order has been delivered'
  },
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = async () => {
    if (!orderId) {
      setError('No order ID provided');
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) {
        console.error('Error fetching order:', fetchError);
        setError('Order not found');
        setLoading(false);
        return;
      }

      setOrder({
        ...data,
        items: normalizeOrderItems(data.items as any[]),
        shipping_address: data.shipping_address,
      } as Order);
      setError(null);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load order');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();

    // Set up real-time subscription for order updates
    if (orderId) {
      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`
          },
          (payload) => {
            console.log('Order updated:', payload);
            setOrder(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                ...payload.new,
                items: normalizeOrderItems((payload.new as any).items as any[]),
                shipping_address: (payload.new as any).shipping_address,
              } as Order;
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [orderId]);

  const getCurrentStepIndex = (status: string) => {
    const index = ORDER_STEPS.findIndex(step => step.key === status);
    return index >= 0 ? index : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500';
      case 'processing': return 'bg-blue-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500">Payment Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Payment Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-blue-500">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <Card className="text-center py-16">
              <CardContent>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  <RefreshCw className="w-12 h-12 text-primary" />
                </motion.div>
                <p className="mt-4 text-muted-foreground">Loading order details...</p>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <Card className="text-center py-16">
              <CardContent className="space-y-4">
                <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
                <h2 className="text-2xl font-semibold">Order Not Found</h2>
                <p className="text-muted-foreground">{error || 'The order you are looking for does not exist.'}</p>
                <div className="flex justify-center gap-3 pt-4">
                  <Button onClick={() => navigate(-1)} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Button>
                  <Button onClick={() => navigate('/profile/orders')}>
                    View All Orders
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Back Button */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Order Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl md:text-3xl">
                      Order #{order.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    {getPaymentStatusBadge(order.payment_status)}
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Visual Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Order Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCancelled ? (
                  <div className="text-center py-8">
                    <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-destructive">Order Cancelled</h3>
                    <p className="text-muted-foreground mt-2">
                      This order has been cancelled. If you have any questions, please contact support.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Desktop Timeline */}
                    <div className="hidden md:block">
                      <div className="flex justify-between items-start relative">
                        {/* Progress Line Background */}
                        <div className="absolute top-6 left-0 right-0 h-1 bg-muted" />
                        
                        {/* Progress Line Filled */}
                        <motion.div 
                          className="absolute top-6 left-0 h-1 bg-primary"
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${(currentStepIndex / (ORDER_STEPS.length - 1)) * 100}%` 
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />

                        {ORDER_STEPS.map((step, index) => {
                          const StepIcon = step.icon;
                          const isCompleted = index <= currentStepIndex;
                          const isCurrent = index === currentStepIndex;

                          return (
                            <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors ${
                                  isCompleted 
                                    ? 'bg-primary border-primary text-primary-foreground' 
                                    : 'bg-background border-muted text-muted-foreground'
                                }`}
                              >
                                <StepIcon className={`w-5 h-5 ${isCurrent ? 'animate-pulse' : ''}`} />
                              </motion.div>
                              <div className="mt-3 text-center">
                                <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {step.label}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-[120px]">
                                  {step.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile Timeline */}
                    <div className="md:hidden space-y-4">
                      {ORDER_STEPS.map((step, index) => {
                        const StepIcon = step.icon;
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;

                        return (
                          <motion.div
                            key={step.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start gap-4"
                          >
                            <div className="relative flex flex-col items-center">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                                  isCompleted 
                                    ? 'bg-primary border-primary text-primary-foreground' 
                                    : 'bg-background border-muted text-muted-foreground'
                                }`}
                              >
                                <StepIcon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                              </div>
                              {index < ORDER_STEPS.length - 1 && (
                                <div className={`w-0.5 h-12 mt-2 ${
                                  index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                                }`} />
                              )}
                            </div>
                            <div className="pt-1">
                              <p className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {step.label}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {step.description}
                              </p>
                              {isCurrent && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  Current Status
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tracking Number */}
                {order.tracking_number && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="font-mono font-semibold">{order.tracking_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Order Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Items ({order.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg bg-muted"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₦{(item.price * item.quantity).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">₦{item.price.toLocaleString()} each</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₦{order.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{order.shipping_cost ? `₦${order.shipping_cost.toLocaleString()}` : 'FREE'}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">₦{order.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Shipping Address */}
          {order.shipping_address && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    {order.shipping_address.fullName && (
                      <p className="font-medium">{order.shipping_address.fullName}</p>
                    )}
                    {order.shipping_address.phone && (
                      <p className="text-muted-foreground">{order.shipping_address.phone}</p>
                    )}
                    {order.shipping_address.address && (
                      <p>{order.shipping_address.address}</p>
                    )}
                    <p>
                      {[
                        order.shipping_address.city,
                        order.shipping_address.state,
                        order.shipping_address.postalCode
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Button asChild className="flex-1">
              <Link to="/profile/orders">View All Orders</Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </motion.div>

          {/* Real-time indicator */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live updates enabled
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
