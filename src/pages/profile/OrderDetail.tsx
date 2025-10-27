import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Package, MapPin, CreditCard, Clock } from 'lucide-react';

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  items: OrderItem[];
  shipping_address: any;
  billing_address: any;
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    if (!user || !orderId) return;
    
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setOrder({
        ...data,
        items: data.items as unknown as OrderItem[],
        shipping_address: data.shipping_address,
        billing_address: data.billing_address,
      } as Order);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusSteps = (currentStatus: string) => {
    const steps = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = steps.indexOf(currentStatus);
    return steps.map((step, index) => ({
      name: step,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 md:p-6 text-center">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">Order not found</p>
        <Button asChild>
          <Link to="/profile/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
        </Button>
      </div>
    );
  }

  const statusSteps = getStatusSteps(order.status);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/profile/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Order #{order.id.slice(0, 8)}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4 inline mr-1" />
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Timeline */}
          <div className="flex justify-between items-center mb-8">
            {statusSteps.map((step, index) => (
              <div key={step.name} className="flex-1 relative">
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.completed ? '✓' : index + 1}
                  </div>
                  <p className={`text-xs mt-2 capitalize ${
                    step.active ? 'font-semibold' : 'text-muted-foreground'
                  }`}>
                    {step.name}
                  </p>
                </div>
                {index < statusSteps.length - 1 && (
                  <div 
                    className={`absolute top-4 left-1/2 w-full h-0.5 ${
                      step.completed ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(order.items) && order.items.map((item, index) => (
              <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
                {item.image_url && (
                  <img 
                    src={item.image_url} 
                    alt={item.product_name}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold">{item.product_name}</h4>
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  <p className="text-sm text-muted-foreground">
                    ₦{item.price.toLocaleString()} each
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    ₦{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Order Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₦{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>₦{(order.shipping_cost || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>₦{(order.tax || 0).toLocaleString()}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-secondary">₦{order.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.shipping_address && (
              <div className="text-sm space-y-1">
                <p>{order.shipping_address.street}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
                <p>{order.shipping_address.postalCode}</p>
                <p>{order.shipping_address.country}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Billing Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.billing_address && (
              <div className="text-sm space-y-1">
                <p>{order.billing_address.street}</p>
                <p>{order.billing_address.city}, {order.billing_address.state}</p>
                <p>{order.billing_address.postalCode}</p>
                <p>{order.billing_address.country}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
