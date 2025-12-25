import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import sentraLogo from '@/assets/sentra-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    // Fetch featured products for curated recommendations
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, image_url, price, brand')
        .eq('is_active', true)
        .eq('is_featured', true)
        .limit(4);
      
      if (data) setFeaturedProducts(data);
    };
    
    fetchFeatured();
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
    { name: 'Collection', href: '/products' },
    { name: 'Circles', href: '/products' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass">
      <nav className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center py-4 transition-opacity hover:opacity-80" 
          aria-label="Sentra - Luxury Perfumes Home"
        >
          <img 
            src={sentraLogo} 
            alt="Sentra" 
            className="h-8 md:h-9 w-auto object-contain"
            loading="eager"
            width="auto"
            height="36"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-10">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="text-sm font-medium uppercase tracking-[0.15em] text-foreground/70 hover:text-foreground transition-colors relative group"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-secondary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 md:space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:bg-accent/50"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative hover:bg-accent/50">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-accent/50">
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
            <Button asChild variant="ghost" size="sm" className="hidden md:flex font-medium text-sm">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-card">
              <div className="flex flex-col space-y-6 mt-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-lg font-serif tracking-wide text-foreground/80 hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                ))}
                {!user && (
                  <Button asChild variant="outline" className="w-full mt-4">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Concierge Search Modal */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="overflow-hidden p-0 max-w-lg bg-card/95 backdrop-blur-xl border-border/50">
          <Command className="bg-transparent">
            <form onSubmit={handleSearchSubmit}>
              <div className="flex items-center border-b border-border/50 px-4">
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
                      className="cursor-pointer flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50"
                    >
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-md bg-muted"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs uppercase tracking-wider text-muted-foreground font-serif">
                            {product.brand}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground">
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
