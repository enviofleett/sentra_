import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FolderTree, 
  Store,
  Settings,
  Menu,
  X,
  Users,
  Sparkles,
  Tag,
  UserPlus,
  Wallet,
  FileText
} from 'lucide-react';
import sentraLogo from '@/assets/sentra-logo.png';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Categories', href: '/admin/categories', icon: FolderTree },
  { name: 'Vendors', href: '/admin/vendors', icon: Store },
  { name: 'Group Buys', href: '/admin/groupbuys', icon: Sparkles },
  { name: 'Discounts', href: '/admin/discounts', icon: Tag },
  { name: 'Affiliates', href: '/admin/affiliates', icon: Wallet },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Waitlist', href: '/admin/waitlist', icon: UserPlus },
  { name: 'Content', href: '/admin/content', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminHeader() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex-shrink-0">
              <img 
                src={sentraLogo} 
                alt="Sentra" 
                className="h-6 md:h-7 w-auto object-contain"
              />
            </Link>
            <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Admin
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link key={item.name} to={item.href}>
                <Button
                  variant={isActive(item.href) ? 'secondary' : 'ghost'}
                  className={`gap-2 ${
                    isActive(item.href)
                      ? 'bg-secondary text-secondary-foreground border-b-2 border-primary rounded-b-none'
                      : ''
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Mobile Navigation */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Navigation</h2>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex flex-col gap-2">
                {navigation.map((item) => (
                  <Link key={item.name} to={item.href} onClick={() => setOpen(false)}>
                    <Button
                      variant={isActive(item.href) ? 'secondary' : 'ghost'}
                      className="w-full justify-start gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
