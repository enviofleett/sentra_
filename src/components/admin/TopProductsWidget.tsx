import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductAnalytics } from '@/utils/analytics';
import { TrendingUp } from 'lucide-react';

interface TopProductsWidgetProps {
  products: ProductAnalytics[];
  loading?: boolean;
  type: 'views' | 'purchases';
}

export function TopProductsWidget({ products, loading, type }: TopProductsWidgetProps) {
  const title = type === 'views' ? 'Top Products by Views' : 'Top Products by Sales';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No data available</p>
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => (
              <div 
                key={product.id} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                {product.image_url && (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {type === 'views' 
                      ? `${product.views} views` 
                      : `${product.purchases} sold • ₦${product.revenue.toLocaleString()}`
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
