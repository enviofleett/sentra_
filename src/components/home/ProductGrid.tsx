import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Crown } from 'lucide-react';
import { CountdownBadge } from '@/components/groupbuy/CountdownBadge';
import { motion } from 'framer-motion';
import { ProductImage } from '@/components/product/ProductImage';

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

  // Mobile-first: 2 cols, then scale up
  const gridCols = columns === 3 
    ? 'grid-cols-2 md:grid-cols-3' 
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  if (loading) {
    return (
      <section className="py-12 md:py-20 lg:py-28 bg-[#fafafa]">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {title && (
            <div className="text-center mb-10 md:mb-16">
              {subtitle && <p className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground/70 mb-2">{subtitle}</p>}
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif font-normal tracking-tight">{title}</h2>
            </div>
          )}
          <div className={`grid ${gridCols} gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14 lg:gap-x-8 lg:gap-y-16`}>
            {[...Array(columns)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-muted/30 rounded-sm mb-4" />
                <div className="h-2.5 bg-muted/30 rounded w-1/3 mb-2.5" />
                <div className="h-3 bg-muted/30 rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted/30 rounded w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-20 lg:py-28 bg-[#fafafa]">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        {title && (
          <motion.div 
            className="text-center mb-10 md:mb-16"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {subtitle && <p className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground/70 mb-2">{subtitle}</p>}
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif font-normal tracking-tight">{title}</h2>
          </motion.div>
        )}

        <div className={`grid ${gridCols} gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14 lg:gap-x-8 lg:gap-y-16`}>
          {products.map((product, index) => {
            const displayImage = product.images && Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]
              : product.image_url;
            
            const campaign = product.group_buy_campaigns;
            const hasActiveGroupBuy = isGroupBuyActive(campaign);
            const isOnSale = product.original_price && product.original_price > product.price;
            const isInStock = product.stock_quantity === undefined || product.stock_quantity > 0;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.04, ease: "easeOut" }}
              >
                <Link to={`/products/${product.id}`} className="group block">
                  {/* Floating Product Container - No background, no border */}
                  <div className="relative">
                    {/* Badges - Refined pills */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      {isInStock && (
                        <span className="inline-flex items-center px-2 py-0.5 text-[9px] md:text-[10px] font-medium tracking-wide uppercase bg-emerald-50 text-emerald-700 rounded-full">
                          In Stock
                        </span>
                      )}
                      {(isOnSale || hasActiveGroupBuy) && (
                        <span className="inline-flex items-center px-2 py-0.5 text-[9px] md:text-[10px] font-medium tracking-wide uppercase bg-rose-50 text-rose-600 rounded-full">
                          Sale
                        </span>
                      )}
                      {hasActiveGroupBuy && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] md:text-[10px] font-medium tracking-wide uppercase bg-neutral-100 text-neutral-700 rounded-full">
                          <Crown className="w-2.5 h-2.5" />
                          Circle
                        </span>
                      )}
                    </div>

                    {/* Countdown - Subtle positioning */}
                    {hasActiveGroupBuy && campaign && (
                      <CountdownBadge 
                        expiryAt={campaign.expiry_at} 
                        className="absolute top-2 right-2 z-10"
                      />
                    )}

                    {/* Product Image - Floating with showroom shadow */}
                    <div className="aspect-[4/5] flex items-center justify-center p-4 md:p-6 lg:p-8">
                      <div 
                        className="relative w-full h-full flex items-center justify-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                      >
                        {/* Showroom-style shadow - appears under the product */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-4 bg-black/[0.06] blur-xl rounded-full transition-all duration-500 ease-out group-hover:w-[75%] group-hover:bg-black/[0.08]" />
                        
                        {displayImage ? (
                          <ProductImage 
                            src={displayImage} 
                            alt={product.name}
                            className="relative max-w-full max-h-full"
                            enableBackgroundRemoval={true}
                          />
                        ) : (
                          <Sparkles className="h-8 w-8 text-muted-foreground/15" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Product Info - Minimal typography */}
                  <div className="mt-4 md:mt-5 space-y-1 text-center">
                    {product.vendors?.rep_full_name && (
                      <p className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 font-light">
                        {product.vendors.rep_full_name}
                      </p>
                    )}
                    <h3 className="text-sm md:text-[15px] font-normal text-foreground/90 line-clamp-2 leading-relaxed tracking-tight">
                      {product.name}
                    </h3>
                    <div className="flex items-baseline justify-center gap-2 pt-0.5">
                      {hasActiveGroupBuy && campaign ? (
                        <>
                          <span className="text-sm md:text-base font-medium text-foreground tracking-tight">
                            ₦{campaign.discount_price?.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground/50 line-through font-light">
                            ₦{product.price?.toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm md:text-base font-medium text-foreground tracking-tight">
                            ₦{product.price?.toLocaleString()}
                          </span>
                          {product.original_price && product.original_price > product.price && (
                            <span className="text-xs text-muted-foreground/50 line-through font-light">
                              ₦{product.original_price?.toLocaleString()}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {showViewAll && (
          <motion.div 
            className="text-center mt-14 md:mt-20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button 
              asChild 
              variant="outline" 
              className="px-8 md:px-12 h-11 md:h-12 rounded-none text-xs md:text-sm tracking-[0.15em] uppercase font-light border-foreground/20 text-foreground/80 hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-300"
            >
              <Link to="/products">View All</Link>
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
