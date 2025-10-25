import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { OrderStatusBreakdown } from '@/utils/analytics';

interface OrderStatusChartProps {
  data: OrderStatusBreakdown[];
  loading?: boolean;
}

const COLORS = {
  pending: '#eab308',
  processing: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

export function OrderStatusChart({ data, loading }: OrderStatusChartProps) {
  const chartData = data.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    status: item.status
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS] || '#999'} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value} orders`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
