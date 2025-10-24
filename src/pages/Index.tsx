import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Truck, Shield, Star } from 'lucide-react';
import heroPerfume from '@/assets/hero-perfume.jpg';

export default function Index() {
  const [heroItems, setHeroItems] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [heroData, productsData, testimonialsData] = await Promise.all([
      supabase.from('hero_items').select('*').eq('is_active', true).order('display_order'),
      supabase.from('products').select('*').eq('is_featured', true).eq('is_active', true).limit(4),
      supabase.from('testimonials').select('*').eq('is_active', true).limit(3)
    ]);

    if (heroData.data) setHeroItems(heroData.data);
    if (productsData.data) setFeaturedProducts(productsData.data);
    if (testimonialsData.data) setTestimonials(testimonialsData.data);
  };

  useEffect(() => {
    if (heroItems.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroItems.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [heroItems.length]);

  const currentHero = heroItems[currentSlide] || {
    title: 'Discover Luxury Perfumes',
    subtitle: 'Crafted to Perfection',
    description: 'Experience the finest collection of luxury fragrances',
    cta_text: 'Shop Now',
    cta_link: '/products'
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[600px] md:h-[700px] overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroPerfume} 
            alt="Luxury Perfume Collection" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-transparent" />
        </div>
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl text-left space-y-6 text-white">
            {currentHero.subtitle && (
              <p className="text-lg md:text-xl font-light tracking-wide text-white/90">
                {currentHero.subtitle}
              </p>
            )}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight text-white drop-shadow-lg">
              {currentHero.title}
            </h1>
            {currentHero.description && (
              <p className="text-lg md:text-xl text-white/80">
                {currentHero.description}
              </p>
            )}
            <Button asChild size="lg" variant="secondary" className="shadow-gold">
              <Link to={currentHero.cta_link || '/products'}>
                {currentHero.cta_text}
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Slide indicators */}
        {heroItems.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
            {heroItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentSlide ? 'bg-secondary w-8' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="py-16 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-secondary/10 rounded-full flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-lg">Premium Quality</h3>
              <p className="text-muted-foreground text-sm">
                Handcrafted fragrances using the finest ingredients
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-secondary/10 rounded-full flex items-center justify-center">
                <Truck className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-lg">Free Shipping</h3>
              <p className="text-muted-foreground text-sm">
                Complimentary delivery on all orders
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-secondary/10 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-lg">Authentic Guarantee</h3>
              <p className="text-muted-foreground text-sm">
                100% genuine luxury perfumes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Collection</h2>
              <p className="text-muted-foreground">Discover our most popular fragrances</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <Card key={product.id} className="group overflow-hidden shadow-elegant hover:shadow-gold transition-smooth">
                  <Link to={`/products/${product.id}`}>
                    <div className="aspect-square bg-accent overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
                          <Sparkles className="h-16 w-16 text-primary-foreground/30" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{product.name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary font-bold text-xl">
                          ₦{product.price.toLocaleString()}
                        </span>
                        {product.original_price && (
                          <span className="text-muted-foreground line-through text-sm">
                            ₦{product.original_price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
            <div className="text-center mt-12">
              <Button asChild variant="outline" size="lg">
                <Link to="/products">View All Products</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-accent">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
              <p className="text-muted-foreground">Loved by perfume enthusiasts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="shadow-elegant">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating || 5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                      ))}
                    </div>
                    <p className="text-foreground/80 mb-4 italic">"{testimonial.content}"</p>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-semibold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        {testimonial.location && (
                          <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
