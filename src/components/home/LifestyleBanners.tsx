import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSiteBanners } from '@/hooks/useSiteContent';
import { motion } from 'framer-motion';

export function LifestyleBanners() {
  const { getBannersBySection, loading } = useSiteBanners();

  const lifestyleBanners = [
    ...getBannersBySection('lifestyle_1'),
    ...getBannersBySection('lifestyle_2'),
    ...getBannersBySection('lifestyle_3'),
  ].slice(0, 3);

  if (loading || lifestyleBanners.length === 0) {
    return null;
  }

  // First banner is large (spans 2 rows), others are stacked
  const [mainBanner, ...sideBanners] = lifestyleBanners;

  return (
    <section className="py-8 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Main Large Banner */}
          {mainBanner && (
            <motion.div
              className="relative aspect-[4/5] lg:aspect-auto lg:row-span-2 rounded-2xl overflow-hidden group"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <img
                src={mainBanner.image_url}
                alt={mainBanner.title || 'Lifestyle'}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                {mainBanner.title && (
                  <h3 className="text-xl md:text-2xl font-serif mb-2">{mainBanner.title}</h3>
                )}
                {mainBanner.subtitle && (
                  <p className="text-sm text-white/80 mb-4">{mainBanner.subtitle}</p>
                )}
                {mainBanner.button_text && (
                  <Button 
                    asChild 
                    size="sm"
                    className="bg-white text-foreground hover:bg-white/90 rounded-full px-6"
                  >
                    <Link to={mainBanner.button_link || '/products'}>
                      {mainBanner.button_text}
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Side Banners Stack */}
          <div className="grid grid-cols-1 gap-4 md:gap-6">
            {sideBanners.map((banner, index) => (
              <motion.div
                key={banner.id}
                className="relative aspect-[16/9] rounded-2xl overflow-hidden group"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <img
                  src={banner.image_url}
                  alt={banner.title || 'Lifestyle'}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  {banner.title && (
                    <h3 className="text-lg font-serif mb-2">{banner.title}</h3>
                  )}
                  {banner.button_text && (
                    <Button 
                      asChild 
                      size="sm"
                      variant="outline"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-full px-5 text-xs"
                    >
                      <Link to={banner.button_link || '/products'}>
                        {banner.button_text}
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
