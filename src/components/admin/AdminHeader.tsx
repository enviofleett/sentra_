import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, FolderTree, Store, Settings, Menu, Users, Sparkles, Tag, UserPlus, Wallet, FileText, LogOut, Mail, Percent, BarChart3 } from 'lucide-react';
import sentraLogo from '@/assets/sentra-logo.png';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
const navigation = [{
  name: 'Dashboard',
  href: '/admin',
  icon: LayoutDashboard
}, {
  name: 'Products',
  href: '/admin/products',
  icon: Package
}, {
  name: 'Orders',
  href: '/admin/orders',
  icon: ShoppingCart
}, {
  name: 'Categories',
  href: '/admin/categories',
  icon: FolderTree
}, {
  name: 'Vendors',
  href: '/admin/vendors',
  icon: Store
}, {
  name: 'Group Buys',
  href: '/admin/groupbuys',
  icon: Sparkles
}, {
  name: 'Discounts',
  href: '/admin/discounts',
  icon: Tag
}, {
  name: 'Affiliates',
  href: '/admin/affiliates',
  icon: Wallet
}, {
  name: 'Users',
  href: '/admin/users',
  icon: Users
}, {
  name: 'Waitlist',
  href: '/admin/waitlist',
  icon: UserPlus
}, {
  name: 'Articles',
  href: '/admin/articles',
  icon: FileText
}, {
  name: 'Content',
  href: '/admin/content',
  icon: FileText
}, {
  name: 'Settings',
  href: '/admin/settings',
  icon: Settings
}];
export function AdminHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    signOut
  } = useAuth();
  const [open, setOpen] = useState(false);
  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  return <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex-shrink-0">
              <img src={sentraLogo} alt="Sentra" className="h-5 w-auto object-contain" />
            </Link>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Admin
            </span>
          </div>

          {/* Desktop Navigation - only on xl screens */}
          <nav className="hidden xl:flex items-center gap-1">
            {navigation.map(item => <Link key={item.name} to={item.href}>
                <Button variant={isActive(item.href) ? 'secondary' : 'ghost'} size="sm" className={`gap-1.5 text-xs ${isActive(item.href) ? 'bg-secondary text-secondary-foreground' : ''}`}>
                  <item.icon className="h-3.5 w-3.5" />
                  {item.name}
                </Button>
              </Link>)}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          </nav>

          {/* Mobile/Tablet Navigation */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="xl:hidden">
              <Button variant="outline" size="sm" className="gap-2">
                <Menu className="h-4 w-4" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <img src={sentraLogo} alt="Sentra" className="h-5 w-auto" />
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Admin</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  
                </Button>
              </div>
              <nav className="flex flex-col p-2 overflow-y-auto max-h-[calc(100vh-80px)]">
                {navigation.map(item => <Link key={item.name} to={item.href} onClick={() => setOpen(false)}>
                    <Button variant={isActive(item.href) ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 h-11">
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>)}
                <Button variant="ghost" onClick={() => {
                setOpen(false);
                handleLogout();
              }} className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>;
}