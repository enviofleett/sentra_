import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, Clock, Package, TruckIcon, CheckCircle, XCircle } from 'lucide-react';
import { getOrderStatusBreakdown, getOrdersTimeline, OrderStatusBreakdown } from '@/utils/analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Order {
  id: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: any;
  shipping_address: any;
  billing_address: any;
}

export function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusBreakdown, setStatusBreakdown] = useState<OrderStatusBreakdown[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [breakdown, timeline] = await Promise.all([
        getOrderStatusBreakdown(),
        getOrdersTimeline(30)
      ]);
      setStatusBreakdown(breakdown);
      setTimelineData(timeline);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled') => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
      console.error(error);
    } else {
      toast.success('Order status updated successfully');
      fetchOrders();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'shipped': return 'text-purple-600';
      case 'delivered': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Loading orders...</p>
    </div>
  );

  const statusIcons = {
    pending: Clock,
    processing: Package,
    shipped: TruckIcon,
    delivered: CheckCircle,
    cancelled: XCircle
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
        <p className="text-muted-foreground">Track and manage all customer orders</p>
      </div>

      {/* Order Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statusBreakdown.map(({ status, count, total_value }) => {
          const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
          const colorClass = getStatusColor(status);
          
          return (
            <Card key={status} className="hover-scale">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                  <CardTitle className="text-sm font-medium capitalize">{status}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">₦{total_value.toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Orders Timeline Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Orders Timeline (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsLoading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-muted-foreground">Loading chart...</p>
            </div>
          ) : timelineData.length === 0 ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-muted-foreground">No order data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="pending" stackId="a" fill="#eab308" name="Pending" />
                <Bar dataKey="processing" stackId="a" fill="#3b82f6" name="Processing" />
                <Bar dataKey="shipped" stackId="a" fill="#8b5cf6" name="Shipped" />
                <Bar dataKey="delivered" stackId="a" fill="#22c55e" name="Delivered" />
                <Bar dataKey="cancelled" stackId="a" fill="#ef4444" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                  <TableCell>{order.customer_email}</TableCell>
                  <TableCell>₦{order.total_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled') => updateOrderStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue className={getStatusColor(order.status)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Customer Information</h3>
                <p>Email: {selectedOrder.customer_email}</p>
              </div>
              <div>
                <h3 className="font-semibold">Shipping Address</h3>
                <p>{selectedOrder.shipping_address?.fullName}</p>
                <p>{selectedOrder.shipping_address?.address}</p>
                <p>{selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state}</p>
                <p>{selectedOrder.shipping_address?.phone}</p>
              </div>
              <div>
                <h3 className="font-semibold">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₦{item.price?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <h3 className="font-semibold">Total: ₦{selectedOrder.total_amount.toLocaleString()}</h3>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
