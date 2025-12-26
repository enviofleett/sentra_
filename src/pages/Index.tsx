import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { BrandBar } from '@/components/home/BrandBar';
import { ProductGrid } from '@/components/home/ProductGrid';
import { LifestyleBanners } from '@/components/home/LifestyleBanners';
import { supabase } from '@/integrations/supabase/client';
import { useSiteContent } from '@/hooks/useSiteContent';

export default function Index() {
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [newProducts, setNewProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { getContent } = useSiteContent();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Fetch popular products (featured or most viewed)
    const { data: popular } = await supabase
      .from('products')
      .select('*, vendors(rep_full_name), group_buy_campaigns!products_active_group_buy_id_fkey(id, status, discount_price, current_quantity, goal_quantity, expiry_at)')
      .eq('is_active', true)
      .eq('is_featured', true)
      .limit(4);

    // Fetch new products (most recent)
    const { data: newest } = await supabase
      .from('products')
      .select('*, vendors(rep_full_name), group_buy_campaigns!products_active_group_buy_id_fkey(id, status, discount_price, current_quantity, goal_quantity, expiry_at)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(4);

    if (popular) setPopularProducts(popular);
    if (newest) setNewProducts(newest);
    setLoading(false);
  };

  const popularTitle = getContent('popular_products', 'title', 'Popular Products');
  const newTitle = getContent('new_products', 'title', 'New Products');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <HeroSection />

      {/* Brand Bar */}
      <BrandBar />

      {/* Popular Products */}
      <ProductGrid
        products={popularProducts}
        loading={loading}
        title={popularTitle}
        columns={4}
      />

      {/* Lifestyle Banners */}
      <LifestyleBanners />

      {/* New Products */}
      <ProductGrid
        products={newProducts}
        loading={loading}
        title={newTitle}
        columns={4}
      />

      <Footer />
    </div>
  );
}
