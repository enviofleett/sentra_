import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useSiteContent, useSiteBanners } from '@/hooks/useSiteContent';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export function HeroSection() {
  const { getContent } = useSiteContent();
  const { getBannersBySection, loading } = useSiteBanners();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const heroBanners = getBannersBySection('hero');
  const headline = getContent('hero', 'headline', 'Smell is a word • Perfume is literature');
  const subheadline = getContent('hero', 'subheadline', 'Discover the beauty of fragrance with our collection of premium perfumes to enrich your everyday smell');
  const buttonText = getContent('hero', 'button_text', 'Shop Now');
  const rightTitle = getContent('hero', 'right_title', 'BEST PERFUME');
  const rightLinkText = getContent('hero', 'right_link_text', 'SEE ALL PRODUCTS');

  // Split headline for artistic display
  const headlineParts = headline.split('•').map(s => s.trim());

  // Autoplay plugin
  const autoplayPlugin = Autoplay({ delay: 5000, stopOnInteraction: false });

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplayPlugin]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  // Get current slide data
  const currentBanner = heroBanners[selectedIndex] || heroBanners[0];
  const slideCount = heroBanners.length || 1;

  // Fallback slide if no banners
  const slides = heroBanners.length > 0 ? heroBanners : [{ 
    id: 'default', 
    image_url: '', 
    title: null, 
    subtitle: null 
  }];

  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-background via-accent/20 to-background overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 md:w-64 md:h-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 md:w-80 md:h-80 rounded-full bg-accent/30 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        {/* Mobile Layout - Stacked */}
        <div className="flex flex-col lg:hidden items-center text-center py-8 gap-8">
          {/* Mobile Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h1 className="text-4xl sm:text-5xl font-serif leading-[1.1] tracking-tight">
              {headlineParts.map((part, index) => (
                <span key={index} className="block">
                  {part}
                </span>
              ))}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {subheadline}
            </p>
          </motion.div>

          {/* Mobile Carousel */}
          <div className="relative w-full max-w-[300px] sm:max-w-[360px]">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {slides.map((banner, index) => (
                  <div key={banner.id || index} className="flex-[0_0_100%] min-w-0">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8 }}
                      className="relative w-full"
                    >
                      {/* Decorative circle behind bottle */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[90%] h-[90%] rounded-full bg-accent/40 blur-xl" />
                      </div>
                      
                      {banner.image_url ? (
                        <motion.img
                          src={banner.image_url}
                          alt={banner.title || 'Luxury Fragrance'}
                          className="relative w-full h-auto object-contain drop-shadow-2xl"
                          loading="eager"
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ) : (
                        <div className="relative aspect-[3/4] bg-accent/50 rounded-3xl flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">Perfume Image</span>
                        </div>
                      )}
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-center gap-4"
          >
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
            
            <Link 
              to="/products" 
              className="text-xs tracking-widest text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
            >
              {rightLinkText}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </motion.div>

          {/* Navigation dots */}
          <div className="flex gap-2 mt-4">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === selectedIndex 
                    ? 'bg-foreground w-6' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Layout - 3 Zone */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-8 items-center min-h-[80vh]">
          {/* Left Content Zone - 4 columns */}
          <motion.div 
            className="lg:col-span-4 space-y-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner?.title || 'default'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-5xl xl:text-6xl 2xl:text-7xl font-serif leading-[1.05] tracking-tight">
                  {headlineParts.map((part, index) => (
                    <span key={index} className="block">
                      {part}
                    </span>
                  ))}
                </h1>
              </motion.div>
            </AnimatePresence>
            
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
              {currentBanner?.subtitle || subheadline}
            </p>
            
            <Button 
              asChild 
              size="lg" 
              className="bg-foreground hover:bg-foreground/90 text-background font-medium px-10 h-14 text-sm tracking-wider rounded-full"
            >
              <Link to={currentBanner?.button_link || "/products"} className="inline-flex items-center gap-3">
                {currentBanner?.button_text || buttonText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Center Image Zone - 4 columns with Carousel */}
          <motion.div 
            className="lg:col-span-4 relative flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Decorative circle behind bottle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[85%] h-[85%] rounded-full bg-gradient-to-br from-accent/60 to-primary/10 blur-2xl" />
            </div>
            
            {/* Carousel */}
            <div className="relative w-full max-w-md overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {slides.map((banner, index) => (
                  <div key={banner.id || index} className="flex-[0_0_100%] min-w-0">
                    {banner.image_url ? (
                      <motion.img
                        src={banner.image_url}
                        alt={banner.title || 'Luxury Fragrance'}
                        className="relative w-full h-auto object-contain drop-shadow-2xl"
                        loading={index === 0 ? "eager" : "lazy"}
                        animate={{ y: [0, -15, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ) : (
                      <div className="relative aspect-[3/4] bg-accent/50 rounded-3xl flex items-center justify-center">
                        <span className="text-muted-foreground">Hero Image</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation dots below image */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === selectedIndex 
                      ? 'bg-foreground w-8' 
                      : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>

          {/* Right Content Zone - 4 columns */}
          <motion.div 
            className="lg:col-span-4 flex flex-col items-end text-right space-y-6"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="space-y-4">
              <span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
                {rightTitle}
              </span>
              
              <div className="w-16 h-px bg-border ml-auto" />
              
              <Link 
                to="/products" 
                className="text-sm tracking-widest text-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group"
              >
                {rightLinkText}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Slide counter */}
            <div className="mt-auto pt-20">
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{String(selectedIndex + 1).padStart(2, '0')}</span>
                <span className="mx-2">/</span>
                <span>{String(slideCount).padStart(2, '0')}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
