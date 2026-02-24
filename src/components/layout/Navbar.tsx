import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, Sparkles, Heart, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import sentraLogo from '@/assets/sentra-logo.png';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SmartSearchDialog } from '@/components/search/SmartSearch';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export const Navbar = () => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    totalItems
  } = useCart();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [isBrandsOpen, setIsBrandsOpen] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const {
          data
        } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);
  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        supabase.from('products').select('id, name, image_url, price, brand').eq('is_active', true).eq('is_featured', true).limit(4),
        supabase.from('categories').select('id, name, slug').eq('is_active', true).order('name').limit(6),
        supabase.from('featured_brands').select('id, name, logo_url').eq('is_active', true).order('display_order', { ascending: true })
      ]);
      if (productsRes.data) setFeaturedProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
    };
    fetchData();
  }, []);

  const navigation = [{
    name: 'Home',
    href: '/'
  }, {
    name: 'Circles',
    href: '/products'
  }, {
    name: 'Contact',
    href: '/contact'
  }];
  return <header className="sticky top-0 z-50 w-full glass">
      <nav className="container mx-auto h-16 md:h-20 px-4 lg:px-8">
        {/* Desktop Layout - 3 Column Grid */}
        <div className="hidden lg:grid lg:grid-cols-3 h-full items-center">
          {/* Left - Navigation */}
          <div className="flex items-center gap-1">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                <NavigationMenuItem>
                  <Link to="/" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
                    HOME
                  </Link>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <Link to="/products" className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
                    SHOP
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Center - Logo */}
          <div className="flex justify-center">
            <Link to="/" className="transition-opacity hover:opacity-80" aria-label="Sentra - Luxury Perfumes Home">
              <img src={sentraLogo} alt="Sentra" className="h-10 w-auto object-contain" loading="eager" />
            </Link>
          </div>

          {/* Right - Icons */}
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="hover:bg-accent" onClick={() => setIsSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="hover:bg-accent">
              <Heart className="h-5 w-5" />
            </Button>

            {user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-accent">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile/orders" className="cursor-pointer">My Orders</Link>
                  </DropdownMenuItem>

                  {isAdmin && <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">Admin Dashboard</Link>
                    </DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    await signOut();
                    window.location.href = '/';
                  }} className="cursor-pointer">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> : <Button asChild variant="ghost" size="sm" className="font-medium text-sm">
                <Link to="/auth">Sign In</Link>
              </Button>}

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative hover:bg-accent">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">
                    {totalItems}
                  </span>}
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex lg:hidden h-full items-center justify-between">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-background">
              <div className="flex flex-col space-y-6 mt-8">
                <Link to="/" className="text-lg font-serif text-foreground/80 hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link to="/products" className="text-lg font-serif text-foreground/80 hover:text-foreground transition-colors">
                  Shop All
                </Link>
                {categories.map(category => <Link key={category.id} to={`/products?category=${category.slug}`} className="text-base text-foreground/60 hover:text-foreground transition-colors pl-4">
                    {category.name}
                  </Link>)}
                
                {/* Brands Section */}
                <div className="border-t border-border/50 pt-2">
                  <button
                    onClick={() => setIsBrandsOpen(!isBrandsOpen)}
                    className="flex w-full items-center justify-between py-2 text-lg font-serif text-foreground/80 hover:text-foreground transition-colors min-h-[44px]"
                    aria-expanded={isBrandsOpen}
                    aria-controls="mobile-brands-list"
                  >
                    <span>Brands</span>
                    <ChevronDown
                      className={`h-5 w-5 transition-transform duration-300 ease-in-out ${
                        isBrandsOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  
                  <div
                    id="mobile-brands-list"
                    className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                      isBrandsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                    aria-hidden={!isBrandsOpen}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-col space-y-1 pt-1 pl-4 pb-2">
                        {brands.length > 0 ? (
                          brands.map((brand) => (
                            <Link
                              key={brand.id}
                              to={`/products?brand=${encodeURIComponent(brand.name)}`}
                              className="flex items-center gap-3 py-2 text-base text-foreground/60 hover:text-foreground transition-colors min-h-[44px]"
                            >
                              {brand.logo_url && (
                                <div className="h-8 w-8 rounded-full bg-muted/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  <img 
                                    src={brand.logo_url} 
                                    alt="" 
                                    className="h-full w-full object-contain p-1"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <span className="truncate">{brand.name}</span>
                            </Link>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground pl-2 py-2">Loading brands...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Link to="/products" className="text-lg font-serif text-foreground/80 hover:text-foreground transition-colors">
                  Circles
                </Link>
                {!user && <Button asChild variant="outline" className="w-full mt-4 rounded-full">
                    <Link to="/auth">Sign In</Link>
                  </Button>}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="transition-opacity hover:opacity-80" aria-label="Sentra">
            <img src={sentraLogo} alt="Sentra" className="h-7 w-auto object-contain" loading="eager" />
          </Link>

          {/* Right Icons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile/orders" className="cursor-pointer">My Orders</Link>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">Admin Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    await signOut();
                    window.location.href = '/';
                  }} className="cursor-pointer">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
            
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold">
                    {totalItems}
                  </span>}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Search Modal */}
      <SmartSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </header>;
};