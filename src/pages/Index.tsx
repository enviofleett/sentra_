import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Filter } from 'lucide-react';
import heroPerfume from '@/assets/hero-perfume.jpg';

export default function Index() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [vendorsData, productsData] = await Promise.all([
      supabase.from('vendors').select('id, rep_full_name').order('rep_full_name'),
      supabase.from('products').select('*, vendors(rep_full_name)').eq('is_active', true).limit(8)
    ]);

    if (vendorsData.data) setVendors(vendorsData.data);
    if (productsData.data) setProducts(productsData.data);
  };

  const filteredProducts = selectedVendor === 'all' 
    ? products 
    : products.filter(p => p.vendor_id === selectedVendor);

  const calculateDiscount = (price: number, originalPrice: number | null) => {
    if (!originalPrice || originalPrice <= price) return null;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="py-12 md:py-20 lg:py-24 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-6 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Discover Your{' '}
                <span className="gradient-gold bg-clip-text text-transparent">
                  Signature Scent
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
                Explore our curated collection of premium perfumes from the world's most prestigious brands. 
                Find the perfect fragrance that speaks to your unique style and personality.
              </p>
              <div className="pt-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Link to="/products" className="inline-flex items-center gap-2">
                    Shop Collection
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right Column - Image */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 p-8 lg:p-12">
                <img 
                  src={heroPerfume} 
                  alt="Luxury Perfume Bottle - Premium Fragrance Collection" 
                  className="w-full h-auto object-contain rounded-2xl"
                  loading="eager"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-400/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Exclusive Perfume Collection */}
      <section className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold">Exclusive Perfume Collection</h2>
              <p className="text-muted-foreground mt-2">Discover luxury fragrances from top brands</p>
            </div>
            <Button variant="outline" size="lg" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          <Tabs value={selectedVendor} onValueChange={setSelectedVendor} className="w-full">
            <TabsList className="w-full justify-start mb-8 overflow-x-auto flex-wrap h-auto gap-2 bg-transparent p-0">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-6 py-2"
              >
                Everything
              </TabsTrigger>
              {vendors.map((vendor) => (
                <TabsTrigger 
                  key={vendor.id} 
                  value={vendor.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md px-6 py-2"
                >
                  {vendor.rep_full_name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedVendor} className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                  const discount = calculateDiscount(product.price, product.original_price);
                  
                  return (
                    <Card key={product.id} className="group overflow-hidden border shadow-sm hover:shadow-lg transition-all">
                      <Link to={`/products/${product.id}`}>
                        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          {discount && (
                            <Badge 
                              variant="destructive" 
                              className="absolute top-3 left-3 z-10 bg-red-500 hover:bg-red-600 text-white font-bold"
                            >
                              -{discount}%
                            </Badge>
                          )}
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={`${product.name} - Premium Perfume`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                              <span className="text-muted-foreground">No Image</span>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4 space-y-3">
                          <h3 className="font-semibold text-base line-clamp-2 min-h-[3rem]">{product.name}</h3>
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">
                                ₦{product.price.toLocaleString()}
                              </span>
                              {product.original_price && product.original_price > product.price && (
                                <span className="text-base text-muted-foreground line-through">
                                  ₦{product.original_price.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <Button 
                              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold"
                              size="sm"
                            >
                              Buy
                            </Button>
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">No products available</p>
                </div>
              )}

              <div className="text-center mt-12">
                <Button asChild variant="outline" size="lg" className="px-8">
                  <Link to="/products">View All Products</Link>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />
    </div>
  );
}
