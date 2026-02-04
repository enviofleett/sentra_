import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, Clock, Package, TruckIcon, CheckCircle, XCircle, RefreshCw, CreditCard, Loader2, AlertCircle, Send, Mail, MessageSquare, Phone, MapPin, Calendar, CreditCard as CreditCardIcon } from 'lucide-react';
import { getOrderStatusBreakdown, getOrdersTimeline, OrderStatusBreakdown } from '@/utils/analytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface Vendor {
  id: string;
  rep_full_name: string;
  email: string;
}

interface Order {
  id: string;
  user_id: string;
  customer_email: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: string;
  paystack_status: string | null;
  payment_reference: string | null;
  created_at: string;
  items: any;
  shipping_address: any;
  billing_address: any;
  promo_discount_applied?: number;
  registration_date?: string;
  promo_wallet_balance?: number;
}

interface OrderCommunication {
  id: string;
  type: 'email' | 'sms' | 'system' | 'note';
  subject: string;
  content: string;
  created_at: string;
  metadata?: any;
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('week');
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });

  // Email State
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [communications, setCommunications] = useState<OrderCommunication[]>([]);
  const [communicationsLoading, setCommunicationsLoading] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<string>('');
  const [emailTemplateSubject, setEmailTemplateSubject] = useState<string>('');

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const { data } = await supabase
          .from('email_templates')
          .select('subject, html_content')
          .eq('template_id', 'order_update')
          .maybeSingle();
        
        if (data) {
          setEmailTemplateSubject(data.subject);
          setEmailTemplate(data.html_content);
        }
      } catch (error) {
        console.error('Error fetching email template:', error);
      }
    };
    
    fetchTemplate();
  }, []);

  const fetchCommunications = async (orderId: string) => {
    setCommunicationsLoading(true);
    const { data, error } = await supabase
      .from('order_communications' as any)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setCommunications(data as unknown as OrderCommunication[]);
    }
    setCommunicationsLoading(false);
  };

  const handleSendEmail = async () => {
    if (!selectedOrder || !emailMessage || !emailSubject) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSendingEmail(true);
    try {
      // Format message: convert newlines to <br> if no HTML tags are present
      // This is needed because the edge function minifies HTML (removing newlines)
      const hasHtmlTags = /<[a-z][\s\S]*>/i.test(emailMessage);
      const formattedMessage = hasHtmlTags ? emailMessage : emailMessage.replace(/\n/g, '<br>');

      const { data, error } = await supabase.functions.invoke('send-order-update', {
        body: {
          orderId: selectedOrder.id,
          customerEmail: selectedOrder.customer_email,
          customerName: selectedOrder.shipping_address?.fullName || 'Customer',
          subject: emailSubject,
          message: formattedMessage,
          status: selectedOrder.status
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Email sent successfully');
        setIsEmailDialogOpen(false);
        setEmailMessage('');
        setEmailSubject('');
        if (selectedOrder) {
          fetchCommunications(selectedOrder.id);
        }
      } else {
        toast.error('Failed to send email', { description: data.error });
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Error sending email', { description: error.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const openEmailDialog = (order: Order) => {
    setSelectedOrder(order);
    
    // Default values
    let subject = `Update on Order #${order.id.slice(0, 8)}`;
    let message = `Hi ${order.shipping_address?.fullName || 'there'},\n\nWe wanted to give you an update on your order.\n\n`;

    // Use template if available
    if (emailTemplate) {
       const customerName = order.shipping_address?.fullName || 'Customer';
       const orderId = order.id.slice(0, 8);
       const status = order.status;

       // Replace variables in subject
       if (emailTemplateSubject) {
         subject = emailTemplateSubject
           .replace(/{{customerName}}/g, customerName)
           .replace(/{{orderId}}/g, orderId)
           .replace(/{{status}}/g, status);
       }

       // Replace variables in body
       message = emailTemplate
         .replace(/{{customerName}}/g, customerName)
         .replace(/{{orderId}}/g, orderId)
         .replace(/{{status}}/g, status);
    }

    setEmailSubject(subject);
    setEmailMessage(message);
    setIsEmailDialogOpen(true);
  };

  useEffect(() => {
    fetchVendors();
    fetchOrders();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 500); // Debounce search

    return () => clearTimeout(timer);
  }, [selectedVendor, timePeriod, statusFilter, searchQuery]);

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
    } else if (timePeriod === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      query = query.gte('created_at', startOfYear.toISOString());
    } else if (timePeriod === 'custom' && dateRange?.from) {
      query = query.gte('created_at', dateRange.from.toISOString());
      if (dateRange.to) {
        // Add 1 day to end date to include the full day
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as any);
    }

    // Apply search filter
    if (searchQuery) {
      // Use ILIKE for case-insensitive search on id or customer_email
      // Note: Supabase 'or' expects a string like "column.operator.value,column.operator.value"
      query = query.or(`id.ilike.%${searchQuery}%,customer_email.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } else {
      let filteredOrders: any[] = data || [];

      // Fetch additional user details (profiles and wallets)
      if (filteredOrders.length > 0) {
        const userIds = [...new Set(filteredOrders.map((o: any) => o.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const [profilesResponse, walletsResponse] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, created_at')
              .in('id', userIds),
            supabase
              .from('user_wallets')
              .select('user_id, balance_promo')
              .in('user_id', userIds)
          ]);

          const profilesMap = new Map(profilesResponse.data?.map(p => [p.id, p.created_at]));
          const walletsMap = new Map(walletsResponse.data?.map(w => [w.user_id, w.balance_promo]));

          filteredOrders = filteredOrders.map(order => ({
            ...order,
            registration_date: profilesMap.get(order.user_id),
            promo_wallet_balance: walletsMap.get(order.user_id) || 0
          }));
        }
      }
      
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
  }, [selectedVendor, timePeriod, statusFilter, searchQuery]);

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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>Search Orders</Label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by Order ID or Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            <div className="w-full md:w-64">
              <Label>Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-64">
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
            
            <div className="w-full md:w-48">
              <Label>Time Period</Label>
              <div className="flex gap-2">
                <Select value={timePeriod} onValueChange={(v: any) => setTimePeriod(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                {timePeriod === 'custom' && (
                  <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                )}
              </div>
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
                        onValueChange={(value) => updateOrderStatus(order.id, value as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled')}
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
                                fetchCommunications(order.id);
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-background">
          {selectedOrder ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/10">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold tracking-tight">#{selectedOrder.id.slice(0, 8)}</h2>
                    <Badge variant="outline" className={`${getStatusColor(selectedOrder.status)} border-current px-2 py-0.5 text-xs uppercase`}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(selectedOrder.created_at).toLocaleDateString()} at {new Date(selectedOrder.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getPaymentStatusBadge(selectedOrder.payment_status, selectedOrder.paystack_status)}
                  <Button size="sm" variant="outline" onClick={() => openEmailDialog(selectedOrder)}>
                    <Mail className="h-3.5 w-3.5 mr-2" /> Email Customer
                  </Button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Main Content (Left) */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-border/50">
                  <div className="space-y-8">
                    {/* Items Section */}
                    <section>
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground/80">
                        <Package className="h-4 w-4" /> Order Items ({selectedOrder.items?.length || 0})
                      </h3>
                      <div className="space-y-4">
                        {selectedOrder.items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                            <div className="h-16 w-16 rounded-md bg-muted overflow-hidden flex-shrink-0 border">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                  <Package className="h-6 w-6 opacity-20" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-medium text-sm line-clamp-2 pr-4">{item.name}</h4>
                                <span className="font-semibold text-sm">₦{(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{getVendorName(item.vendor_id)}</p>
                              <div className="flex items-center text-xs text-muted-foreground bg-muted/50 w-fit px-2 py-1 rounded">
                                <span>₦{item.price?.toLocaleString()}</span>
                                <span className="mx-1">×</span>
                                <span>{item.quantity}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Financial Summary */}
                    <section className="bg-muted/20 p-4 rounded-lg border">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>₦{(selectedOrder.total_amount + (selectedOrder.promo_discount_applied || 0)).toLocaleString()}</span>
                        </div>
                        {selectedOrder.promo_discount_applied ? (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-₦{selectedOrder.promo_discount_applied.toLocaleString()}</span>
                          </div>
                        ) : null}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-base">
                          <span>Total Paid</span>
                          <span>₦{selectedOrder.total_amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </section>
                    
                    {/* Communications History */}
                    <section>
                      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground/80">
                        <MessageSquare className="h-4 w-4" /> Communication History
                      </h3>
                      <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                        {communicationsLoading ? (
                          <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto"/></div>
                        ) : communications.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">No history</div>
                        ) : (
                          communications.map((comm) => (
                            <div key={comm.id} className="p-3 hover:bg-muted/50 text-sm">
                              <div className="flex justify-between mb-1">
                                <span className="font-medium text-xs">{comm.subject}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(comm.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-muted-foreground line-clamp-1 text-xs">{comm.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </div>

                {/* Sidebar (Right) */}
                <div className="w-full md:w-[320px] bg-muted/10 p-6 space-y-8 h-full overflow-y-auto">
                  {/* Customer */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Customer</h3>
                    <div className="flex items-start gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {selectedOrder.shipping_address?.fullName?.[0] || 'C'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{selectedOrder.shipping_address?.fullName}</p>
                        <p className="text-xs text-muted-foreground">{selectedOrder.customer_email}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{selectedOrder.shipping_address?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5" />
                        <div className="text-xs leading-relaxed">
                          <p>{selectedOrder.shipping_address?.address}</p>
                          <p>{selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state}</p>
                          <p>{selectedOrder.shipping_address?.country || 'Nigeria'}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Management Actions */}
                  <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Management</h3>
                    
                    <div className="space-y-2">
                      <Label className="text-xs">Order Status</Label>
                      <Select
                        value={selectedOrder.status}
                        onValueChange={(value) => updateOrderStatus(selectedOrder.id, value as any)}
                      >
                        <SelectTrigger className="w-full bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedOrder.payment_status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => verifyPayment(selectedOrder.id)}
                          disabled={verifyingOrderId === selectedOrder.id}
                        >
                          {verifyingOrderId === selectedOrder.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
                          Verify
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => manuallyMarkAsPaid(selectedOrder.id)}
                        >
                          <CreditCardIcon className="h-3 w-3 mr-1.5" /> Mark Paid
                        </Button>
                      </div>
                    )}
                  </section>
                  
                  {selectedOrder.promo_wallet_balance !== undefined && (
                    <>
                      <Separator />
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Wallet</h3>
                        <div className="bg-background border rounded p-3">
                          <span className="text-xs text-muted-foreground block mb-1">Promo Balance</span>
                          <span className="font-mono font-medium">₦{selectedOrder.promo_wallet_balance.toLocaleString()}</span>
                        </div>
                      </section>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-20" />
              <p>No order selected</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Order Update</DialogTitle>
            <DialogDescription>
              Send an email notification to the customer regarding Order #{selectedOrder?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Update on your order..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="min-h-[150px]"
                placeholder="Type your message here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
