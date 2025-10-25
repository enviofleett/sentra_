import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardAnalytics } from './DashboardAnalytics';
import { ProductsManagement } from './ProductsManagement';
import { CategoriesManagement } from './CategoriesManagement';
import { OrdersManagement } from './OrdersManagement';
import SettingsManagement from './SettingsManagement';

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

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles = data?.map(r => r.role) || [];
    const isAdmin = roles.includes('admin');
    setHasAccess(isAdmin);
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
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<DashboardAnalytics />} />
          <Route path="/products" element={<ProductsManagement />} />
          <Route path="/categories" element={<CategoriesManagement />} />
          <Route path="/orders" element={<OrdersManagement />} />
          <Route path="/settings" element={<SettingsManagement />} />
        </Routes>
      </main>
    </div>
  );
}