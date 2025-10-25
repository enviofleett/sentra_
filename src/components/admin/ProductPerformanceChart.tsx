import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ProductAnalytics } from '@/utils/analytics';

interface ProductPerformanceChartProps {
  viewsData: ProductAnalytics[];
  purchasesData: ProductAnalytics[];
  loading?: boolean;
}

export function ProductPerformanceChart({ viewsData, purchasesData, loading }: ProductPerformanceChartProps) {
  // Merge views and purchases data
  const mergedData = viewsData.slice(0, 8).map(product => {
    const purchaseData = purchasesData.find(p => p.id === product.id);
    const conversion = product.views > 0 ? (purchaseData?.purchases || 0) / product.views * 100 : 0;
    
    return {
      name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
      views: product.views,
      purchases: purchaseData?.purchases || 0,
      conversion: conversion.toFixed(1)
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Performance (Views vs Purchases)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        ) : mergedData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">No product data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={mergedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'conversion') return `${value}%`;
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" />
              <Bar dataKey="purchases" fill="hsl(var(--secondary))" name="Purchases" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
