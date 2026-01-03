import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, Sparkles, Heart, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import sentraLogo from '@/assets/sentra-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { totalItems } = useCart();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, image_url, price, brand')
          .eq('is_active', true)
          .eq('is_featured', true)
          .limit(4),
        supabase
          .from('categories')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('name')
          .limit(6)
      ]);
      
      if (productsRes.data) setFeaturedProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    };
    
    fetchData();
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleProductSelect = (productId: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(`/products/${productId}`);
  };

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Circles', href: '/products' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass">
      <nav className="container mx-auto h-16 md:h-20 px-4 lg:px-8">
        {/* Desktop Layout - 3 Column Grid */}
        <div className="hidden lg:grid lg:grid-cols-3 h-full items-center">
          {/* Left - Navigation */}
          <div className="flex items-center gap-1">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                <NavigationMenuItem>
                  <Link 
                    to="/" 
                    className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                  >
                    HOME
                  </Link>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent hover:bg-accent text-foreground/70 hover:text-foreground text-sm font-medium">
                    SHOP
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[400px] p-4 bg-background">
                      <div className="grid grid-cols-2 gap-3">
                        <Link 
                          to="/products" 
                          className="block p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <span className="font-medium text-sm">All Products</span>
                          <p className="text-xs text-muted-foreground mt-1">Browse our full collection</p>
                        </Link>
                        {categories.map((category) => (
                          <Link 
                            key={category.id}
                            to={`/products?category=${category.slug}`} 
                            className="block p-3 rounded-lg hover:bg-accent transition-colors"
                          >
                            <span className="font-medium text-sm">{category.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link 
                    to="/products" 
                    className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
                  >
                    CIRCLES
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Center - Logo */}
          <div className="flex justify-center">
            <Link 
              to="/" 
              className="transition-opacity hover:opacity-80" 
              aria-label="Sentra - Luxury Perfumes Home"
            >
              <img 
                src={sentraLogo} 
                alt="Sentra" 
                className="h-10 w-auto object-contain"
                loading="eager"
              />
            </Link>
          </div>

          {/* Right - Icons */}
          <div className="flex items-center justify-end gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="hover:bg-accent"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="hover:bg-accent">
              <Heart className="h-5 w-5" />
            </Button>

            {user ? (
              <DropdownMenu>
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
                  <DropdownMenuItem asChild>
                    <Link to="/profile/groupbuys" className="cursor-pointer">My Circles</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">Admin Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm" className="font-medium text-sm">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative hover:bg-accent">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">
                    {totalItems}
                  </span>
                )}
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
                {categories.map((category) => (
                  <Link 
                    key={category.id}
                    to={`/products?category=${category.slug}`}
                    className="text-base text-foreground/60 hover:text-foreground transition-colors pl-4"
                  >
                    {category.name}
                  </Link>
                ))}
                <Link to="/products" className="text-lg font-serif text-foreground/80 hover:text-foreground transition-colors">
                  Circles
                </Link>
                {!user && (
                  <Button asChild variant="outline" className="w-full mt-4 rounded-full">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link 
            to="/" 
            className="transition-opacity hover:opacity-80" 
            aria-label="Sentra"
          >
            <img 
              src={sentraLogo} 
              alt="Sentra" 
              className="h-7 w-auto object-contain"
              loading="eager"
            />
          </Link>

          {/* Right Icons */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Search Modal */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="overflow-hidden p-0 max-w-lg bg-background border-border">
          <Command className="bg-transparent">
            <form onSubmit={handleSearchSubmit}>
              <div className="flex items-center border-b border-border px-4">
                <Search className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
                <CommandInput
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  placeholder="Search our collection..."
                  autoFocus
                  className="flex h-14 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0"
                />
              </div>
            </form>
            <CommandList className="max-h-[400px] overflow-y-auto p-2">
              {!searchQuery && featuredProducts.length > 0 && (
                <CommandGroup heading={
                  <span className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground px-2">
                    <Sparkles className="h-3 w-3" />
                    Curated for You
                  </span>
                }>
                  {featuredProducts.map((product) => (
                    <CommandItem 
                      key={product.id}
                      onSelect={() => handleProductSelect(product.id)}
                      className="cursor-pointer flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
                    >
                      {product.image_url ? (
                        <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center overflow-hidden">
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {product.brand}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        ₦{product.price?.toLocaleString()}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No fragrances found.' : 'Start typing to search...'}
              </CommandEmpty>
              
              {searchQuery && (
                <CommandItem 
                  onSelect={() => handleSearchSubmit()}
                  className="cursor-pointer flex items-center gap-3 p-3 rounded-lg"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span>Search for "<span className="font-medium">{searchQuery}</span>"</span>
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </header>
  );
};
