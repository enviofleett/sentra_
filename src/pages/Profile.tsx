import { useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function Orders() {
  return <div className="p-6"><h2 className="text-2xl font-bold">My Orders</h2></div>;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <Card className="p-4 h-fit">
            <nav className="space-y-2">
              <Link to="/profile"><Button variant="ghost" className="w-full justify-start">Profile</Button></Link>
              <Link to="/profile/orders"><Button variant="ghost" className="w-full justify-start">Orders</Button></Link>
            </nav>
          </Card>
          <div className="md:col-span-3">
            <Card>
              <Routes>
                <Route index element={<div className="p-6"><h2 className="text-2xl font-bold">Profile</h2></div>} />
                <Route path="orders" element={<Orders />} />
              </Routes>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}