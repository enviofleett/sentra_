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

// Product Analytics
export async function getTopProductsByViews(days: number, limit: number = 10): Promise<ProductAnalytics[]> {
  const startDate = subDays(new Date(), days);

  const { data, error } = await supabase
    .from('product_analytics')
    .select(`
      product_id,
      products (id, name, image_url, price)
    `)
    .eq('event_type', 'view')
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const viewCounts = new Map<string, { product: any; count: number }>();
  
  data?.forEach(record => {
    const productId = record.product_id;
    const current = viewCounts.get(productId);
    if (current) {
      current.count++;
    } else {
      viewCounts.set(productId, { product: record.products, count: 1 });
    }
  });

  return Array.from(viewCounts.entries())
    .map(([id, data]) => ({
      id,
      name: data.product?.name || 'Unknown',
      image_url: data.product?.image_url,
      views: data.count,
      purchases: 0,
      revenue: 0,
      conversion_rate: 0
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export async function getTopProductsByPurchases(days: number, limit: number = 10): Promise<ProductAnalytics[]> {
  const startDate = subDays(new Date(), days);

  const { data, error } = await supabase
    .from('product_analytics')
    .select(`
      product_id,
      quantity,
      products (id, name, image_url, price)
    `)
    .eq('event_type', 'purchase')
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  const purchaseCounts = new Map<string, { product: any; count: number; revenue: number }>();
  
  data?.forEach(record => {
    const productId = record.product_id;
    const current = purchaseCounts.get(productId);
    const qty = record.quantity || 1;
    const price = Number(record.products?.price || 0);
    
    if (current) {
      current.count += qty;
      current.revenue += price * qty;
    } else {
      purchaseCounts.set(productId, { 
        product: record.products, 
        count: qty,
        revenue: price * qty
      });
    }
  });

  return Array.from(purchaseCounts.entries())
    .map(([id, data]) => ({
      id,
      name: data.product?.name || 'Unknown',
      image_url: data.product?.image_url,
      views: 0,
      purchases: data.count,
      revenue: data.revenue,
      conversion_rate: 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
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
