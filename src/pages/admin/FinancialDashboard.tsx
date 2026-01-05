import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Target, Activity } from 'lucide-react';

interface FinancialSummary {
  total_revenue: number | null;
  total_capital: number | null;
  total_admin: number | null;
  total_growth: number | null;
  total_marketing: number | null;
  transaction_count: number | null;
}

export function FinancialDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const { data: summaryData, error: summaryError } = await supabase
        .from('profit_bucket_totals')
        .select('*')
        .single();

      if (summaryError) {
        console.error('Error fetching financial summary:', summaryError);
      } else {
        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financial Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor revenue allocation across business buckets
        </p>
      </div>

      {/* Summary Cards */}
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
    </div>
  );
}
