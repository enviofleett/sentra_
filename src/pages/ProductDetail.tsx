import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Minus, Plus, ShoppingCart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { GroupBuyCampaignWidget } from '@/components/groupbuy/GroupBuyCampaignWidget';

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
      trackProductView();
    }
  }, [id]);

  const trackProductView = async () => {
    if (!id) return;
    
    // Get or create session ID
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('session_id', sessionId);
    }

    try {
      await supabase.from('product_analytics').insert({
        product_id: id,
        event_type: 'view',
        user_id: user?.id || null,
        session_id: sessionId
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const loadProduct = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, active_group_buy_id')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p>Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) return null;

  // Get all product images
  const productImages = product.images && Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : product.image_url 
    ? [product.image_url] 
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {productImages.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="aspect-square bg-accent rounded-lg overflow-hidden shadow-elegant">
                  <img
                    src={productImages[currentImageIndex]}
                    alt={`${product.name} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Thumbnail Gallery */}
                {productImages.length > 1 && (
                  <div className="grid grid-cols-3 gap-3">
                    {productImages.map((image: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-smooth ${
                          currentImageIndex === index 
                            ? 'border-secondary shadow-gold' 
                            : 'border-border hover:border-secondary/50'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} - Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-square bg-accent rounded-lg flex items-center justify-center bg-gradient-primary shadow-elegant">
                <Sparkles className="h-24 w-24 text-primary-foreground/30" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
              {product.scent_profile && (
                <p className="text-lg text-muted-foreground capitalize">
                  {product.scent_profile} Fragrance
                </p>
              )}
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-secondary">
                ₦{product.price.toLocaleString()}
              </span>
              {product.original_price && (
                <span className="text-xl text-muted-foreground line-through">
                  ₦{product.original_price.toLocaleString()}
                </span>
              )}
            </div>

            {product.description && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Description</h3>
                <div 
                  className="text-muted-foreground leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-headings:font-semibold prose-headings:text-foreground prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1 prose-strong:font-bold prose-em:italic"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} items in stock`
                  : 'Out of stock'}
              </p>
            </div>

            {/* Group Buy or Regular Purchase */}
            {product.active_group_buy_id ? (
              <GroupBuyCampaignWidget 
                campaignId={product.active_group_buy_id} 
                productId={product.id} 
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Quantity</label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
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
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      disabled={quantity >= product.stock_quantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}