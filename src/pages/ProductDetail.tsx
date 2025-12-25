import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Minus, Plus, ShoppingCart, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { GroupBuyCampaignWidget } from '@/components/groupbuy/GroupBuyCampaignWidget';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScentPyramid } from '@/components/product/ScentPyramid';
import { MobileBuyBar } from '@/components/product/MobileBuyBar';
import { FadeUp } from '@/components/layout/PageTransition';
import { motion } from 'framer-motion';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      toast({
        title: 'Error',
        description: 'Product not found',
        variant: 'destructive'
      });
      navigate('/products');
    } else {
      setProduct(data);
    }
    setLoading(false);
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to add items to cart',
        variant: 'destructive'
      });
      navigate('/auth');
      return;
    }

    if (product.stock_quantity < quantity) {
      toast({
        title: 'Insufficient stock',
        description: 'Not enough items in stock',
        variant: 'destructive'
      });
      return;
    }

    await addToCart(product.id, quantity);
  };

  // Parse scent notes from metadata or description
  const parseScentNotes = () => {
    if (product?.metadata?.scentNotes) {
      return product.metadata.scentNotes;
    }
    // Default example notes if none provided
    return {
      top: [],
      heart: [],
      base: []
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-[3/4] bg-muted/30 rounded-lg animate-pulse" />
            <div className="space-y-6">
              <div className="h-8 bg-muted/30 rounded w-3/4 animate-pulse" />
              <div className="h-6 bg-muted/30 rounded w-1/2 animate-pulse" />
              <div className="h-32 bg-muted/30 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) return null;

  const productImages = product.images && Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : product.image_url 
    ? [product.image_url] 
    : [];

  const scentNotes = parseScentNotes();

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-0">
      <Navbar />

      <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Product Images - Full Bleed Style */}
          <FadeUp>
            <div className="space-y-4">
              {productImages.length > 0 ? (
                <>
                  {/* Main Image - Larger aspect ratio */}
                  <motion.div 
                    className="aspect-[3/4] bg-accent rounded-lg overflow-hidden shadow-elegant image-zoom"
                    layoutId={`product-image-${product.id}`}
                  >
                    <div className="w-full h-full p-6 flex items-center justify-center bg-accent">
                      <img
                        src={productImages[currentImageIndex]}
                        alt={product.name}
                        className="max-w-full max-h-full object-contain drop-shadow-xl"
                      />
                    </div>
                  </motion.div>
                  
                  {/* Thumbnail Gallery */}
                  {productImages.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {productImages.map((image: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                            currentImageIndex === index 
                              ? 'border-secondary shadow-gold' 
                              : 'border-border/50 hover:border-secondary/50'
                          }`}
                        >
                          <img
                            src={image}
                            alt={`${product.name} - View ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-[3/4] bg-muted/30 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-24 w-24 text-muted-foreground/20" />
                </div>
              )}
            </div>
          </FadeUp>

          {/* Product Info */}
          <div className="space-y-6 lg:space-y-8">
            <FadeUp delay={0.1}>
              <div className="space-y-3">
                {product.brand && (
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-serif">
                    {product.brand}
                  </p>
                )}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif leading-tight">
                  {product.name}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {product.scent_profile && (
                    <span className="capitalize tracking-wide">
                      {product.scent_profile}
                    </span>
                  )}
                  {product.scent_profile && product.size && (
                    <span className="text-border">•</span>
                  )}
                  {product.size && (
                    <span className="tracking-wide">{product.size}</span>
                  )}
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.15}>
              <div className="flex items-baseline gap-4">
                <span className="text-3xl md:text-4xl font-serif text-foreground">
                  ₦{product.price.toLocaleString()}
                </span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-lg text-muted-foreground line-through">
                    ₦{product.original_price.toLocaleString()}
                  </span>
                )}
              </div>
            </FadeUp>

            {product.description && (
              <FadeUp delay={0.2}>
                <div className="py-6 border-t border-border/50">
                  <div className="text-muted-foreground leading-relaxed space-y-4">
                    {product.description.includes('<') ? (
                      <div 
                        className="prose prose-sm max-w-none prose-p:mb-4 prose-p:leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      />
                    ) : (
                      product.description.split(/\n\n|\n/).filter(Boolean).map((paragraph, index) => (
                        <p key={index} className="leading-relaxed">
                          {paragraph.trim()}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </FadeUp>
            )}

            {/* Scent Pyramid */}
            {(scentNotes.top?.length > 0 || scentNotes.heart?.length > 0 || scentNotes.base?.length > 0) && (
              <FadeUp delay={0.25}>
                <div className="py-6 border-t border-border/50">
                  <ScentPyramid 
                    topNotes={scentNotes.top}
                    heartNotes={scentNotes.heart}
                    baseNotes={scentNotes.base}
                  />
                </div>
              </FadeUp>
            )}

            {/* Stock Status */}
            <FadeUp delay={0.3}>
              <p className="text-sm text-muted-foreground">
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} in stock`
                  : 'Currently unavailable'}
              </p>
            </FadeUp>

            {/* Sentra Circle Widget */}
            {product.active_group_buy_id && (
              <FadeUp delay={0.35}>
                <GroupBuyCampaignWidget 
                  campaignId={product.active_group_buy_id} 
                  productId={product.id} 
                />
              </FadeUp>
            )}

            {/* Divider */}
            {product.active_group_buy_id && product.stock_quantity > 0 && (
              <FadeUp delay={0.4}>
                <div className="relative py-4">
                  <div className="line-elegant" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-background px-4 text-xs uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
                      or purchase now
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">
                              <strong>Circle:</strong> Join others for a discounted price.
                              <br /><strong>Purchase:</strong> Buy immediately at full price.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                  </div>
                </div>
              </FadeUp>
            )}

            {/* Regular Purchase - Desktop */}
            {product.stock_quantity > 0 && (
              <FadeUp delay={0.45}>
                <div className="hidden lg:block space-y-6">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3">
                      Quantity
                    </label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-full border-border/50"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        max={product.stock_quantity}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 text-center h-11 border-border/50"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-full border-border/50"
                        onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                        disabled={quantity >= product.stock_quantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    variant={product.active_group_buy_id ? "outline" : "default"}
                    className={`w-full h-14 text-sm tracking-wider ${
                      product.active_group_buy_id 
                        ? 'border-foreground/20 hover:bg-foreground/5' 
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart className="h-4 w-4 mr-3" />
                    Add to Cart {product.active_group_buy_id && `— ₦${product.price.toLocaleString()}`}
                  </Button>
                </div>
              </FadeUp>
            )}

            {product.stock_quantity === 0 && !product.active_group_buy_id && (
              <FadeUp delay={0.45}>
                <Button size="lg" className="w-full h-14" disabled>
                  Currently Unavailable
                </Button>
              </FadeUp>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Buy Bar */}
      <MobileBuyBar
        price={product.price}
        originalPrice={product.original_price}
        onAddToCart={handleAddToCart}
        hasGroupBuy={!!product.active_group_buy_id}
        disabled={product.stock_quantity === 0}
      />

      <Footer />
    </div>
  );
}
