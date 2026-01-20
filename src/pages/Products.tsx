import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, SlidersHorizontal, Search, ShoppingBag, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
interface GroupBuyCampaign {
  id: string;
  status: string;
  discount_price: number;
  current_quantity: number;
  goal_quantity: number;
  expiry_at: string;
}
export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const {
    addToCart
  } = useCart();
  const handleQuickAdd = (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(productId, 1);
  };

  // Sync search query with URL params (handles direct navigation, browser back/forward)
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
      setDebouncedSearchQuery(urlQuery);
    }
  }, [searchParams]);

  // Debounce search query to avoid excessive API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  useEffect(() => {
    loadData();
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (debouncedSearchQuery) {
      newSearchParams.set('q', debouncedSearchQuery);
    } else {
      newSearchParams.delete('q');
    }
    setSearchParams(newSearchParams, {
      replace: true
    });
  }, [selectedCategories, selectedBrands, sortBy, debouncedSearchQuery]);
  const loadData = async () => {
    setLoading(true);

    // Fetch categories and unique brands
    const [categoriesData, brandsData] = await Promise.all([supabase.from('categories').select('*').order('name'), supabase.from('products').select('brand').eq('is_active', true).not('brand', 'is', null)]);
    if (categoriesData.data) setCategories(categoriesData.data);
    if (brandsData.data) {
      const uniqueBrands = [...new Set(brandsData.data.map(p => p.brand).filter(Boolean))] as string[];
      setBrands(uniqueBrands.sort());
    }
    let query = supabase.from('products').select('*, vendors(rep_full_name), group_buy_campaigns!products_active_group_buy_id_fkey(id, status, discount_price, current_quantity, goal_quantity, expiry_at)').eq('is_active', true).gte('price', minPrice).lte('price', maxPrice);
    if (selectedCategories.length > 0) {
      query = query.in('category_id', selectedCategories);
    }
    if (selectedBrands.length > 0) {
      query = query.in('brand', selectedBrands);
    }
    switch (sortBy) {
      case 'price-asc':
        query = query.order('price', {
          ascending: true
        });
        break;
      case 'price-desc':
        query = query.order('price', {
          ascending: false
        });
        break;
      case 'name':
        query = query.order('name', {
          ascending: true
        });
        break;
      default:
        query = query.order('created_at', {
          ascending: false
        });
    }
    const {
      data
    } = await query;
    let filteredData = data || [];
    if (debouncedSearchQuery) {
      const lowerCaseQuery = debouncedSearchQuery.toLowerCase();
      filteredData = filteredData.filter(p => p.name.toLowerCase().includes(lowerCaseQuery) || p.description?.toLowerCase().includes(lowerCaseQuery) || p.scent_profile?.toLowerCase().includes(lowerCaseQuery) || p.brand?.toLowerCase().includes(lowerCaseQuery) || p.vendors?.rep_full_name?.toLowerCase().includes(lowerCaseQuery));
    }
    setProducts(filteredData);
    setLoading(false);
  };
  const isGroupBuyActive = (campaign: GroupBuyCampaign | null): boolean => {
    if (!campaign) return false;
    const now = new Date();
    const expiry = new Date(campaign.expiry_at);
    return expiry > now && ['active', 'goal_reached', 'goal_met_pending_payment'].includes(campaign.status);
  };
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
  };
  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  const FilterSidebar = () => <div className="space-y-8">
      <div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-medium">Categories</h3>
        <div className="space-y-3">
          {categories.map(category => <div key={category.id} className="flex items-center space-x-3">
              <Checkbox id={category.id} checked={selectedCategories.includes(category.id)} onCheckedChange={() => toggleCategory(category.id)} />
              <Label htmlFor={category.id} className="cursor-pointer text-sm font-normal">
                {category.name}
              </Label>
            </div>)}
        </div>
      </div>

      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="flex items-center justify-between w-full group">
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">Brands</h3>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {brands.map(brand => <div key={brand} className="flex items-center space-x-3">
                <Checkbox id={`brand-${brand}`} checked={selectedBrands.includes(brand)} onCheckedChange={() => toggleBrand(brand)} />
                <Label htmlFor={`brand-${brand}`} className="cursor-pointer text-sm font-normal">
                  {brand}
                </Label>
              </div>)}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-medium">Sort By</h3>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="name">Name</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>;
  return <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div className="mb-10 md:mb-12 text-center" initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }}>
          <h1 className="text-4xl md:text-5xl font-serif">Our Collection</h1>
          <p className="text-muted-foreground mt-3">Discover your perfect scent</p>
          
          {/* Main Search Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input type="text" placeholder="Search products, brands..." value={searchQuery} onChange={handleSearchChange} className="w-full pl-12 pr-4 py-3 h-12 text-base rounded-full border-muted-foreground/20 focus:border-primary" />
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar />
            </div>
          </aside>

          {/* Mobile Filters */}
          <div className="lg:hidden w-full">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-between rounded-full">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </span>
                  {(selectedCategories.length > 0 || selectedBrands.length > 0) && <Badge variant="secondary" className="ml-2">
                      {selectedCategories.length + selectedBrands.length}
                    </Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-background">
                <div className="mt-8">
                  <FilterSidebar />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14 lg:gap-x-8 lg:gap-y-16">
                {[...Array(9)].map((_, i) => <div key={i} className="animate-pulse">
                    <div className="aspect-[4/5] bg-muted/30 rounded-sm mb-4" />
                    <div className="h-2 bg-muted/40 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted/40 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-muted/40 rounded w-1/4" />
                  </div>)}
              </div> : products.length === 0 ? <div className="text-center py-20">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No products found</p>
                {searchQuery && <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                    Clear search
                  </Button>}
              </div> : <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {products.map((product, index) => {
              const displayImage = product.images && Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : product.image_url;
              const campaign = product.group_buy_campaigns as GroupBuyCampaign | null;
              const hasActiveGroupBuy = isGroupBuyActive(campaign);
              const isOnSale = hasActiveGroupBuy || product.original_price && product.original_price > product.price;

              // Determine prices to display
              const currentPrice = hasActiveGroupBuy && campaign ? campaign.discount_price : product.price;
              const originalPrice = hasActiveGroupBuy && campaign ? product.price : product.original_price;
              return <motion.div key={product.id} initial={{
                opacity: 0,
                y: 16
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                duration: 0.4,
                delay: index * 0.03
              }}>
                      <Link to={`/products/${product.id}`} className="group block border border-border bg-card hover:border-l-4 hover:border-l-coral transition-all duration-200">
                        {/* Product Name - TOP */}
                        <div className="py-3 px-2 border-b border-border/50">
                          <h3 className="text-xs md:text-sm text-center text-foreground line-clamp-2 leading-relaxed">
                            {product.name}
                          </h3>
                        </div>
                        
                        {/* Product Image - MIDDLE */}
                        <div className="aspect-square p-4 md:p-6 flex items-center justify-center bg-background relative">
                          {displayImage ? <img src={displayImage} alt={product.name} className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" /> : <Sparkles className="h-8 w-8 text-muted-foreground/20" />}
                          
                          {/* Quick Add Button */}
                          <Button size="sm" onClick={e => handleQuickAdd(e, product.id)} className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-foreground text-background hover:bg-foreground/90 text-xs px-3 py-1 h-auto gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            Quick Add
                          </Button>
                        </div>
                        
                        {/* Price - BOTTOM */}
                        <div className="py-3 px-2 border-t border-border/50 flex items-center justify-center gap-2">
                          {isOnSale && originalPrice ? <>
                              <span className="text-xs md:text-sm text-muted-foreground line-through">
                                ₦{originalPrice.toLocaleString()}
                              </span>
                              <span className="text-xs md:text-sm font-medium text-coral">
                                ₦{currentPrice.toLocaleString()}
                              </span>
                            </> : <span className="text-xs md:text-sm font-medium text-foreground">
                              ₦{currentPrice.toLocaleString()}
                            </span>}
                        </div>
                      </Link>
                    </motion.div>;
            })}
              </div>}
          </div>
        </div>
      </div>

      <Footer />
    </div>;
}