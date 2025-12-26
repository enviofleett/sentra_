import { useFeaturedBrands } from '@/hooks/useSiteContent';
import { motion } from 'framer-motion';

export function BrandBar() {
  const { brands, loading } = useFeaturedBrands();

  if (loading || brands.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 border-y border-border/50 bg-background">
      <div className="container mx-auto px-4">
        <motion.div 
          className="flex items-center justify-center gap-8 md:gap-16 lg:gap-24 flex-wrap"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {brands.map((brand, index) => (
            <motion.div
              key={brand.id}
              className="h-8 md:h-10 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 0.6, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-full w-auto object-contain"
                loading="lazy"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
