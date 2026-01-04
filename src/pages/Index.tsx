import { useEffect, useState } from 'react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { BrandBar } from '@/components/home/BrandBar';
import { ProductGrid } from '@/components/home/ProductGrid';
import { LifestyleBanners } from '@/components/home/LifestyleBanners';
import { CategoryTabs } from '@/components/home/CategoryTabs';
import { supabase } from '@/integrations/supabase/client';
import { useSiteContent } from '@/hooks/useSiteContent';
export default function Index() {
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const {
    getContent
  } = useSiteContent();
  useEffect(() => {
    loadData();
  }, [selectedCategory]);
  const loadData = async () => {
    setLoading(true);

    // Build query for featured products with optional category filter
    let featuredQuery = supabase.from('products').select('*, vendors(rep_full_name), group_buy_campaigns!products_active_group_buy_id_fkey(id, status, discount_price, current_quantity, goal_quantity, expiry_at)').eq('is_active', true).eq('is_featured', true);
    if (selectedCategory) {
      featuredQuery = featuredQuery.eq('category_id', selectedCategory);
    }
    const {
      data: featured
    } = await featuredQuery.limit(8);

    // Fetch popular products (most recent)
    let popularQuery = supabase.from('products').select('*, vendors(rep_full_name), group_buy_campaigns!products_active_group_buy_id_fkey(id, status, discount_price, current_quantity, goal_quantity, expiry_at)').eq('is_active', true).order('created_at', {
      ascending: false
    });
    if (selectedCategory) {
      popularQuery = popularQuery.eq('category_id', selectedCategory);
    }
    const {
      data: popular
    } = await popularQuery.limit(4);
    if (featured) setFeaturedProducts(featured);
    if (popular) setPopularProducts(popular);
    setLoading(false);
  };
  const featuredTitle = getContent('featured_products', 'title', 'Featured Products');
  const newTitle = getContent('new_products', 'title', 'New Arrivals');
  return <div className="min-h-screen bg-background">
      
      <Navbar />

      {/* Hero Section */}
      <HeroSection />

      {/* Brand Bar */}
      <BrandBar />

      {/* Category Tabs */}
      <section className="pt-16 pb-4 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-serif text-center mb-8">{featuredTitle}</h2>
          <CategoryTabs selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
        </div>
      </section>

      {/* Featured Products */}
      <ProductGrid products={featuredProducts} loading={loading} columns={4} showViewAll={true} />

      {/* Lifestyle Banners */}
      <LifestyleBanners />

      {/* New Arrivals */}
      <ProductGrid products={popularProducts} loading={loading} title={newTitle} columns={4} />

      <Footer />
    </div>;
}