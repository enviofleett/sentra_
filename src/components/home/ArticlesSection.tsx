import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Sparkles, BookOpen } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  is_featured: boolean | null;
}

interface ArticlesSectionProps {
  articles: Article[];
  featuredArticle: Article | null;
  loading: boolean;
  title: string;
  subtitle: string;
}

// Placeholder images for articles without covers
const placeholderImages = [
  'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80', // Perfume bottles
  'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=800&q=80', // Fragrance ingredients
  'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80', // Luxury perfume
  'https://images.unsplash.com/photo-1619994403073-2cec844b8e63?w=800&q=80', // Elegant bottle
  'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80', // Perfume spray
  'https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=800&q=80', // Rose petals
];

const getPlaceholderImage = (index: number) => placeholderImages[index % placeholderImages.length];

export function ArticlesSection({ articles, featuredArticle, loading, title, subtitle }: ArticlesSectionProps) {
  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-3" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <Skeleton className="h-[500px] w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-5 space-y-6">
              <Skeleton className="h-[240px] w-full rounded-2xl" />
              <Skeleton className="h-[240px] w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (articles.length === 0 && !featuredArticle) {
    return (
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif mb-3">{title}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
          </div>
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <BookOpen className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-lg">No articles published yet. Check back soon!</p>
          </div>
        </div>
      </section>
    );
  }

  const allArticles = featuredArticle ? [featuredArticle, ...articles] : articles;
  const mainArticle = allArticles[0];
  const secondaryArticles = allArticles.slice(1, 3);
  const gridArticles = allArticles.slice(3, 7);

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <Badge variant="outline" className="mb-4 text-xs tracking-widest uppercase">
            <Sparkles className="h-3 w-3 mr-1" />
            Our Journal
          </Badge>
          <h2 className="text-3xl md:text-5xl font-serif mb-4">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">{subtitle}</p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid lg:grid-cols-12 gap-5 md:gap-6 mb-8">
          {/* Main Featured Article - Large */}
          {mainArticle && (
            <div className="lg:col-span-7 group">
              <Card className="overflow-hidden h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card">
                {/* Image Section - Clean without overlay text */}
                <Link to={`/articles/${mainArticle.slug}`} className="block relative overflow-hidden">
                  <div className="relative aspect-[16/10] md:aspect-[16/9]">
                    <img
                      src={mainArticle.cover_image_url || getPlaceholderImage(0)}
                      alt={mainArticle.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {mainArticle.is_featured && (
                      <Badge className="absolute top-4 left-4 bg-primary/90 text-primary-foreground shadow-lg">
                        Featured Story
                      </Badge>
                    )}
                  </div>
                </Link>
                
                {/* Content Section - Below Image */}
                <CardContent className="p-5 md:p-7">
                  
                  <Link to={`/articles/${mainArticle.slug}`}>
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-serif mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {mainArticle.title}
                    </h3>
                  </Link>
                  
                  {mainArticle.excerpt && (
                    <p className="text-muted-foreground mb-5 line-clamp-3 text-sm md:text-base leading-relaxed">
                      {mainArticle.excerpt}
                    </p>
                  )}
                  
                  <Button asChild variant="outline" size="sm" className="group/btn">
                    <Link to={`/articles/${mainArticle.slug}`} className="inline-flex items-center gap-2">
                      Read Full Story
                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Secondary Articles - Stacked */}
          <div className="lg:col-span-5 flex flex-col gap-5 md:gap-6">
            {secondaryArticles.map((article, index) => (
              <Card 
                key={article.id} 
                className="overflow-hidden flex-1 border-0 shadow-md hover:shadow-lg transition-all duration-300 group"
              >
                <div className="flex flex-col sm:flex-row h-full">
                  {/* Image */}
                  <Link 
                    to={`/articles/${article.slug}`}
                    className="relative w-full sm:w-2/5 aspect-[16/9] sm:aspect-auto sm:min-h-[180px] overflow-hidden"
                  >
                    <img
                      src={article.cover_image_url || getPlaceholderImage(index + 1)}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                  
                  {/* Content */}
                  <CardContent className="w-full sm:w-3/5 p-4 md:p-5 flex flex-col justify-between">
                    <div>
                      <Link to={`/articles/${article.slug}`}>
                        <h3 className="font-serif text-base md:text-lg lg:text-xl mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                      </Link>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      asChild 
                      variant="ghost" 
                      size="sm" 
                      className="w-fit mt-3 p-0 h-auto text-primary hover:bg-transparent group/btn"
                    >
                      <Link to={`/articles/${article.slug}`} className="inline-flex items-center gap-1.5">
                        Read More
                        <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom Grid - Smaller Cards */}
        {gridArticles.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {gridArticles.map((article, index) => (
              <Card 
                key={article.id} 
                className="overflow-hidden h-full border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
              >
                {/* Image */}
                <Link to={`/articles/${article.slug}`} className="block relative overflow-hidden">
                  <div className="relative aspect-[4/3]">
                    <img
                      src={article.cover_image_url || getPlaceholderImage(index + 3)}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </Link>
                
                {/* Content */}
                <CardContent className="p-4">
                  
                  <Link to={`/articles/${article.slug}`}>
                    <h3 className="font-medium text-sm md:text-base mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                  </Link>
                  
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {article.excerpt}
                    </p>
                  )}
                  
                  <Button 
                    asChild 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto text-primary font-medium group/btn"
                  >
                    <Link to={`/articles/${article.slug}`} className="inline-flex items-center gap-1">
                      Read More
                      <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View All Link */}
        {allArticles.length >= 4 && (
          <div className="text-center mt-10">
            <Button asChild variant="outline" size="lg" className="group">
              <Link to="/articles" className="inline-flex items-center gap-2">
                View All Articles 
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
