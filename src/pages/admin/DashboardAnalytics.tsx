import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueChart } from '@/components/admin/RevenueChart';
import { OrderStatusChart } from '@/components/admin/OrderStatusChart';
import { TopProductsWidget } from '@/components/admin/TopProductsWidget';
import { 
  getRevenueByPeriod, 
  getOrderStatusBreakdown, 
  getTopProductsByViews,
  getTopProductsByPurchases,
  RevenueData,
  OrderStatusBreakdown,
  ProductAnalytics
} from '@/utils/analytics';
import { Package, ShoppingCart, DollarSign, AlertCircle } from 'lucide-react';
import { startOfDay, format } from 'date-fns';

interface Analytics {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  todayRevenue: number;
}

export function DashboardAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState<'day' | 'week' | 'month'>('day');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusBreakdown[]>([]);
  const [topProducts, setTopProducts] = useState<ProductAnalytics[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchChartData();
  }, []);

  useEffect(() => {
    fetchRevenueData();
  }, [revenuePeriod]);

  const fetchAnalytics = async () => {
    // CRITICAL: Only count paid orders (paystack_status = 'success') for revenue calculations
    const [productsRes, ordersRes] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total_amount, status, created_at').eq('paystack_status', 'success'),
    ]);

    const totalProducts = productsRes.count || 0;
    const orders = ordersRes.data || [];
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    
    const today = startOfDay(new Date());
    const todayRevenue = orders
      .filter(o => new Date(o.created_at) >= today)
      .reduce((sum, order) => sum + Number(order.total_amount), 0);

    setAnalytics({
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
      todayRevenue,
    });
    setLoading(false);
  };

  const fetchRevenueData = async () => {
    setChartsLoading(true);
    try {
      const data = await getRevenueByPeriod(revenuePeriod);
      setRevenueData(data);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setChartsLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const [statusData, topByPurchases] = await Promise.all([
        getOrderStatusBreakdown(),
        getTopProductsByPurchases(7, 5)
      ]);
      
      setOrderStatusData(statusData);
      setTopProducts(topByPurchases);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your store performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{analytics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time earnings</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{analytics.todayRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(), 'MMM dd, yyyy')}</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
            {analytics.pendingOrders > 0 && (
              <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {analytics.pendingOrders} pending
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">In catalog</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <RevenueChart 
        data={revenueData}
        period={revenuePeriod}
        onPeriodChange={setRevenuePeriod}
        loading={chartsLoading}
      />

      {/* Bottom Row - Order Status & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrderStatusChart data={orderStatusData} />
        <TopProductsWidget products={topProducts} type="purchases" />
      </div>
    </div>
  );
}
