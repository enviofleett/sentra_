import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
import { useConversationContext } from '@/contexts/ConversationContext';
import ProductConsultantDrawer from '@/components/consultant/ProductConsultantDrawer';
import { isConsultantFreeAccessActive } from '@/utils/consultantAccess';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const conversation = useConversationContext();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [consultantOpen, setConsultantOpen] = useState(false);
  const [consultantInitMessage, setConsultantInitMessage] = useState<string | undefined>(undefined);
  const autoOpenHandledRef = useRef(false);
  const iconLoggedRef = useRef(false);

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
    // Guest cart is now supported - no auth check needed
    // CartContext handles localStorage for guests and syncs on login
    
    if (product.stock_quantity < quantity) {
      toast({
        title: 'Insufficient stock',
        description: 'Not enough items in stock',
        variant: 'destructive'
      });
      return;
    }

    await addToCart(product.id, quantity);
    if (engaged) {
      const abVariant = localStorage.getItem('consultant_ab_variant') || null;
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance_promo')
        .eq('user_id', user?.id || '')
        .maybeSingle();
      const promoBalance = wallet?.balance_promo || 0;
      await supabase
        .from('consultant_engagements')
        .insert({
          user_id: user?.id || null,
          product_id: product.id,
          event_type: 'added_to_cart_after_consult',
          ab_variant: abVariant,
          promo_balance: promoBalance,
          moq: 4
        });
    }
  };

  const parseScentNotes = () => {
    if (product?.metadata?.scentNotes) {
      return product.metadata.scentNotes;
    }
    return { top: [], heart: [], base: [] };
  };

  useEffect(() => {
    const logIconShown = async () => {
      if (!product || iconLoggedRef.current) return;
      iconLoggedRef.current = true;

      const abKey = 'consultant_ab_variant';
      let abVariant = localStorage.getItem(abKey) || '';
      if (!abVariant) {
        abVariant = Math.random() < 0.5 ? 'A' : 'B';
        localStorage.setItem(abKey, abVariant);
      }

      try {
        await supabase
          .from('consultant_engagements')
          .insert({
            user_id: user?.id || null,
            product_id: product.id,
            event_type: 'consultant_icon_shown',
            ab_variant: abVariant,
            moq: 4
          });
      } catch {}
    };
    logIconShown();
  }, [product, user]);

  const buildInitMessage = async () => {
    if (!product) return { initMessage: '', abVariant: null as string | null, promoBalance: 0, moq: 4 };

    const abKey = 'consultant_ab_variant';
    let abVariant = localStorage.getItem(abKey) || '';
    if (!abVariant) {
      abVariant = Math.random() < 0.5 ? 'A' : 'B';
      localStorage.setItem(abKey, abVariant);
    }

    let suggestions = '';
    try {
      let query = supabase
        .from('products')
        .select('id, name, brand, price, scent_profile')
        .eq('is_active', true)
        .neq('id', product.id);
      const filters: string[] = [];
      if (product.scent_profile) filters.push(`scent_profile.eq.${product.scent_profile}`);
      if (product.brand) filters.push(`brand.eq.${product.brand}`);
      if (filters.length > 0) query = query.or(filters.join(','));
      const { data: related } = await query.limit(5);
      suggestions = (related || [])
        .slice(0, 3)
        .map((p: any) => `${p.brand} ${p.name} (₦${p.price})`)
        .join(', ');
    } catch {}

    let promoBalance = 0;
    if (user) {
      try {
        const { data: wallet } = await supabase
          .from('user_wallets')
          .select('balance_promo')
          .eq('user_id', user.id)
          .maybeSingle();
        promoBalance = wallet?.balance_promo || 0;
        await supabase.from('consultant_ab_assignments').upsert({ user_id: user.id, variant: abVariant });
      } catch {}
    }

    const scentNotes = parseScentNotes();
    const pyramid = [
      scentNotes.top?.length ? `Top: ${scentNotes.top.join(', ')}` : null,
      scentNotes.heart?.length ? `Middle: ${scentNotes.heart.join(', ')}` : null,
      scentNotes.base?.length ? `Base: ${scentNotes.base.join(', ')}` : null,
    ].filter(Boolean).join(' | ');
    const moq = 4;
    const promoLine = promoBalance > 0
      ? `You have ₦${promoBalance.toLocaleString()} promo credit available.`
      : `No promo credit detected.`;

    const initMessage = [
      `Hi Consultant, the user is viewing ${product.brand || ''} ${product.name}.`,
      `Scent profile: ${product.scent_profile || 'unknown'}. ${pyramid || ''}`,
      `Price: ₦${product.price.toLocaleString()}. MOQ: ${moq} units for reseller checkout.`,
      `Suggest upsells and combinations (2–3 options) for casual users, collectors, and gift buyers. Include bundle pricing examples with 10–15% discounts.`,
      `Recommend 3–5 complementary items based on fragrance families, seasonality, and purchase patterns. Candidates: ${suggestions || 'none found'}.`,
      `${promoLine} Calculate potential savings now and if they add more to meet MOQ or maximize credit.`,
      `Provide market insight, profit margin guidance, and inventory recommendations tailored to Nigeria.`,
    ].join('\n');

    return { initMessage, abVariant: abVariant || null, promoBalance, moq };
  };

  const openConsultant = async () => {
    if (!product) return false;

    const returnTo = `/products/${product.id}?consult=1`;
    let accessOk = isConsultantFreeAccessActive();

    if (!accessOk) {
      const { data: isAdmin } = await supabase.rpc('is_admin');
      accessOk = !!isAdmin;
    }

    if (!accessOk && user?.id) {
      const { data: hasSub } = await supabase.rpc('has_active_agent_subscription', { p_user_id: user.id });
      accessOk = !!hasSub;
    }

    if (!accessOk) {
      navigate(`/consultant/plans?return_to=${encodeURIComponent(returnTo)}`);
      return false;
    }

    const { initMessage, abVariant, promoBalance, moq } = await buildInitMessage();
    setConsultantInitMessage(initMessage);
    setConsultantOpen(true);
    setEngaged(true);

    try {
      await supabase.from('consultant_engagements').insert({
        user_id: user?.id || null,
        product_id: product.id,
        event_type: 'opened_consultant',
        ab_variant: abVariant,
        promo_balance: promoBalance,
        moq
      });
    } catch {}

    return true;
  };

  useEffect(() => {
    const consult = searchParams.get('consult');
    if (!product) return;
    if (consult !== '1') return;
    if (autoOpenHandledRef.current) return;
    autoOpenHandledRef.current = true;

    (async () => {
      const opened = await openConsultant();
      if (!opened) return;

      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('consult');
      const nextSearch = nextParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : '',
        },
        { replace: true }
      );
    })();
  }, [product, searchParams, location.pathname, location.search]);

  const productImages =
    product?.images && Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product?.image_url
      ? [product.image_url]
      : [];

  const primaryImage = productImages[0] || null;

  useEffect(() => {
    if (!product) return;
    conversation.setCurrentProduct({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.gender || product.scent_profile || null,
      price: product.price,
      attributes: {
        scent_profile: product.scent_profile,
        size: product.size,
      },
      image_url: primaryImage,
      url: location.pathname + location.search,
    });
  }, [product, location.pathname, location.search, primaryImage, conversation]);

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

  const scentNotes = parseScentNotes();
  const resellerBrief = (product?.metadata && typeof product.metadata === 'object')
    ? (product.metadata as any)?.reseller_sales?.content
    : null;

  const renderBullets = (items: any) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
        {items.map((it: any, idx: number) => (
          <li key={idx}>{String(it)}</li>
        ))}
      </ul>
    );
  };

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
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={openConsultant}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </span>
                        Ask an expert
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ask an expert</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {product.scent_profile && (
                  <span className="capitalize">{product.scent_profile}</span>
                )}
                {product.scent_profile && product.size && <span>•</span>}
                {product.size && <span>{product.size}</span>}
              </div>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl md:text-4xl font-serif">
                ₦{product.price.toLocaleString()}
              </span>
              {product.original_price && product.original_price > product.price && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ₦{product.original_price.toLocaleString()}
                  </span>
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                    You Save ₦{(product.original_price - product.price).toLocaleString()} ({Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF)
                  </span>
                </>
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

      <ProductConsultantDrawer
        open={consultantOpen}
        onOpenChange={setConsultantOpen}
        productName={product?.name}
        productBrand={product?.brand}
        initialMessage={consultantInitMessage}
        sessionKey={product?.id ? `product:${product.id}` : undefined}
        onRequireAccess={() => {
          const returnTo = product?.id ? `/products/${product.id}?consult=1` : location.pathname;
          navigate(`/consultant/plans?return_to=${encodeURIComponent(returnTo)}`);
        }}
      />
    </div>
  );
}
