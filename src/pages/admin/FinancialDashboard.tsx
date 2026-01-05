import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, AlertTriangle, Activity, Package, BarChart3 } from 'lucide-react';

interface FinancialSummary {
  total_revenue: number | null;
  total_capital: number | null;
  total_admin: number | null;
  total_growth: number | null;
  total_marketing: number | null;
  transaction_count: number | null;
}

interface Profitability {
  total_products: number;
  products_with_cost_data: number;
  cost_data_coverage_pct: number;
  profitable_products: number;
  unprofitable_products: number;
  low_margin_products: number;
  avg_margin_percentage: number;
  total_potential_margin: number;
  total_inventory_cost: number;
  total_inventory_value: number;
}

interface ProductAtRisk {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  margin_amount: number | null;
  margin_percentage: number | null;
  risk_status: string;
}

export function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [profitability, setProfitability] = useState<Profitability | null>(null);
  const [productsAtRisk, setProductsAtRisk] = useState<ProductAtRisk[]>([]);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [summaryResult, profitabilityResult, riskResult] = await Promise.all([
        supabase.from('profit_bucket_totals').select('*').single(),
        supabase.from('product_profitability').select('*').single(),
        supabase.from('products_at_risk').select('*').limit(20)
      ]);

      if (summaryResult.error) {
        console.error('Error fetching financial summary:', summaryResult.error);
      } else {
        setSummary(summaryResult.data);
      }

      if (profitabilityResult.error) {
        console.error('Error fetching profitability:', profitabilityResult.error);
      } else {
        setProfitability(profitabilityResult.data);
      }

      if (riskResult.error) {
        console.error('Error fetching products at risk:', riskResult.error);
      } else {
        setProductsAtRisk(riskResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (status: string) => {
    switch (status) {
      case 'negative_margin':
        return <Badge variant="destructive">Negative Margin</Badge>;
      case 'low_margin':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Low Margin</Badge>;
      case 'no_cost_data':
        return <Badge variant="secondary">No Cost Data</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading financial data...</p>
      </div>
    );
  }

  const negativeMarginProducts = productsAtRisk.filter(p => p.risk_status === 'negative_margin');
  const lowMarginProducts = productsAtRisk.filter(p => p.risk_status === 'low_margin');
  const noCostDataProducts = productsAtRisk.filter(p => p.risk_status === 'no_cost_data');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financial Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor revenue allocation and product profitability
        </p>
      </div>

      {/* Profitability Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Data Coverage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profitability?.cost_data_coverage_pct?.toFixed(1) || 0}%
            </div>
            <Progress 
              value={profitability?.cost_data_coverage_pct || 0} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {profitability?.products_with_cost_data || 0} of {profitability?.total_products || 0} products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (profitability?.avg_margin_percentage || 0) < 20 
                ? 'text-yellow-600' 
                : 'text-green-600'
            }`}>
              {profitability?.avg_margin_percentage?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across products with cost data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products at Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {(profitability?.unprofitable_products || 0) + (profitability?.low_margin_products || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {profitability?.unprofitable_products || 0} negative, {profitability?.low_margin_products || 0} low margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{(profitability?.total_inventory_value || 0).toLocaleString('en-NG')}
            </div>
            <p className="text-xs text-muted-foreground">
              Cost: ₦{(profitability?.total_inventory_cost || 0).toLocaleString('en-NG')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{summary?.total_revenue?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              From {summary?.transaction_count || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₦{(
                (summary?.total_capital || 0) +
                (summary?.total_admin || 0) +
                (summary?.total_growth || 0) +
                (summary?.total_marketing || 0)
              ).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined bucket allocations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Allocation Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Revenue Allocation Buckets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Capital (Restocking)</CardTitle>
              <CardDescription>40% allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{summary?.total_capital?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Admin (Operations)</CardTitle>
              <CardDescription>20% allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{summary?.total_admin?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Growth (Expansion)</CardTitle>
              <CardDescription>25% allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{summary?.total_growth?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Marketing (Ads)</CardTitle>
              <CardDescription>15% allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦{summary?.total_marketing?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Products at Risk Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Products at Risk ({productsAtRisk.length})
          </CardTitle>
          <CardDescription>
            Products with negative margins, low margins (&lt;20%), or missing cost data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsAtRisk.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>All products have healthy margins!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsAtRisk.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">
                      ₦{product.price.toLocaleString('en-NG')}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.cost_price 
                        ? `₦${product.cost_price.toLocaleString('en-NG')}` 
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {product.margin_percentage !== null ? (
                        <span className={
                          product.margin_percentage < 0 
                            ? 'text-red-600 font-medium' 
                            : product.margin_percentage < 20 
                              ? 'text-yellow-600 font-medium'
                              : 'text-green-600'
                        }>
                          {product.margin_percentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{product.stock_quantity}</TableCell>
                    <TableCell>{getRiskBadge(product.risk_status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
