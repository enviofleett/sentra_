import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Sparkles, Crown } from 'lucide-react';
import { CountdownBadge } from '@/components/groupbuy/CountdownBadge';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url?: string;
  images?: string[];
  vendors?: { rep_full_name: string };
  group_buy_campaigns?: {
    id: string;
    status: string;
    discount_price: number;
    expiry_at: string;
  };
}

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
  columns?: 3 | 4;
}

export function ProductGrid({ 
  products, 
  loading = false, 
  title, 
  subtitle,
  showViewAll = true,
  columns = 4 
}: ProductGridProps) {
  const isGroupBuyActive = (campaign: any): boolean => {
    if (!campaign) return false;
    const now = new Date();
    const expiry = new Date(campaign.expiry_at);
    return expiry > now && ['active', 'goal_reached', 'goal_met_pending_payment'].includes(campaign.status);
  };

  const gridCols = columns === 3 
    ? 'grid-cols-2 lg:grid-cols-3' 
    : 'grid-cols-2 lg:grid-cols-4';

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          {title && (
            <div className="text-center mb-12">
              {subtitle && <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">{subtitle}</p>}
              <h2 className="text-3xl md:text-4xl font-serif">{title}</h2>
            </div>
          )}
          <div className={`grid ${gridCols} gap-4 md:gap-6`}>
            {[...Array(columns)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-accent rounded-lg mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {title && (
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {subtitle && <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">{subtitle}</p>}
            <h2 className="text-3xl md:text-4xl font-serif">{title}</h2>
          </motion.div>
        )}

        <div className={`grid ${gridCols} gap-4 md:gap-6`}>
          {products.map((product, index) => {
            const displayImage = product.images && Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]
              : product.image_url;
            
            const campaign = product.group_buy_campaigns;
            const hasActiveGroupBuy = isGroupBuyActive(campaign);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link to={`/products/${product.id}`} className="group block">
                  <Card className="overflow-hidden border-0 bg-transparent">
                    <div className="relative aspect-square bg-accent rounded-lg overflow-hidden">
                      {hasActiveGroupBuy && campaign && (
                        <>
                          <Badge className="absolute top-2 left-2 z-10 bg-foreground text-background text-[10px]">
                            <Crown className="w-3 h-3 mr-1" />
                            Circle
                          </Badge>
                          <CountdownBadge 
                            expiryAt={campaign.expiry_at} 
                            className="absolute top-2 right-2 z-10"
                          />
                        </>
                      )}
                      
                      {displayImage ? (
                        <div className="w-full h-full p-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                          <img 
                            src={displayImage} 
                            alt={product.name}
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                      )}

                      {/* Quick Add Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button 
                          size="sm" 
                          className="w-full bg-foreground/90 hover:bg-foreground text-background text-xs h-9 rounded-full backdrop-blur-sm"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                    
                    <CardContent className="p-3 pt-4 space-y-1">
                      {product.vendors?.rep_full_name && (
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {product.vendors.rep_full_name}
                        </p>
                      )}
                      <h3 className="font-medium text-sm line-clamp-2 leading-snug">
                        {product.name}
                      </h3>
                      <div className="flex items-baseline gap-2 pt-1">
                        {hasActiveGroupBuy && campaign ? (
                          <>
                            <span className="text-base font-medium">
                              ₦{campaign.discount_price?.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground line-through">
                              ₦{product.price?.toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-base font-medium">
                              ₦{product.price?.toLocaleString()}
                            </span>
                            {product.original_price && product.original_price > product.price && (
                              <span className="text-xs text-muted-foreground line-through">
                                ₦{product.original_price?.toLocaleString()}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {showViewAll && (
          <motion.div 
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Button asChild variant="outline" size="lg" className="px-10 h-12 rounded-full text-sm tracking-wider">
              <Link to="/products">View All Products</Link>
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
