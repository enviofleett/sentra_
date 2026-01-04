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
  const subheadline = getContent('hero', 'subheadline', 'Discover the beauty of fragrance with our collection of premium perfumes');
  const buttonText = getContent('hero', 'button_text', 'SHOP NOW');

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

  // Fallback slide if no banners
  const slides = heroBanners.length > 0 ? heroBanners : [{ 
    id: 'default', 
    image_url: '', 
    title: null, 
    subtitle: null 
  }];

  return (
    <section className="relative bg-background overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        {/* Mobile Layout */}
        <div className="flex flex-col lg:hidden py-8 gap-6">
          {/* Mobile Headlines */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-3"
          >
            <span className="text-sm italic text-muted-foreground font-serif">Discover</span>
            <h1 className="text-4xl sm:text-5xl font-serif leading-[1.1]">
              The Secrets<br />
              <span className="italic">of Sentra</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {subheadline}
            </p>
          </motion.div>

          {/* Mobile Image */}
          <div className="relative mx-auto w-full max-w-[320px]">
            
            <div className="overflow-hidden relative z-10" ref={emblaRef}>
              <div className="flex">
                {slides.map((banner, index) => (
                  <div key={banner.id || index} className="flex-[0_0_100%] min-w-0">
                    {banner.image_url ? (
                      <motion.img
                        src={banner.image_url}
                        alt={banner.title || 'Luxury Fragrance'}
                        className="w-full h-auto object-contain drop-shadow-xl"
                        loading="eager"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ) : (
                      <div className="aspect-[3/4] bg-cream rounded-3xl flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">Perfume Image</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            <Button 
              asChild 
              size="lg" 
              className="bg-foreground hover:bg-foreground/90 text-background font-medium px-8 h-12 text-sm tracking-wider rounded-none"
            >
              <Link to="/products" className="inline-flex items-center gap-3">
                {buttonText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          {/* Navigation dots */}
          {slides.length > 1 && (
            <div className="flex justify-center gap-2">
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
          )}
        </div>

        {/* Desktop Layout - Asymmetric with Organic Blob */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-8 items-center min-h-[85vh] py-12">
          {/* Left - Organic Blob with Products */}
          <motion.div 
            className="relative flex justify-center items-center"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            
            {/* Carousel */}
            <div className="relative w-full max-w-md overflow-hidden z-10" ref={emblaRef}>
              <div className="flex">
                {slides.map((banner, index) => (
                  <div key={banner.id || index} className="flex-[0_0_100%] min-w-0 p-8">
                    {banner.image_url ? (
                      <motion.img
                        src={banner.image_url}
                        alt={banner.title || 'Luxury Fragrance'}
                        className="w-full h-auto object-contain drop-shadow-2xl"
                        loading={index === 0 ? "eager" : "lazy"}
                        animate={{ y: [0, -12, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ) : (
                      <div className="aspect-[3/4] bg-cream rounded-3xl flex items-center justify-center">
                        <span className="text-muted-foreground">Hero Image</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation dots */}
            {slides.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollTo(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      index === selectedIndex 
                        ? 'bg-foreground w-8' 
                        : 'w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Right - Content */}
          <motion.div 
            className="space-y-6 lg:pl-8"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="space-y-4">
              <span className="text-lg italic text-muted-foreground font-serif">
                Discover
              </span>
              
              <AnimatePresence mode="wait">
                <motion.h1
                  key={currentBanner?.title || 'default'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-5xl xl:text-6xl 2xl:text-7xl font-serif leading-[1.05]"
                >
                  The Secrets<br />
                  <span className="italic">of Sentra</span>
                </motion.h1>
              </AnimatePresence>
            </div>
            
            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              {currentBanner?.subtitle || subheadline}
            </p>
            
            <Button 
              asChild 
              size="lg" 
              className="bg-foreground hover:bg-foreground/90 text-background font-medium px-10 h-14 text-sm tracking-wider rounded-none"
            >
              <Link to={currentBanner?.button_link || "/products"} className="inline-flex items-center gap-3">
                {currentBanner?.button_text || buttonText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
