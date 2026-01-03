import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSiteBanners } from '@/hooks/useSiteContent';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function LifestyleBanners() {
  const { getBannersBySection, loading } = useSiteBanners();

  const lifestyleBanners = [
    ...getBannersBySection('lifestyle_1'),
    ...getBannersBySection('lifestyle_2'),
  ].slice(0, 2);

  if (loading || lifestyleBanners.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {lifestyleBanners.map((banner, index) => (
            <motion.div
              key={banner.id}
              className="relative aspect-[4/3] md:aspect-[16/10] rounded-2xl overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <img
                src={banner.image_url}
                alt={banner.title || 'Lifestyle'}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 text-white">
                {/* Promo Label */}
                {banner.subtitle && (
                  <span className="inline-block text-xs uppercase tracking-widest mb-2 text-coral-foreground bg-coral px-3 py-1 rounded-sm">
                    {banner.subtitle}
                  </span>
                )}
                
                {banner.title && (
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-serif mb-4">{banner.title}</h3>
                )}
                
                {banner.button_text && (
                  <Button 
                    asChild 
                    size="sm"
                    className="bg-white text-foreground hover:bg-white/90 rounded-none px-6 text-xs tracking-wider font-medium"
                  >
                    <Link to={banner.button_link || '/products'} className="inline-flex items-center gap-2">
                      {banner.button_text}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
