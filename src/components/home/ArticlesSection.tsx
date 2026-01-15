import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Sparkles, BookOpen, Clock } from 'lucide-react';
import { format } from 'date-fns';

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

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return '';
  }
};

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
            <Link 
              to={`/articles/${mainArticle.slug}`} 
              className="lg:col-span-7 group"
            >
              <Card className="overflow-hidden h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card">
                <div className="relative h-[300px] md:h-[500px]">
                  <img
                    src={mainArticle.cover_image_url || getPlaceholderImage(0)}
                    alt={mainArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    {mainArticle.is_featured && (
                      <Badge className="mb-3 bg-primary/90 text-primary-foreground">
                        Featured Story
                      </Badge>
                    )}
                    <h3 className="text-xl md:text-3xl font-serif text-white mb-3 group-hover:text-primary-foreground/90 transition-colors line-clamp-2">
                      {mainArticle.title}
                    </h3>
                    {mainArticle.excerpt && (
                      <p className="text-white/80 mb-4 line-clamp-2 text-sm md:text-base hidden md:block">
                        {mainArticle.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(mainArticle.published_at)}
                      </span>
                      <span className="inline-flex items-center text-white font-medium text-sm group-hover:gap-3 gap-2 transition-all">
                        Read Story <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          )}

          {/* Secondary Articles - Stacked */}
          <div className="lg:col-span-5 flex flex-col gap-5 md:gap-6">
            {secondaryArticles.map((article, index) => (
              <Link 
                key={article.id} 
                to={`/articles/${article.slug}`} 
                className="group flex-1"
              >
                <Card className="overflow-hidden h-full border-0 shadow-md hover:shadow-lg transition-all duration-300">
                  <div className="flex h-full">
                    <div className="relative w-2/5 min-h-[180px] md:min-h-[220px]">
                      <img
                        src={article.cover_image_url || getPlaceholderImage(index + 1)}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <CardContent className="w-3/5 p-4 md:p-6 flex flex-col justify-center">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                        {formatDate(article.published_at)}
                      </span>
                      <h3 className="font-serif text-base md:text-xl mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 hidden md:block">
                          {article.excerpt}
                        </p>
                      )}
                      <span className="inline-flex items-center text-primary text-sm font-medium mt-3 group-hover:gap-2 gap-1 transition-all">
                        Read <ArrowRight className="h-3 w-3" />
                      </span>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Grid - Smaller Cards */}
        {gridArticles.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {gridArticles.map((article, index) => (
              <Link 
                key={article.id} 
                to={`/articles/${article.slug}`} 
                className="group"
              >
                <Card className="overflow-hidden h-full border hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  <div className="relative h-40 md:h-44">
                    <img
                      src={article.cover_image_url || getPlaceholderImage(index + 3)}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardContent className="p-4">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(article.published_at)}
                    </span>
                    <h3 className="font-medium text-sm md:text-base mt-1 group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* View All Link */}
        {allArticles.length >= 4 && (
          <div className="text-center mt-10">
            <Link 
              to="/articles" 
              className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all group"
            >
              View All Articles 
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
