import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { supabase } from '@/integrations/supabase/client';
import { Download, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subDays, startOfWeek, startOfMonth, startOfYear, endOfDay, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

export default function TaxReports() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [stats, setStats] = useState({
    totalTax: 0,
    totalOrders: 0,
    averageTax: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [dateRange, period]);

  const fetchReportData = async () => {
    if (!dateRange?.from) return;

    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('created_at, tax, total_amount')
        .gte('created_at', dateRange.from.toISOString())
        .not('tax', 'is', null); // Only orders with tax

      if (dateRange.to) {
        query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        // Calculate Summary Stats
        const totalTax = data.reduce((sum, order) => sum + (order.tax || 0), 0);
        setStats({
          totalTax,
          totalOrders: data.length,
          averageTax: data.length > 0 ? totalTax / data.length : 0
        });

        // Process Chart Data based on Period
        const groupedData = groupDataByPeriod(data, period);
        setChartData(groupedData);
      }
    } catch (error) {
      console.error('Error fetching tax reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupDataByPeriod = (data: any[], period: string) => {
    const groups: Record<string, number> = {};

    data.forEach(order => {
      const date = new Date(order.created_at);
      let key = '';

      if (period === 'daily') key = format(date, 'MMM dd');
      else if (period === 'weekly') key = `W${format(date, 'w')}`;
      else if (period === 'monthly') key = format(date, 'MMM yyyy');
      else if (period === 'yearly') key = format(date, 'yyyy');

      groups[key] = (groups[key] || 0) + (order.tax || 0);
    });

    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  };

  const handleExport = () => {
    if (!chartData.length) return;

    const csv = Papa.unparse(chartData.map(item => ({
      Period: item.name,
      'VAT Collected (₦)': item.value.toFixed(2)
    })));

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vat_report_${period}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">VAT Reporting</h2>
          <p className="text-muted-foreground">Analyze tax collection trends and export financial data.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={loading || chartData.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full md:w-auto">
             <label className="text-sm font-medium mb-1 block">Date Range</label>
             <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
          <div className="w-full md:w-[200px]">
             <label className="text-sm font-medium mb-1 block">Grouping</label>
             <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="daily">Daily</SelectItem>
                 <SelectItem value="weekly">Weekly</SelectItem>
                 <SelectItem value="monthly">Monthly</SelectItem>
                 <SelectItem value="yearly">Yearly</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total VAT Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.totalTax.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">in selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxable Orders</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">processed orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. VAT per Order</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.averageTax.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Trends</CardTitle>
          <CardDescription>VAT revenue over time grouped by {period}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `₦${value}`} 
                  />
                  <Tooltip 
                    formatter={(value: number) => [`₦${value.toLocaleString()}`, 'VAT']}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="value" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                No data available for this period
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
