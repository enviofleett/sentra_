import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Crown, Sparkles } from 'lucide-react';
import heroPerfumeNew from '@/assets/hero-perfume-new.jpg';
import { CountdownBadge } from '@/components/groupbuy/CountdownBadge';
import { FadeUp, StaggerContainer, StaggerItem } from '@/components/layout/PageTransition';
import { motion } from 'framer-motion';

export default function Index() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, vendors(rep_full_name), group_buy_campaigns!products_active_group_buy_id_fkey(id, status, discount_price, current_quantity, goal_quantity, expiry_at)')
      .eq('is_active', true)
      .limit(8);

    if (data) setProducts(data);
    setLoading(false);
  };

  const isGroupBuyActive = (campaign: any): boolean => {
    if (!campaign) return false;
    const now = new Date();
    const expiry = new Date(campaign.expiry_at);
    return expiry > now && ['active', 'goal_reached', 'goal_met_pending_payment'].includes(campaign.status);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section - Full Bleed */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroPerfumeNew} 
            alt="Luxury Fragrance Collection" 
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-xl space-y-8">
            <FadeUp>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Curated Excellence
              </p>
            </FadeUp>
            
            <FadeUp delay={0.1}>
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-medium leading-[0.95] text-foreground">
                Discover Your
                <span className="block text-secondary">Signature</span>
              </h1>
            </FadeUp>
            
            <FadeUp delay={0.2}>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                Explore our curated collection of luxury fragrances that define elegance and sophistication.
              </p>
            </FadeUp>
            
            <FadeUp delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium px-8 h-14 text-sm tracking-wider"
                >
                  <Link to="/products" className="inline-flex items-center gap-3">
                    Explore Collection
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  asChild 
                  variant="outline"
                  size="lg" 
                  className="border-foreground/20 hover:bg-foreground/5 h-14 text-sm tracking-wider"
                >
                  <Link to="/products">
                    Join a Circle
                  </Link>
                </Button>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <FadeUp>
            <div className="text-center mb-16">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
                Handpicked Selection
              </p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif">
                The Collection
              </h2>
            </div>
          </FadeUp>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-muted/30 rounded-lg mb-4" />
                  <div className="h-4 bg-muted/30 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted/30 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {products.map((product) => {
                const campaign = product.group_buy_campaigns;
                const hasActiveGroupBuy = isGroupBuyActive(campaign);
                
                return (
                  <StaggerItem key={product.id}>
                    <Link to={`/products/${product.id}`} className="group block">
                      <Card className="overflow-hidden border-0 bg-transparent hover-lift">
                        <div className="relative aspect-[3/4] bg-accent overflow-hidden rounded-lg image-zoom">
                          {hasActiveGroupBuy && campaign && (
                            <>
                              <Badge className="absolute top-3 left-3 z-10 bg-secondary/90 text-secondary-foreground shadow-lg backdrop-blur-sm">
                                <Crown className="w-3 h-3 mr-1" />
                                Circle
                              </Badge>
                              <CountdownBadge 
                                expiryAt={campaign.expiry_at} 
                                className="absolute top-3 right-3 z-10"
                              />
                            </>
                          )}
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted/30">
                              <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                          )}
                          
                          {/* Quick View Overlay */}
                          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-500 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                            <Button variant="outline" size="sm" className="bg-background/90 backdrop-blur-sm border-0 text-xs tracking-wider">
                              Quick View
                            </Button>
                          </div>
                        </div>
                        
                        <CardContent className="p-4 space-y-2">
                          {product.vendors?.rep_full_name && (
                            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-serif">
                              {product.vendors.rep_full_name}
                            </p>
                          )}
                          <h3 className="font-medium text-sm md:text-base line-clamp-2 group-hover:text-secondary transition-colors duration-300">
                            {product.name}
                          </h3>
                          <div className="flex items-baseline gap-2">
                            {hasActiveGroupBuy && campaign ? (
                              <>
                                <span className="text-lg font-serif text-secondary">
                                  ₦{campaign.discount_price?.toLocaleString()}
                                </span>
                                <span className="text-sm text-muted-foreground line-through">
                                  ₦{product.price?.toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <span className="text-lg font-serif">
                                ₦{product.price?.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}

          <FadeUp delay={0.2}>
            <div className="text-center mt-16">
              <Button asChild variant="outline" size="lg" className="px-10 h-14 text-sm tracking-wider border-foreground/20">
                <Link to="/products">View All</Link>
              </Button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Sentra Circles CTA */}
      <section className="py-20 md:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <FadeUp>
              <Crown className="w-12 h-12 mx-auto text-secondary mb-6" />
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif">
                Sentra Circles
              </h2>
            </FadeUp>
            
            <FadeUp delay={0.1}>
              <p className="text-lg md:text-xl text-primary-foreground/70 leading-relaxed">
                Join an exclusive collective of fragrance enthusiasts. 
                Unlock special pricing when you join a circle.
              </p>
            </FadeUp>
            
            <FadeUp delay={0.2}>
              <Button 
                asChild 
                size="lg" 
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium px-10 h-14 text-sm tracking-wider"
              >
                <Link to="/products">
                  Explore Circles
                </Link>
              </Button>
            </FadeUp>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
