
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  scent_profile: string | null;
  metadata: any;
  stock_quantity: number;
}

interface ProductRecommendationsProps {
  currentProduct: Product;
}

export function ProductRecommendations({ currentProduct }: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  useEffect(() => {
    fetchRecommendations();
  }, [currentProduct]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Base query: Active products, not the current one
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .neq('id', currentProduct.id);

      // 1. Prioritize by Scent Profile (Fragrance Family)
      const conditions = [];
      if (currentProduct.scent_profile) conditions.push(`scent_profile.eq.${currentProduct.scent_profile}`);
      if (currentProduct.category_id) conditions.push(`category_id.eq.${currentProduct.category_id}`);
      if (currentProduct.brand) conditions.push(`brand.eq.${currentProduct.brand}`);
      
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      } else {
        // Fallback if product has no metadata: show generic popular items (e.g. by price range)
        // Or just return recent items
        query = query.limit(10);
      }

      // Fetch a reasonable number to filter/sort client-side
      const { data, error } = await query.limit(20);

      if (error) throw error;

      if (data) {
        // Calculate similarity score
        const scoredProducts = data.map(product => {
          let score = 0;
          if (product.scent_profile && product.scent_profile === currentProduct.scent_profile) score += 3;
          if (product.category_id && product.category_id === currentProduct.category_id) score += 2;
          if (product.brand && product.brand === currentProduct.brand) score += 1;
          
          // Price proximity (closer price = higher score)
          const priceDiffRatio = Math.abs(product.price - currentProduct.price) / (currentProduct.price || 1);
          if (priceDiffRatio < 0.2) score += 2;
          else if (priceDiffRatio < 0.5) score += 1;

          return { ...product, score };
        });

        // Sort by score desc
        const sorted = scoredProducts.sort((a, b) => b.score - a.score);

        setRecommendations(sorted);

        // Extract unique brands for filter from the fetched recommendations
        const brands = Array.from(new Set(sorted.map(p => p.brand).filter(Boolean))) as string[];
        setAvailableBrands(brands.sort());
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    // Analytics tracking
    console.log('Recommendation Clicked:', {
      source_product_id: currentProduct.id,
      clicked_product_id: product.id,
      clicked_product_name: product.name,
      timestamp: new Date().toISOString()
    });
  };

  // Filter the recommendations based on user selection
  const filteredRecommendations = recommendations.filter(product => {
    // Price Filter
    if (priceRange && (product.price < priceRange[0] || product.price > priceRange[1])) return false;
    
    // Brand Filter
    if (selectedBrand !== 'all' && product.brand !== selectedBrand) return false;

    return true;
  }).slice(0, 4); // Display top 4


  if (!loading && recommendations.length === 0) {
    return null; // Don't show section if no recommendations found
  }

  return (
    <section className="py-12 border-t mt-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-serif mb-2">You May Also Like</h2>
          <p className="text-muted-foreground">Curated alternatives based on {currentProduct.name}</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
           <div className="w-full sm:w-[200px]">
            <Label className="text-xs mb-1.5 block">Price Range (Max: ₦{priceRange[1].toLocaleString()})</Label>
            <Slider
              defaultValue={[0, 500000]}
              max={1000000}
              step={10000}
              value={priceRange}
              onValueChange={(val) => setPriceRange(val as [number, number])}
            />
          </div>
          <div className="w-full sm:w-[150px]">
            <Label className="text-xs mb-1.5 block">Brand</Label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {availableBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-[250px] w-full rounded-lg" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredRecommendations.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {filteredRecommendations.map((product) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Link to={`/products/${product.id}`} onClick={() => handleProductClick(product)}>
                <Card className="h-full border-none shadow-none hover:bg-accent/5 transition-colors group">
                  <CardContent className="p-4">
                    <div className="aspect-[4/5] relative mb-4 overflow-hidden rounded-md bg-white">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="object-contain w-full h-full transform group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <span className="text-muted-foreground">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.brand}</p>
                      <h3 className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.5em]">{product.name}</h3>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-serif">₦{product.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No matching alternatives found with current filters.</p>
          <Button variant="link" onClick={() => {
            setPriceRange([0, 500000]);
            setSelectedBrand('all');
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </section>
  );
}
