import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, DollarSign, Package, Target, Activity } from 'lucide-react';

interface FinancialSummary {
  total_revenue: number;
  total_costs: number;
  total_gross_profit: number;
  avg_margin_percentage: number;
  transaction_count: number;
  total_capital: number;
  total_admin: number;
  total_growth: number;
  total_marketing: number;
  profit_based_count: number;
  revenue_based_count: number;
  profit_based_revenue: number;
  profit_based_gross_profit: number;
  revenue_based_total: number;
}

interface ProductAtRisk {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  target_margin_percentage: number;
  actual_margin_percentage: number | null;
  margin_status: string;
  risk_level: string;
  max_safe_discount_percentage: number | null;
  minimum_safe_price: number | null;
}

interface ProductPerformance {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  units_sold: number;
  total_quantity_sold: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  avg_margin_pct: number | null;
}

export function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [productsAtRisk, setProductsAtRisk] = useState<ProductAtRisk[]>([]);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      // Fetch financial summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('profit_bucket_totals')
        .select('*')
        .single();

      if (summaryError) {
        console.error('Error fetching financial summary:', summaryError);
      } else {
        setSummary(summaryData);
      }

      // Fetch products at risk
      const { data: riskData, error: riskError } = await supabase
        .from('products_at_risk')
        .select('*')
        .limit(20);

      if (riskError) {
        console.error('Error fetching products at risk:', riskError);
      } else {
        setProductsAtRisk(riskData || []);
      }

      // Fetch product performance
      const { data: perfData, error: perfError } = await supabase
        .from('product_performance_report')
        .select('*')
        .order('total_profit', { ascending: false, nullsFirst: false })
        .limit(20);

      if (perfError) {
        console.error('Error fetching product performance:', perfError);
      } else {
        setProductPerformance(perfData || []);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'destructive';
      case 'WARNING':
        return 'default';
      case 'MISSING_COST_DATA':
        return 'secondary';
      case 'BELOW_TARGET':
        return 'outline';
      case 'HEALTHY':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'WARNING':
        return <TrendingDown className="h-4 w-4 text-yellow-600" />;
      case 'MISSING_COST_DATA':
        return <Package className="h-4 w-4 text-gray-500" />;
      case 'BELOW_TARGET':
        return <Target className="h-4 w-4 text-blue-500" />;
      case 'HEALTHY':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading financial data...</p>
      </div>
    );
  }

  const profitMargin = summary && summary.total_revenue > 0
    ? (summary.total_gross_profit / summary.total_revenue) * 100
    : 0;

  const dataQualityPercentage = summary
    ? (summary.profit_based_count / (summary.profit_based_count + summary.revenue_based_count)) * 100
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financial Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor profitability, margins, and revenue allocation
        </p>
      </div>

      {/* Data Quality Alert */}
      {summary && summary.revenue_based_count > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Mixed Calculation Methods Detected</AlertTitle>
          <AlertDescription>
            {summary.profit_based_count} orders use profit-based calculation,{' '}
            {summary.revenue_based_count} orders use legacy revenue-based calculation.{' '}
            Data quality: {dataQualityPercentage.toFixed(1)}%. Add cost prices to products for accurate profit tracking.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{summary?.total_costs?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Cost of goods sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₦{summary?.total_gross_profit?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue - Costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitMargin >= 30 ? 'text-green-600' : profitMargin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
              {profitMargin.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target: 30%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="allocation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="allocation">Revenue Allocation</TabsTrigger>
          <TabsTrigger value="risk">Products at Risk</TabsTrigger>
          <TabsTrigger value="performance">Product Performance</TabsTrigger>
        </TabsList>

        {/* Revenue Allocation Tab */}
        <TabsContent value="allocation" className="space-y-4">
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

          {summary && summary.profit_based_count > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Profit-Based Calculation Summary</CardTitle>
                <CardDescription>
                  Orders with complete cost data ({summary.profit_based_count} orders)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-lg font-semibold">
                      ₦{summary.profit_based_revenue?.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Profit</p>
                    <p className="text-lg font-semibold text-green-600">
                      ₦{summary.profit_based_gross_profit?.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Margin</p>
                    <p className="text-lg font-semibold">
                      {((summary.profit_based_gross_profit / summary.profit_based_revenue) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Products at Risk Tab */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Products Requiring Attention</CardTitle>
              <CardDescription>
                Products with missing cost data or margins below safe thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Min Safe Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsAtRisk.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        <div className="py-8">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                          <p>All products are healthy! No products at risk.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    productsAtRisk.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{getRiskIcon(product.risk_level)}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>₦{product.price.toLocaleString()}</TableCell>
                        <TableCell>
                          {product.cost_price !== null ? (
                            `₦${product.cost_price.toLocaleString()}`
                          ) : (
                            <span className="text-muted-foreground text-xs">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.actual_margin_percentage !== null ? (
                            <span
                              className={
                                product.actual_margin_percentage >= 30
                                  ? 'text-green-600'
                                  : product.actual_margin_percentage >= 20
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }
                            >
                              {product.actual_margin_percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRiskBadgeColor(product.risk_level)}>
                            {product.risk_level.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.minimum_safe_price !== null ? (
                            `₦${product.minimum_safe_price.toLocaleString()}`
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Profitability</CardTitle>
              <CardDescription>Products ranked by total profit contribution</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No sales data available yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    productPerformance.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.total_quantity_sold || 0}</TableCell>
                        <TableCell>₦{product.total_revenue?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}</TableCell>
                        <TableCell>
                          {product.total_cost !== null ? (
                            `₦${product.total_cost.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className={product.total_profit > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          ₦{product.total_profit?.toLocaleString('en-NG', { minimumFractionDigits: 2 }) || '0.00'}
                        </TableCell>
                        <TableCell>
                          {product.avg_margin_pct !== null ? (
                            <span
                              className={
                                product.avg_margin_pct >= 30
                                  ? 'text-green-600'
                                  : product.avg_margin_pct >= 20
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }
                            >
                              {product.avg_margin_pct.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
