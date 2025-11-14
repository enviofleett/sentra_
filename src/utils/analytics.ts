import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths, format } from 'date-fns';

/**
 * CRITICAL BUSINESS RULE:
 * All revenue calculations MUST only include orders with paystack_status = 'success'
 * This ensures revenue reflects only paid orders, not pending/failed payments.
 * 
 * The paystack_status field is set by the paystack-webhook edge function:
 * - 'success': Payment confirmed by Paystack webhook
 * - 'failed': Payment failed
 * - 'amount_mismatch': Payment amount doesn't match order total
 * - null: Payment not yet attempted/completed
 */

export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProductAnalytics {
  id: string;
  name: string;
  views: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
  image_url?: string;
}

export interface OrderStatusBreakdown {
  status: string;
  count: number;
  total_value: number;
}

export interface OrderMetrics {
  avgOrderValue: number;
  avgProcessingTime: number;
  fulfillmentRate: number;
  totalOrders: number;
}

// Revenue Analytics
export async function getRevenueByPeriod(period: 'day' | 'week' | 'month'): Promise<RevenueData[]> {
  let startDate: Date;
  let dateFormat: string;
  let intervals: number;

  switch (period) {
    case 'day':
      startDate = subDays(new Date(), 30);
      dateFormat = 'MMM dd';
      intervals = 30;
      break;
    case 'week':
      startDate = subWeeks(new Date(), 12);
      dateFormat = 'MMM dd';
      intervals = 12;
      break;
    case 'month':
      startDate = subMonths(new Date(), 12);
      dateFormat = 'MMM yyyy';
      intervals = 12;
      break;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total_amount, status')
    .gte('created_at', startDate.toISOString())
    .neq('status', 'cancelled')
    .eq('paystack_status', 'success'); // Only count paid orders

  if (error) throw error;

  const revenueMap = new Map<string, { revenue: number; orders: number }>();

  data?.forEach(order => {
    const dateKey = format(new Date(order.created_at), dateFormat);
    const current = revenueMap.get(dateKey) || { revenue: 0, orders: 0 };
    revenueMap.set(dateKey, {
      revenue: current.revenue + Number(order.total_amount),
      orders: current.orders + 1
    });
  });

  return Array.from(revenueMap.entries()).map(([date, data]) => ({
    date,
    ...data
  }));
}

// Product Analytics - Using orders table
export async function getTopProductsByViews(days: number, limit: number = 10): Promise<ProductAnalytics[]> {
  const startDate = subDays(new Date(), days);

  // Get products from recent orders
  const { data, error } = await supabase
    .from('orders')
    .select('items')
    .eq('paystack_status', 'success')
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const productCounts = new Map<string, { name: string; count: number; revenue: number }>();
  
  data?.forEach(order => {
    const items = order.items as any[];
    items?.forEach((item: any) => {
      const current = productCounts.get(item.product_id) || { name: item.name, count: 0, revenue: 0 };
      productCounts.set(item.product_id, {
        name: item.name,
        count: current.count + 1,
        revenue: current.revenue + (item.price * item.quantity)
      });
    });
  });

  return Array.from(productCounts.entries())
    .map(([id, data]) => ({
      id,
      name: data.name || 'Unknown',
      views: data.count,
      purchases: data.count,
      revenue: data.revenue,
      conversion_rate: 100
    }))
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, limit);
}

export async function getTopProductsByPurchases(days: number, limit: number = 10): Promise<ProductAnalytics[]> {
  return getTopProductsByViews(days, limit);
}

// Order Analytics
export async function getOrderStatusBreakdown(): Promise<OrderStatusBreakdown[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('status, total_amount')
    .eq('paystack_status', 'success'); // Only count paid orders

  if (error) throw error;

  const breakdown = new Map<string, { count: number; total: number }>();

  data?.forEach(order => {
    const current = breakdown.get(order.status) || { count: 0, total: 0 };
    breakdown.set(order.status, {
      count: current.count + 1,
      total: current.total + Number(order.total_amount)
    });
  });

  return Array.from(breakdown.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    total_value: data.total
  }));
}

export async function getOrdersTimeline(days: number): Promise<{ date: string; pending: number; processing: number; shipped: number; delivered: number; cancelled: number }[]> {
  const startDate = subDays(new Date(), days);

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, status')
    .gte('created_at', startDate.toISOString())
    .eq('paystack_status', 'success'); // Only count paid orders

  if (error) throw error;

  const timeline = new Map<string, any>();

  data?.forEach(order => {
    const dateKey = format(new Date(order.created_at), 'MMM dd');
    const current = timeline.get(dateKey) || { 
      date: dateKey, 
      pending: 0, 
      processing: 0, 
      shipped: 0, 
      delivered: 0, 
      cancelled: 0 
    };
    
    current[order.status] = (current[order.status] || 0) + 1;
    timeline.set(dateKey, current);
  });

  return Array.from(timeline.values());
}

export async function getAverageOrderMetrics(): Promise<OrderMetrics> {
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount, status, created_at')
    .eq('paystack_status', 'success'); // Only count paid orders

  if (error) throw error;

  const totalOrders = data?.length || 0;
  const totalRevenue = data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
  const deliveredOrders = data?.filter(o => o.status === 'delivered').length || 0;

  return {
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    avgProcessingTime: 0, // Would need updated_at tracking
    fulfillmentRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
    totalOrders
  };
}
