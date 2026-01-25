import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { BrandBar } from '@/components/home/BrandBar';
import { LifestyleBanners } from '@/components/home/LifestyleBanners';
import { ArticlesSection } from '@/components/home/ArticlesSection';
import { supabase } from '@/integrations/supabase/client';
import { useSiteContent } from '@/hooks/useSiteContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown } from 'lucide-react';
interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  is_featured: boolean | null;
}
export default function Index() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    getContent
  } = useSiteContent();
  useEffect(() => {
    loadArticles();
  }, []);
  const loadArticles = async () => {
    setLoading(true);
    const {
      data
    } = await supabase.from('articles').select('id, title, slug, excerpt, cover_image_url, published_at, is_featured').eq('is_published', true).order('published_at', {
      ascending: false
    }).limit(7);
    if (data && data.length > 0) {
      const featured = data.find(a => a.is_featured) || data[0];
      setFeaturedArticle(featured);
      setArticles(data.filter(a => a.id !== featured.id).slice(0, 6));
    }
    setLoading(false);
  };
  const journalTitle = getContent('journal', 'title', 'The Fragrance Journal');
  const journalSubtitle = getContent('journal', 'subtitle', 'Stories, insights, and the art of perfumery');
  return <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <BrandBar />

      <ArticlesSection articles={articles} featuredArticle={featuredArticle} loading={loading} title={journalTitle} subtitle={journalSubtitle} />

      {/* Membership CTA */}
      

      <LifestyleBanners />
      <Footer />
    </div>;
}