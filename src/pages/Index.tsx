import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { BrandBar } from '@/components/home/BrandBar';
import { LifestyleBanners } from '@/components/home/LifestyleBanners';
import { supabase } from '@/integrations/supabase/client';
import { useSiteContent } from '@/hooks/useSiteContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Crown, Sparkles } from 'lucide-react';

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

    // Fetch published articles
    const { data } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, published_at, is_featured')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(7);

    if (data && data.length > 0) {
      // Find featured article or use the first one
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

      {/* Hero Section */}
      <HeroSection />

      {/* Brand Bar */}
      <BrandBar />

      {/* Journal / Articles Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif mb-3">{journalTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{journalSubtitle}</p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-5">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3 mt-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : articles.length === 0 && !featuredArticle ? (
            <div className="text-center py-16">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No articles published yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Featured Article */}
              {featuredArticle && (
                <Link to={`/articles/${featuredArticle.slug}`} className="block group">
                  <Card className="overflow-hidden border-0 shadow-lg">
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="relative h-64 md:h-80 bg-muted">
                        {featuredArticle.cover_image_url ? (
                          <img
                            src={featuredArticle.cover_image_url}
                            alt={featuredArticle.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                            <Sparkles className="h-16 w-16 text-primary/30" />
                          </div>
                        )}
                        <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                          Featured
                        </Badge>
                      </div>
                      <CardContent className="p-8 flex flex-col justify-center">
                        <h3 className="text-2xl md:text-3xl font-serif mb-4 group-hover:text-primary transition-colors">
                          {featuredArticle.title}
                        </h3>
                        {featuredArticle.excerpt && (
                          <p className="text-muted-foreground mb-6 line-clamp-3">
                            {featuredArticle.excerpt}
                          </p>
                        )}
                        <span className="inline-flex items-center text-primary font-medium group-hover:gap-3 gap-2 transition-all">
                          Read Article <ArrowRight className="h-4 w-4" />
                        </span>
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              )}

              {/* Article Grid */}
              {articles.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((article) => (
                    <Link key={article.id} to={`/articles/${article.slug}`} className="group">
                      <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
                        <div className="relative h-48 bg-muted">
                          {article.cover_image_url ? (
                            <img
                              src={article.cover_image_url}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/5">
                              <Sparkles className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          {article.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {article.excerpt}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

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

      {/* Lifestyle Banners */}
      <LifestyleBanners />

      <Footer />
    </div>
  );
}