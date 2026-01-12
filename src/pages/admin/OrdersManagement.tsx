import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, Clock, Package, TruckIcon, CheckCircle, XCircle, RefreshCw, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { getOrderStatusBreakdown, getOrdersTimeline, OrderStatusBreakdown } from '@/utils/analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Vendor {
  id: string;
  rep_full_name: string;
  email: string;
}

interface Order {
  id: string;
  customer_email: string;
  total_amount: number;
  status: string;
  payment_status: string;
  paystack_status: string | null;
  payment_reference: string | null;
  created_at: string;
  items: any;
  shipping_address: any;
  billing_address: any;
}

export function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusBreakdown, setStatusBreakdown] = useState<OrderStatusBreakdown[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month'>('week');
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date()
  });

  useEffect(() => {
    fetchVendors();
    fetchOrders();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [selectedVendor, timePeriod]);

  const fetchVendors = async () => {
    const { data } = await supabase
      .from('vendors')
      .select('id, rep_full_name, email')
      .order('rep_full_name');
    setVendors(data || []);
  };

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
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply time period filter
    const now = new Date();
    if (timePeriod === 'day') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      query = query.gte('created_at', startOfDay.toISOString());
    } else if (timePeriod === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      query = query.gte('created_at', startOfWeek.toISOString());
    } else if (timePeriod === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query.gte('created_at', startOfMonth.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } else {
      let filteredOrders = data || [];
      
      // Filter by vendor (client-side since vendor_id is in items JSON)
      if (selectedVendor !== 'all') {
        filteredOrders = filteredOrders.filter(order => {
          const items = Array.isArray(order.items) ? order.items : [];
          return items.some((item: any) => item.vendor_id === selectedVendor);
        });
      }
      
      setOrders(filteredOrders);
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

  const verifyPayment = async (orderId: string) => {
    setVerifyingOrderId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { orderId }
      });

      if (error) {
        toast.error('Verification failed', { description: error.message });
        return;
      }

      if (data?.verified && data?.status === 'success') {
        toast.success('Payment verified!', { 
          description: 'Order has been updated to paid/processing status'
        });
        fetchOrders();
        fetchAnalytics();
      } else if (data?.status === 'pending') {
        toast.info('Payment still pending', {
          description: 'Paystack has not confirmed this payment yet'
        });
      } else if (data?.status === 'failed' || data?.status === 'abandoned') {
        toast.error('Payment failed', {
          description: `Paystack reports: ${data?.message || data?.status}`
        });
      } else {
        toast.warning('Unable to verify', {
          description: data?.message || 'Transaction not found in Paystack'
        });
      }
    } catch (err: any) {
      toast.error('Verification error', { description: err.message });
    } finally {
      setVerifyingOrderId(null);
    }
  };

  const manuallyMarkAsPaid = async (orderId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to manually mark this order as paid? Only do this if you have confirmed payment through other means.'
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        payment_status: 'paid',
        paystack_status: 'manual_override',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order');
    } else {
      toast.success('Order marked as paid');
      fetchOrders();
      fetchAnalytics();
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

  const getPaymentStatusBadge = (paymentStatus: string, paystackStatus: string | null) => {
    if (paymentStatus === 'paid') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
    }
    if (paystackStatus === 'manual_override') {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Manual</Badge>;
    }
    if (paymentStatus === 'failed' || paystackStatus === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getVendorName = (vendorId: string | null) => {
    if (!vendorId) return 'N/A';
    return vendors.find(v => v.id === vendorId)?.rep_full_name || 'Unknown';
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

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-64">
              <Label>Filter by Vendor</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger>
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.rep_full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-48">
              <Label>Time Period</Label>
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                <TableHead>Items / Vendors</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const isPending = order.payment_status === 'pending';
                const isVerifying = verifyingOrderId === order.id;
                
                return (
                  <TableRow key={order.id} className={isPending ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                    <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                    <TableCell>{order.customer_email}</TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {order.items?.map((item: any, idx: number) => (
                          <div key={idx} className="text-muted-foreground">
                            {item.name} - {getVendorName(item.vendor_id)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>₦{order.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentStatusBadge(order.payment_status, order.paystack_status)}
                        {isPending && (
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Payment not confirmed</p>
                            </TooltipContent>
                          </UITooltip>
                        )}
                      </div>
                    </TableCell>
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
                      <div className="flex items-center gap-1">
                        <UITooltip>
                          <TooltipTrigger asChild>
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
                          </TooltipTrigger>
                          <TooltipContent>View Details</TooltipContent>
                        </UITooltip>
                        
                        {isPending && (
                          <>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => verifyPayment(order.id)}
                                  disabled={isVerifying}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  {isVerifying ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Verify with Paystack</TooltipContent>
                            </UITooltip>
                            
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => manuallyMarkAsPaid(order.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark as Paid (Manual)</TooltipContent>
                            </UITooltip>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
                      <TableHead>Vendor</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{getVendorName(item.vendor_id)}</TableCell>
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
