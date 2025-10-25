import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RevenueData } from '@/utils/analytics';

interface RevenueChartProps {
  data: RevenueData[];
  period: 'day' | 'week' | 'month';
  onPeriodChange: (period: 'day' | 'week' | 'month') => void;
  loading?: boolean;
}

export function RevenueChart({ data, period, onPeriodChange, loading }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Revenue Overview</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={period === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange('day')}
            >
              Daily
            </Button>
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange('week')}
            >
              Weekly
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange('month')}
            >
              Monthly
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No data available for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') return `₦${value.toLocaleString()}`;
                  return value;
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Revenue (₦)"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="orders" 
                stroke="hsl(var(--secondary))" 
                strokeWidth={2}
                name="Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
