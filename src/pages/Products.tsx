import { useEffect, useState } from 'react';
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
import { Sparkles, SlidersHorizontal, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { motion } from 'framer-motion';

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
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    setSearchQuery(urlQuery);
  }, []);

  useEffect(() => {
    loadData();
    
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (searchQuery) {
      newSearchParams.set('q', searchQuery);
    } else {
      newSearchParams.delete('q');
    }
    setSearchParams(newSearchParams, { replace: true });
  }, [selectedCategories, selectedVendors, sortBy, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    
    const [categoriesData, vendorsData] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('vendors').select('*').order('rep_full_name')
    ]);

    if (categoriesData.data) setCategories(categoriesData.data);
    if (vendorsData.data) setVendors(vendorsData.data);

    let query = supabase
      .from('products')
      .select('*, vendors(rep_full_name), group_buy_campaigns!products_active_group_buy_id_fkey(id, status, discount_price, current_quantity, goal_quantity, expiry_at)')
      .eq('is_active', true)
      .gte('price', minPrice)
      .lte('price', maxPrice);

    if (selectedCategories.length > 0) {
      query = query.in('category_id', selectedCategories);
    }

    if (selectedVendors.length > 0) {
      query = query.in('vendor_id', selectedVendors);
    }

    switch (sortBy) {
      case 'price-asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price-desc':
        query = query.order('price', { ascending: false });
        break;
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data } = await query;
    let filteredData = data || [];

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filteredData = filteredData.filter(p => 
        p.name.toLowerCase().includes(lowerCaseQuery) ||
        p.description?.toLowerCase().includes(lowerCaseQuery) ||
        p.scent_profile?.toLowerCase().includes(lowerCaseQuery) ||
        p.vendors?.rep_full_name?.toLowerCase().includes(lowerCaseQuery)
      );
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
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleVendor = (vendorId: string) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const FilterSidebar = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-medium">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 rounded-full"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-medium">Categories</h3>
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-3">
              <Checkbox
                id={category.id}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label htmlFor={category.id} className="cursor-pointer text-sm font-normal">
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-medium">Brands</h3>
        <div className="space-y-3">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="flex items-center space-x-3">
              <Checkbox
                id={`vendor-${vendor.id}`}
                checked={selectedVendors.includes(vendor.id)}
                onCheckedChange={() => toggleVendor(vendor.id)}
              />
              <Label htmlFor={`vendor-${vendor.id}`} className="cursor-pointer text-sm font-normal">
                {vendor.rep_full_name}
              </Label>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div 
          className="mb-10 md:mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-5xl font-serif">Our Collection</h1>
          <p className="text-muted-foreground mt-3">Discover your perfect scent</p>
        </motion.div>

        {/* Mobile Search Bar */}
        <div className="lg:hidden w-full mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 rounded-full"
            />
          </div>
        </div>

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
                  {(selectedCategories.length > 0 || selectedVendors.length > 0) && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedCategories.length + selectedVendors.length}
                    </Badge>
                  )}
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
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14 lg:gap-x-8 lg:gap-y-16">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/5] bg-muted/30 rounded-sm mb-4" />
                    <div className="h-2 bg-muted/40 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted/40 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-muted/40 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No products found</p>
                {searchQuery && (
                  <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {products.map((product, index) => {
                  const displayImage = product.images && Array.isArray(product.images) && product.images.length > 0
                    ? product.images[0]
                    : product.image_url;
                  
                  const campaign = product.group_buy_campaigns as GroupBuyCampaign | null;
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
                      animate={{ opacity: 1, y: 0 }}
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
                        <div className="aspect-square p-4 md:p-6 flex items-center justify-center bg-background">
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
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
