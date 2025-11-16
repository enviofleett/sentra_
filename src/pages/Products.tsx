import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [scentProfiles, setScentProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedScents, setSelectedScents] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000000);

  useEffect(() => {
    loadData();
  }, [selectedCategories, selectedScents, sortBy]);

  const loadData = async () => {
    setLoading(true);
    
    const [categoriesData, scentProfilesData] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('scent_profiles').select('*').eq('is_active', true).order('display_order')
    ]);

    if (categoriesData.data) setCategories(categoriesData.data);
    if (scentProfilesData.data) setScentProfiles(scentProfilesData.data);

    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gte('price', minPrice)
      .lte('price', maxPrice);

    if (selectedCategories.length > 0) {
      query = query.in('category_id', selectedCategories);
    }

    if (selectedScents.length > 0) {
      query = query.in('scent_profile', selectedScents as any);
    }

    // Sorting
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
    if (data) setProducts(data);
    setLoading(false);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleScent = (scent: string) => {
    setSelectedScents(prev =>
      prev.includes(scent)
        ? prev.filter(s => s !== scent)
        : [...prev, scent]
    );
  };

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Categories</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={category.id}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => toggleCategory(category.id)}
              />
              <Label htmlFor={category.id} className="cursor-pointer">
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Scent Profile</h3>
        <div className="space-y-2">
          {scentProfiles.map((profile) => (
            <div key={profile.id} className="flex items-center space-x-2">
              <Checkbox
                id={profile.id}
                checked={selectedScents.includes(profile.name)}
                onCheckedChange={() => toggleScent(profile.name)}
              />
              <Label htmlFor={profile.id} className="cursor-pointer capitalize">
                {profile.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Sort By</h3>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
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

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Our Collection</h1>
          <p className="text-sm md:text-base text-muted-foreground">Discover luxury perfumes crafted to perfection</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Mobile Filters */}
          <div className="lg:hidden w-full">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters & Sort
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="mt-8">
                  <FilterSidebar />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-muted rounded-lg mb-4" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => {
                  // Get first image from images array or fallback to image_url
                  const displayImage = product.images && Array.isArray(product.images) && product.images.length > 0
                    ? product.images[0]
                    : product.image_url;

                  return (
                    <Card key={product.id} className="group overflow-hidden border-0 bg-card hover:shadow-gold transition-all duration-500 hover:-translate-y-1">
                      <Link to={`/products/${product.id}`} className="block">
                        <div className="aspect-square bg-muted/30 overflow-hidden relative">
                          {displayImage ? (
                            <img
                              src={displayImage}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center gradient-primary">
                              <Sparkles className="h-16 w-16 text-primary-foreground/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <CardContent className="p-5 space-y-3">
                          <h3 className="font-display text-lg font-semibold line-clamp-2 min-h-[3.5rem] group-hover:text-secondary transition-colors duration-300">
                            {product.name}
                          </h3>
                          {product.scent_profile && (
                            <p className="text-sm text-muted-foreground capitalize tracking-wide">
                              {product.scent_profile}
                            </p>
                          )}
                          <div className="space-y-3 pt-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-foreground">
                                ₦{product.price.toLocaleString()}
                              </span>
                              {product.original_price && product.original_price > product.price && (
                                <span className="text-sm text-muted-foreground line-through">
                                  ₦{product.original_price.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <Button 
                              className="w-full bg-primary hover:bg-secondary hover:text-secondary-foreground transition-all duration-300 font-medium"
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
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