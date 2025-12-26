import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useSiteContent, useSiteBanners } from '@/hooks/useSiteContent';
import { motion } from 'framer-motion';

export function HeroSection() {
  const { getContent, loading: contentLoading } = useSiteContent();
  const { getBanner, loading: bannerLoading } = useSiteBanners();

  const heroBanner = getBanner('hero');
  const headline = getContent('hero', 'headline', 'Smell is a word • Perfume is literature');
  const subheadline = getContent('hero', 'subheadline', 'Discover the beauty of fragrance with our collection of premium perfumes to enrich your everyday smell');
  const buttonText = getContent('hero', 'button_text', 'Shop Now');

  // Split headline for artistic display
  const headlineParts = headline.split('•').map(s => s.trim());

  return (
    <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center bg-background overflow-hidden">
      {/* Content Grid */}
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div 
            className="space-y-8 py-12 lg:py-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif leading-[1.1] tracking-tight">
              {headlineParts.map((part, index) => (
                <span key={index} className="block">
                  {part}
                  {index < headlineParts.length - 1 && (
                    <span className="text-muted-foreground/30 mx-2">•</span>
                  )}
                </span>
              ))}
            </h1>
            
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
              {subheadline}
            </p>
            
            <div>
              <Button 
                asChild 
                size="lg" 
                className="bg-foreground hover:bg-foreground/90 text-background font-medium px-10 h-14 text-sm tracking-wider rounded-full"
              >
                <Link to="/products" className="inline-flex items-center gap-3">
                  {buttonText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div 
            className="relative flex justify-center lg:justify-end"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl">
              {heroBanner?.image_url ? (
                <img
                  src={heroBanner.image_url}
                  alt="Luxury Fragrance"
                  className="w-full h-auto object-contain"
                  loading="eager"
                />
              ) : (
                <div className="aspect-[3/4] bg-accent rounded-3xl flex items-center justify-center">
                  <span className="text-muted-foreground">Hero Image</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
