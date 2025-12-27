import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useSiteContent, useSiteBanners } from '@/hooks/useSiteContent';
import { motion } from 'framer-motion';

export function HeroSection() {
  const { getContent } = useSiteContent();
  const { getBanner } = useSiteBanners();

  const heroBanner = getBanner('hero');
  const headline = getContent('hero', 'headline', 'Smell is a word • Perfume is literature');
  const subheadline = getContent('hero', 'subheadline', 'Discover the beauty of fragrance with our collection of premium perfumes to enrich your everyday smell');
  const buttonText = getContent('hero', 'button_text', 'Shop Now');
  const rightTitle = getContent('hero', 'right_title', 'BEST PERFUME');
  const rightLinkText = getContent('hero', 'right_link_text', 'SEE ALL PRODUCTS');

  // Split headline for artistic display
  const headlineParts = headline.split('•').map(s => s.trim());

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

          {/* Mobile Center Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full max-w-[280px] sm:max-w-[320px]"
          >
            {/* Decorative circle behind bottle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[90%] h-[90%] rounded-full bg-accent/40 blur-xl" />
            </div>
            
            {heroBanner?.image_url ? (
              <motion.img
                src={heroBanner.image_url}
                alt="Luxury Fragrance"
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
            <div className="w-2 h-2 rounded-full bg-foreground" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
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
            <h1 className="text-5xl xl:text-6xl 2xl:text-7xl font-serif leading-[1.05] tracking-tight">
              {headlineParts.map((part, index) => (
                <span key={index} className="block">
                  {part}
                </span>
              ))}
            </h1>
            
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm">
              {subheadline}
            </p>
            
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
          </motion.div>

          {/* Center Image Zone - 4 columns */}
          <motion.div 
            className="lg:col-span-4 relative flex justify-center items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Decorative circle behind bottle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[85%] h-[85%] rounded-full bg-gradient-to-br from-accent/60 to-primary/10 blur-2xl" />
            </div>
            
            {/* Perfume bottle image */}
            <div className="relative w-full max-w-md">
              {heroBanner?.image_url ? (
                <motion.img
                  src={heroBanner.image_url}
                  alt="Luxury Fragrance"
                  className="relative w-full h-auto object-contain drop-shadow-2xl"
                  loading="eager"
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : (
                <div className="relative aspect-[3/4] bg-accent/50 rounded-3xl flex items-center justify-center">
                  <span className="text-muted-foreground">Hero Image</span>
                </div>
              )}
            </div>

            {/* Navigation dots below image */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
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

            {/* Decorative element */}
            <div className="mt-auto pt-20">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
