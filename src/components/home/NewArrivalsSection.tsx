import { Link } from 'react-router-dom';
import { Sparkles, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  image_url?: string;
  images?: string[];
  stock_quantity?: number;
  vendors?: { rep_full_name: string };
  group_buy_campaigns?: {
    id: string;
    status: string;
    discount_price: number;
    expiry_at: string;
  };
}

interface NewArrivalsSectionProps {
  products: Product[];
  loading?: boolean;
}

export function NewArrivalsSection({ products, loading = false }: NewArrivalsSectionProps) {
  const { addToCart } = useCart();

  const isGroupBuyActive = (campaign: any): boolean => {
    if (!campaign) return false;
    const now = new Date();
    const expiry = new Date(campaign.expiry_at);
    return expiry > now && ['active', 'goal_reached', 'goal_met_pending_payment'].includes(campaign.status);
  };

  const handleQuickAdd = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(productId, 1);
  };

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
             <Skeleton className="h-6 w-32 mx-auto mb-4" />
             <Skeleton className="h-10 w-64 mx-auto mb-4" />
             <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse border border-border bg-card p-3">
                <div className="h-4 bg-muted/40 rounded w-3/4 mx-auto mb-3" />
                <div className="aspect-square bg-muted/30 mb-3" />
                <div className="h-3 bg-muted/40 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header - Matching ArticlesSection UI */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="outline" className="mb-4 text-xs tracking-widest uppercase">
            <Sparkles className="h-3 w-3 mr-1" />
            Fresh Drops
          </Badge>
          <h2 className="text-3xl md:text-5xl font-serif mb-4">New Arrivals</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Discover the latest additions to our curated collection
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {products.map((product, index) => {
            const displayImage = product.images && Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]
              : product.image_url;
            
            const campaign = product.group_buy_campaigns;
            const hasActiveGroupBuy = isGroupBuyActive(campaign);
            const isOnSale = hasActiveGroupBuy || (product.original_price && product.original_price > product.price);
            
            // Determine prices to display
            const currentPrice = hasActiveGroupBuy && campaign 
              ? campaign.discount_price 
              : product.price;
            const originalPrice = hasActiveGroupBuy && campaign 
              ? product.price 
              : product.original_price;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.03 }}
              >
                <Link 
                  to={`/products/${product.id}`} 
                  className="group block border border-border bg-card hover:border-l-4 hover:border-l-coral transition-all duration-200"
                >
                  {/* Product Name - TOP */}
                  <div className="py-3 px-2 border-b border-border/50">
                    <h3 className="text-xs md:text-sm text-center text-foreground line-clamp-2 leading-relaxed">
                      {product.name}
                    </h3>
                  </div>
                  
                  {/* Product Image - MIDDLE */}
                  <div className="aspect-square p-4 md:p-6 flex items-center justify-center bg-background relative">
                    {displayImage ? (
                      <img 
                        src={displayImage} 
                        alt={product.name}
                        className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <Sparkles className="h-8 w-8 text-muted-foreground/20" />
                    )}
                    
                    {/* Quick Add Button */}
                    <Button
                      size="sm"
                      onClick={(e) => handleQuickAdd(e, product.id)}
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-foreground text-background hover:bg-foreground/90 text-xs px-3 py-1 h-auto gap-1"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      Quick Add
                    </Button>
                  </div>
                  
                  {/* Price - BOTTOM */}
                  <div className="py-3 px-2 border-t border-border/50 flex items-center justify-center gap-2">
                    {isOnSale && originalPrice ? (
                      <>
                        <span className="text-xs md:text-sm text-muted-foreground line-through">
                          ₦{originalPrice.toLocaleString()}
                        </span>
                        <span className="text-xs md:text-sm font-medium text-coral">
                          ₦{currentPrice.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs md:text-sm font-medium text-foreground">
                        ₦{currentPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Link 
            to="/products?sort=newest" 
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all New Arrivals
            <Sparkles className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
