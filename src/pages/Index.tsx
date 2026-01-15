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
  const { getContent } = useSiteContent();

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, published_at, is_featured')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(7);

    if (data && data.length > 0) {
      const featured = data.find(a => a.is_featured) || data[0];
      setFeaturedArticle(featured);
      setArticles(data.filter(a => a.id !== featured.id).slice(0, 6));
    }
    setLoading(false);
  };

  const journalTitle = getContent('journal', 'title', 'The Fragrance Journal');
  const journalSubtitle = getContent('journal', 'subtitle', 'Stories, insights, and the art of perfumery');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <BrandBar />

      <ArticlesSection
        articles={articles}
        featuredArticle={featuredArticle}
        loading={loading}
        title={journalTitle}
        subtitle={journalSubtitle}
      />

      {/* Membership CTA */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto border-0 shadow-xl bg-card/80 backdrop-blur">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Crown className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif mb-4">
                Become a Member
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join our exclusive community to access the members-only shop with premium fragrances at wholesale prices.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/membership/topup">
                    <Crown className="h-4 w-4" />
                    Join Membership
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/products">
                    Browse Shop
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <LifestyleBanners />
      <Footer />
    </div>
  );
}
