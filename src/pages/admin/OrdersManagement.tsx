import { useEffect, useState, useCallback } from 'react';
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
  updated_at: string;
  items: any;
  shipping_address: any;
  billing_address: any;
}

export function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [enrichedItems, setEnrichedItems] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
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

  useEffect(() => {
    if (selectedOrder) {
      fetchEnrichedItems(selectedOrder.items);
    }
  }, [selectedOrder]);

  const fetchEnrichedItems = async (items: any[]) => {
    setIsLoadingDetails(true);
    if (!items || !Array.isArray(items)) {
      setEnrichedItems([]);
      setIsLoadingDetails(false);
      return;
    }

    const productIds = items.map(item => item.product_id).filter(Boolean);
    
    if (productIds.length === 0) {
      setEnrichedItems(items);
      setIsLoadingDetails(false);
      return;
    }

    try {
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          cost_price,
          brand,
          categories (
            name
          )
        `)
        .in('id', productIds);

      const productMap = new Map(products?.map(p => [p.id, p]));

      const enriched = items.map(item => {
        const product = productMap.get(item.product_id);
        return {
          ...item,
          category_name: product?.categories?.name || 'N/A',
          brand_name: product?.brand || 'N/A',
          supply_price: product?.cost_price || 0
        };
      });

      setEnrichedItems(enriched);
    } catch (error) {
      console.error('Error fetching item details:', error);
      setEnrichedItems(items);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Set up real-time subscription for order updates
  useEffect(() => {
    console.log('[OrdersManagement] Setting up real-time subscription');
    
    const channel = supabase
      .channel('orders-changes-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('[OrdersManagement] Order updated via real-time:', payload);
          
          // Show notification for payment status changes
          if (payload.eventType === 'UPDATE') {
            const oldOrder = payload.old as Order;
            const newOrder = payload.new as Order;
            
            if (oldOrder.payment_status !== newOrder.payment_status) {
              if (newOrder.payment_status === 'paid') {
                toast.success('Payment Confirmed', {
                  description: `Order #${newOrder.id.slice(0, 8)} payment has been confirmed.`,
                });
              } else if (newOrder.payment_status === 'failed') {
                toast.error('Payment Failed', {
                  description: `Order #${newOrder.id.slice(0, 8)} payment failed.`,
                });
              }
            }
            
            if (oldOrder.status !== newOrder.status) {
              toast.info('Order Status Updated', {
                description: `Order #${newOrder.id.slice(0, 8)} status changed to ${newOrder.status}.`,
              });
            }
          }
          
          // Refresh orders when any order is updated
          // Use the current state values to refetch with current filters
          fetchOrders();
          fetchAnalytics();
        }
      )
      .subscribe((status) => {
        console.log('[OrdersManagement] Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[OrdersManagement] Successfully subscribed to order updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[OrdersManagement] Real-time subscription error');
          toast.error('Real-time updates unavailable', {
            description: 'Order updates may be delayed. Please refresh the page.',
          });
        }
      });

    return () => {
      console.log('[OrdersManagement] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - subscription should persist regardless of filter changes

  const fetchVendors = async () => {
    const { data } = await supabase
      .from('vendors')
      .select('id, rep_full_name, email')
      .order('rep_full_name');
    setVendors(data || []);
  };

  const fetchAnalytics = useCallback(async () => {
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
  }, []);

  const fetchOrders = useCallback(async () => {
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
  }, [selectedVendor, timePeriod]);

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              Order #{selectedOrder?.id.slice(0, 8)}
              {selectedOrder && getPaymentStatusBadge(selectedOrder.payment_status, selectedOrder.paystack_status)}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Order Date</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selectedOrder.created_at).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Method:</span>
                        <span className="font-medium">
                          {selectedOrder.payment_reference ? 'Paystack' : 'Wallet / Other'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date Paid:</span>
                        <span className="font-medium">
                          {selectedOrder.payment_status === 'paid' 
                            ? new Date(selectedOrder.updated_at).toLocaleDateString() 
                            : 'Pending'}
                        </span>
                      </div>
                      {selectedOrder.payment_reference && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ref:</span>
                          <span className="font-mono text-xs">{selectedOrder.payment_reference.slice(0, 10)}...</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Order Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₦{selectedOrder.total_amount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0} items
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    Customer Details
                  </h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid gap-1">
                        <div className="font-medium">{selectedOrder.shipping_address?.fullName}</div>
                        <div className="text-sm text-muted-foreground">{selectedOrder.customer_email}</div>
                        <div className="text-sm text-muted-foreground">{selectedOrder.shipping_address?.phone}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <TruckIcon className="h-4 w-4 text-primary" />
                    </div>
                    Shipping Address
                  </h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">
                        <p>{selectedOrder.shipping_address?.address}</p>
                        <p>{selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state}</p>
                        <p>{selectedOrder.shipping_address?.country || 'Nigeria'}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Order Items</h3>
                {isLoadingDetails ? (
                  <div className="flex justify-center p-8 border rounded-lg bg-muted/20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Supply Price</TableHead>
                          <TableHead className="text-right">Sales Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrichedItems.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.brand_name || 'N/A'}</TableCell>
                            <TableCell>{getVendorName(item.vendor_id)}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">
                              {item.supply_price ? `₦${Number(item.supply_price).toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className="text-right">₦{item.price?.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">
                              ₦{(item.price * item.quantity).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
