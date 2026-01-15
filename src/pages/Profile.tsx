import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Package, User as UserIcon, ShoppingBag, MapPin, Shield, Edit, Save, X, Wallet, Truck, CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import GroupBuysProfile from './profile/GroupBuysProfile';
import AddressesProfile from './profile/AddressesProfile';
import OrderDetail from './profile/OrderDetail';
import SecurityProfile from './profile/SecurityProfile';
import WalletProfile from './profile/WalletProfile';
import MembershipWalletProfile from './profile/MembershipWalletProfile';

const profileSchema = z.object({
  full_name: z.string().max(100, 'Name must be less than 100 characters').optional(),
  phone: z.string().regex(/^[\d\s\-\+\(\)]*$/, 'Invalid phone number').max(20).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      setProfile(data);
      reset({
        full_name: data.full_name || '',
        phone: data.phone || '',
      });
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        phone: data.phone,
      })
      .eq('id', user.id);

    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } else {
      setProfile({ ...profile, ...data });
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">My Profile</h2>
        {!isEditing && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email} disabled />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input {...register('full_name')} placeholder="Enter your full name" />
            {errors.full_name && (
              <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input {...register('phone')} placeholder="Enter your phone number" />
            {errors.phone && (
              <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsEditing(false);
                reset();
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-lg">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
            <p className="text-lg">{profile?.full_name || 'Not set'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Phone</label>
            <p className="text-lg">{profile?.phone || 'Not set'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold">My Orders</h2>
      
      {loading ? (
        <p className="text-muted-foreground">Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No orders yet</p>
          <Button asChild className="mt-4">
            <Link to="/products">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Link to={`/profile/orders/${order.id}`}>
                    <div>
                      <CardTitle className="text-lg hover:text-primary transition-colors">
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </Link>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span>{Array.isArray(order.items) ? order.items.length : 0}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-secondary">₦{order.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={`/profile/orders/${order.id}`}>
                        <Package className="h-4 w-4 mr-1" />
                        Details
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1">
                      <Link to={`/orders/${order.id}/track`}>
                        <Truck className="h-4 w-4 mr-1" />
                        Track
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8">My Account</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          <Card className="p-3 md:p-4 h-fit md:sticky md:top-24">
            <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
              <Link to="/profile" className="flex-shrink-0">
                <Button variant="ghost" className="w-full justify-start whitespace-nowrap">
                  <UserIcon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Profile</span>
                  <span className="sm:hidden">Info</span>
                </Button>
              </Link>
              <Link to="/profile/orders" className="flex-shrink-0">
                <Button variant="ghost" className="w-full justify-start whitespace-nowrap">
                  <Package className="h-4 w-4 mr-2" />
                  Orders
                </Button>
              </Link>
              <Link to="/profile/addresses" className="flex-shrink-0">
                <Button variant="ghost" className="w-full justify-start whitespace-nowrap">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Addresses</span>
                  <span className="sm:hidden">Address</span>
                </Button>
              </Link>
              <Link to="/profile/groupbuys" className="flex-shrink-0">
                <Button variant="ghost" className="w-full justify-start whitespace-nowrap">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Group Buys</span>
                  <span className="sm:hidden">Groups</span>
                </Button>
              </Link>
              <Link to="/profile/security" className="flex-shrink-0">
                <Button variant="ghost" className="w-full justify-start whitespace-nowrap">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </Button>
              </Link>
              <Link to="/profile/wallet" className="flex-shrink-0">
                <Button variant="ghost" className="w-full justify-start whitespace-nowrap">
                  <Wallet className="h-4 w-4 mr-2" />
                  Wallet
                </Button>
              </Link>
              <Link to="/profile/membership" className="flex-shrink-0">
                <Button variant="ghost" className="w-full justify-start whitespace-nowrap">
                  <CreditCard className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Membership</span>
                  <span className="sm:hidden">Member</span>
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </nav>
          </Card>
          
          <div className="md:col-span-3">
            <Card>
              <Routes>
                <Route index element={<ProfileInfo />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:orderId" element={<OrderDetail />} />
                <Route path="addresses" element={<AddressesProfile />} />
                <Route path="groupbuys" element={<GroupBuysProfile />} />
                <Route path="security" element={<SecurityProfile />} />
                <Route path="wallet" element={<WalletProfile />} />
                <Route path="membership" element={<MembershipWalletProfile />} />
              </Routes>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}