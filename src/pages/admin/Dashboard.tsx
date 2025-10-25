import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  Package, 
  FolderTree, 
  Mail, 
  Users,
  Settings
} from 'lucide-react';
import { DashboardAnalytics } from './DashboardAnalytics';
import { ProductsManagement } from './ProductsManagement';
import { CategoriesManagement } from './CategoriesManagement';
import { OrdersManagement } from './OrdersManagement';
import { EmailTemplatesManagement } from './EmailTemplatesManagement';
import { UsersManagement } from './UsersManagement';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles = data?.map(r => r.role) || [];
    const isAdmin = roles.includes('admin');

    if (!isAdmin) {
      setHasAccess(false);
    } else {
      setHasAccess(true);
    }
  };

  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-8">You don't have permission to access this area.</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Categories', href: '/admin/categories', icon: FolderTree },
    { name: 'Orders', href: '/admin/orders', icon: Settings },
    { name: 'Email Templates', href: '/admin/templates', icon: Mail },
    { name: 'Users & Roles', href: '/admin/users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Sidebar */}
          <Card className="lg:col-span-1 p-4 h-fit">
            <nav className="space-y-2">
              {navigation.map((item) => (
                <Link key={item.name} to={item.href}>
                  <Button variant="ghost" className="w-full justify-start">
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </nav>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-4">
            <Routes>
              <Route index element={<DashboardAnalytics />} />
              <Route path="products" element={<ProductsManagement />} />
              <Route path="categories" element={<CategoriesManagement />} />
              <Route path="orders" element={<OrdersManagement />} />
              <Route path="templates" element={<EmailTemplatesManagement />} />
              <Route path="users" element={<UsersManagement />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}