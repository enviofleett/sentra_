import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardAnalytics } from './DashboardAnalytics';
import { ProductsManagement } from './ProductsManagement';
import { CategoriesManagement } from './CategoriesManagement';
import { OrdersManagement } from './OrdersManagement';
import { VendorsManagement } from './VendorsManagement';
import SettingsManagement from './SettingsManagement';
import GroupBuyCampaignsManagement from './GroupBuyCampaignsManagement';
import { UsersManagement } from './UsersManagement';
import { UserDetailPage } from './UserDetailPage';
import DiscountThresholdsManagement from './DiscountThresholdsManagement';
import WaitlistManagement from './WaitlistManagement';
import AffiliatesManagement from './AffiliatesManagement';
import ContentManagement from './ContentManagement';
import ArticlesManagement from './ArticlesManagement';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) {
      setHasAccess(false);
      return;
    }

    // Use server-side is_admin() function for secure role verification
    const { data, error } = await supabase.rpc('is_admin');
    
    if (error) {
      console.error('Error checking admin status:', error);
      setHasAccess(false);
      return;
    }
    
    setHasAccess(data === true);
  };

  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-8 bg-card rounded-lg border shadow-sm">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="container mx-auto px-4 py-4 md:py-8">
        <Routes>
          <Route path="/" element={<DashboardAnalytics />} />
          <Route path="/products" element={<ProductsManagement />} />
          <Route path="/categories" element={<CategoriesManagement />} />
          <Route path="/orders" element={<OrdersManagement />} />
          <Route path="/vendors" element={<VendorsManagement />} />
          <Route path="/groupbuys" element={<GroupBuyCampaignsManagement />} />
          <Route path="/discounts" element={<DiscountThresholdsManagement />} />
          <Route path="/users" element={<UsersManagement />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/settings" element={<SettingsManagement />} />
          <Route path="/waitlist" element={<WaitlistManagement />} />
          <Route path="/affiliates" element={<AffiliatesManagement />} />
          <Route path="/content" element={<ContentManagement />} />
          <Route path="/articles" element={<ArticlesManagement />} />
        </Routes>
      </main>
    </div>
  );
}
