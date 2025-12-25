import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, SlidersHorizontal, Search, Crown } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { CountdownBadge } from '@/components/groupbuy/CountdownBadge';
import { StaggerContainer, StaggerItem, FadeUp } from '@/components/layout/PageTransition';
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
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Search</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9 border-border/50"
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Categories</h3>
        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-3">
              <Checkbox
                id={category.id}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label htmlFor={category.id} className="cursor-pointer text-sm">
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Brands</h3>
        <div className="space-y-3">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="flex items-center space-x-3">
              <Checkbox
                id={`vendor-${vendor.id}`}
                checked={selectedVendors.includes(vendor.id)}
                onCheckedChange={() => toggleVendor(vendor.id)}
              />
              <Label htmlFor={`vendor-${vendor.id}`} className="cursor-pointer text-sm">
                {vendor.rep_full_name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Sort</h3>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="border-border/50">
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
        <FadeUp>
          <div className="mb-10 md:mb-16 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4">
              Curated Selection
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif">Our Collection</h1>
          </div>
        </FadeUp>

        {/* Mobile Search Bar */}
        <div className="lg:hidden w-full mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 border-border/50"
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
                <Button variant="outline" className="w-full justify-between border-border/50">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-card">
                <div className="mt-8">
                  <FilterSidebar />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-muted/30 rounded-lg mb-4" />
                    <div className="h-3 bg-muted/30 rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted/30 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted/30 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">No products found</p>
                {searchQuery && (
                  <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {products.map((product) => {
                  const displayImage = product.images && Array.isArray(product.images) && product.images.length > 0
                    ? product.images[0]
                    : product.image_url;
                  
                  const campaign = product.group_buy_campaigns as GroupBuyCampaign | null;
                  const hasActiveGroupBuy = isGroupBuyActive(campaign);

                  return (
                    <StaggerItem key={product.id}>
                      <Link to={`/products/${product.id}`} className="group block">
                        <Card className="overflow-hidden border-0 bg-transparent hover-lift">
                          <div className="relative aspect-[3/4] bg-accent overflow-hidden rounded-lg image-zoom">
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted/30">
                                <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                              </div>
                            )}
                            
                            {/* Badges */}
                            {hasActiveGroupBuy && campaign && (
                              <>
                                <Badge className="absolute top-3 left-3 bg-secondary/90 text-secondary-foreground shadow-lg backdrop-blur-sm">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Circle
                                </Badge>
                                <CountdownBadge 
                                  expiryAt={campaign.expiry_at} 
                                  className="absolute top-3 right-3"
                                />
                              </>
                            )}
                            
                            {/* Quick View Overlay */}
                            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-500 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100">
                              <Button variant="outline" size="sm" className="bg-background/90 backdrop-blur-sm border-0 text-xs tracking-wider">
                                {hasActiveGroupBuy ? 'Join Circle' : 'View Details'}
                              </Button>
                            </div>
                          </div>
                          
                          <CardContent className="p-4 space-y-2">
                            {product.vendors?.rep_full_name && (
                              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-serif">
                                {product.vendors.rep_full_name}
                              </p>
                            )}
                            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-secondary transition-colors duration-300">
                              {product.name}
                            </h3>
                            <div className="flex items-baseline gap-2 flex-wrap">
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
                                <>
                                  <span className="text-lg font-serif">
                                    ₦{product.price?.toLocaleString()}
                                  </span>
                                  {product.original_price && product.original_price > product.price && (
                                    <span className="text-sm text-muted-foreground line-through">
                                      ₦{product.original_price?.toLocaleString()}
                                    </span>
                                  )}
                                </>
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
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
