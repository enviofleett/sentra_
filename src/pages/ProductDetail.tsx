import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
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
import { motion } from 'framer-motion';
import { useMetaTags } from '@/hooks/useMetaTags';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Generate meta tags config
  const metaConfig = useMemo(() => {
    if (!product) return {};
    
    // Strip HTML from description for meta
    const plainDescription = product.description
      ? product.description.replace(/<[^>]*>/g, '').substring(0, 155) + '...'
      : `Shop ${product.name} at Sentra - Luxury Perfumes`;
    
    const productImage = product.images?.[0] || product.image_url || 'https://sentra.lovable.app/og-image.png';
    
    return {
      title: `${product.name}${product.brand ? ` by ${product.brand}` : ''} | Sentra`,
      description: plainDescription,
      image: productImage,
      url: `https://sentra.lovable.app/product/${product.id}`,
      type: 'product'
    };
  }, [product]);

  // Apply dynamic meta tags
  useMetaTags(metaConfig);

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

  const parseScentNotes = () => {
    if (product?.metadata?.scentNotes) {
      return product.metadata.scentNotes;
    }
    return { top: [], heart: [], base: [] };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            <div className="aspect-square bg-accent rounded-2xl animate-pulse" />
            <div className="space-y-6 py-8">
              <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
              <div className="h-10 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-32 bg-muted rounded animate-pulse" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          {/* Product Images */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {productImages.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="aspect-square bg-accent rounded-2xl overflow-hidden">
                  <div className="w-full h-full p-8 md:p-12 flex items-center justify-center">
                    <img
                      src={productImages[currentImageIndex]}
                      alt={product.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
                
                {/* Thumbnail Gallery */}
                {productImages.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {productImages.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 bg-accent ${
                          currentImageIndex === index 
                            ? 'border-foreground' 
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} - View ${index + 1}`}
                          className="w-full h-full object-contain p-2"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square bg-accent rounded-2xl flex items-center justify-center">
                <Sparkles className="h-20 w-20 text-muted-foreground/20" />
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div 
            className="space-y-6 lg:space-y-8 lg:sticky lg:top-24"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="space-y-3">
              {product.brand && (
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {product.brand}
                </p>
              )}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif leading-tight">
                {product.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {product.scent_profile && (
                  <span className="capitalize">{product.scent_profile}</span>
                )}
                {product.scent_profile && product.size && <span>•</span>}
                {product.size && <span>{product.size}</span>}
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-serif">
                ₦{product.price.toLocaleString()}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-lg text-muted-foreground line-through">
                  ₦{product.original_price.toLocaleString()}
                </span>
              )}
            </div>

            {product.description && (
              <div className="py-6 border-t border-border">
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  {product.description.includes('<') ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
                    />
                  ) : (
                    product.description.split(/\n\n|\n/).filter(Boolean).map((paragraph: string, index: number) => (
                      <p key={index}>{paragraph.trim()}</p>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Scent Pyramid */}
            {(scentNotes.top?.length > 0 || scentNotes.heart?.length > 0 || scentNotes.base?.length > 0) && (
              <div className="py-6 border-t border-border">
                <ScentPyramid 
                  topNotes={scentNotes.top}
                  heartNotes={scentNotes.heart}
                  baseNotes={scentNotes.base}
                />
              </div>
            )}

            {/* Stock Status */}
            <p className="text-sm text-muted-foreground">
              {product.stock_quantity > 0
                ? `${product.stock_quantity} in stock`
                : 'Currently unavailable'}
            </p>

            {/* Sentra Circle Widget */}
            {product.active_group_buy_id && (
              <GroupBuyCampaignWidget 
                campaignId={product.active_group_buy_id} 
                productId={product.id} 
              />
            )}

            {/* Divider */}
            {product.active_group_buy_id && product.stock_quantity > 0 && (
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
            )}

            {/* Regular Purchase - Desktop */}
            {product.stock_quantity > 0 && (
              <div className="hidden lg:block space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3">
                    Quantity
                  </label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-full"
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
                      className="w-20 text-center h-11 rounded-full"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-full"
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
                  className={`w-full h-14 text-sm tracking-wider rounded-full ${
                    product.active_group_buy_id 
                      ? '' 
                      : 'bg-foreground hover:bg-foreground/90 text-background'
                  }`}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-4 w-4 mr-3" />
                  Add to Cart {product.active_group_buy_id && `— ₦${product.price.toLocaleString()}`}
                </Button>
              </div>
            )}

            {product.stock_quantity === 0 && !product.active_group_buy_id && (
              <Button size="lg" className="w-full h-14 rounded-full" disabled>
                Currently Unavailable
              </Button>
            )}
          </motion.div>
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
