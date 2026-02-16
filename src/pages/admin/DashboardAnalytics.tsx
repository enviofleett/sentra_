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

interface ConsultantKpis {
  engagements: number;
  opens: number;
  chats: number;
  conversionsProxy: number;
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
  const [consultant, setConsultant] = useState<ConsultantKpis>({ engagements: 0, opens: 0, chats: 0, conversionsProxy: 0 });

  useEffect(() => {
    fetchAnalytics();
    fetchChartData();
    fetchConsultantKpis();
  }, []);

  useEffect(() => {
    fetchRevenueData();
  }, [revenuePeriod]);

  const fetchAnalytics = async () => {
    // CRITICAL: Only count paid orders (paystack_status = 'success') for revenue calculations
    const [productsRes, ordersRes] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('orders').select('total_amount, status, created_at').eq('paystack_status', 'success'),
    ]);

    const totalProducts = productsRes.count || 0;
    const orders = ordersRes.data || [];
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    
    const today = startOfDay(new Date());
    const todayRevenue = orders
      .filter(o => o.created_at && new Date(o.created_at as string) >= today)
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

  const fetchConsultantKpis = async () => {
    const since = startOfDay(new Date());
    const types = [
      { key: 'engagements', event: 'engaged_prompt_shown' },
      { key: 'opens', event: 'opened_consultant' },
      { key: 'chats', event: 'message_sent' },
      { key: 'conversionsProxy', event: 'added_to_cart_after_consult' },
    ] as const;
    const results = await Promise.all(
      types.map(t =>
        supabase
          .from('consultant_engagements' as any)
          .select('id', { count: 'exact', head: true })
          .gte('created_at', since.toISOString())
          .eq('event_type', t.event)
      )
    );
    setConsultant({
      engagements: results[0].count || 0,
      opens: results[1].count || 0,
      chats: results[2].count || 0,
      conversionsProxy: results[3].count || 0,
    });
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
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your store performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consultant (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-1">
              <span>Engagements</span><span className="text-right font-semibold">{consultant.engagements}</span>
              <span>Opens</span><span className="text-right font-semibold">{consultant.opens}</span>
              <span>Chats</span><span className="text-right font-semibold">{consultant.chats}</span>
              <span>Conversions</span><span className="text-right font-semibold">{consultant.conversionsProxy}</span>
            </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <OrderStatusChart data={orderStatusData} />
        <TopProductsWidget products={topProducts} type="purchases" />
      </div>
    </div>
  );
}
