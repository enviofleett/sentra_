import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  User as UserIcon, 
  ShoppingBag, 
  MapPin, 
  Shield, 
  Edit, 
  Save, 
  X, 
  Wallet, 
  Truck, 
  CreditCard,
  Camera,
  Mail,
  Phone,
  Calendar,
  Settings,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

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

interface ProfileData {
  full_name: string | null;
  phone: string | null;
  email: string;
  created_at: string;
}

interface ProfileStats {
  ordersCount: number;
  groupBuysCount: number;
  totalSpent: number;
  walletBalance: number;
}

function ProfileInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
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
      setProfile({ ...profile!, ...data });
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Personal Information</h2>
        {!isEditing && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <Input value={user?.email} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input {...register('full_name')} placeholder="Enter your full name" />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input {...register('phone')} placeholder="Enter your phone number" />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => {
                setIsEditing(false);
                reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="font-medium">{profile?.full_name || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{profile?.phone || 'Not set'}</p>
            </div>
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
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'processing': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'shipped': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'delivered': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-xl font-semibold">Order History</h2>
      
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">No orders yet</p>
          <Button asChild>
            <Link to="/products">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link 
              key={order.id} 
              to={`/profile/orders/${order.id}`}
              className="block p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={cn("font-normal", getStatusColor(order.status))}>
                  {order.status}
                </Badge>
                <p className="font-semibold text-primary">₦{order.total_amount.toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Profile Header Component
function ProfileHeader({ profile, stats }: { profile: ProfileData | null; stats: ProfileStats }) {
  const { user, signOut } = useAuth();
  
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently joined';

  return (
    <div className="relative">
      {/* Cover Photo */}
      <div className="h-32 md:h-48 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
      </div>
      
      {/* Profile Info Section */}
      <div className="px-4 md:px-6 pb-4">
        {/* Avatar */}
        <div className="relative -mt-12 md:-mt-16 mb-4">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
            <AvatarImage src="" />
            <AvatarFallback className="text-2xl md:text-3xl font-bold bg-primary text-primary-foreground">
              {getInitials(profile?.full_name || null, user?.email || '')}
            </AvatarFallback>
          </Avatar>
          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
            <Camera className="h-4 w-4" />
          </button>
        </div>
        
        {/* Name and Info */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            {profile?.full_name || 'Welcome'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {user?.email}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Member since {memberSince}
            </span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 p-4 rounded-xl bg-muted/30">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-primary">{stats.ordersCount}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Orders</p>
          </div>

          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-primary">₦{(stats.totalSpent / 1000).toFixed(0)}k</p>
            <p className="text-xs md:text-sm text-muted-foreground">Total Spent</p>
          </div>

          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-primary">₦{stats.walletBalance.toLocaleString()}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Wallet Balance</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Navigation Tab Item
interface NavTabProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavTab({ to, icon, label, isActive }: NavTabProps) {
  return (
    <Link 
      to={to}
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap",
        isActive 
          ? "bg-primary text-primary-foreground shadow-md" 
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

// Mobile Navigation
function MobileNav({ currentPath }: { currentPath: string }) {
  const { signOut } = useAuth();
  
  const navItems = [
    { to: '/profile', icon: <UserIcon className="h-5 w-5" />, label: 'Profile', exact: true },
    { to: '/profile/orders', icon: <Package className="h-5 w-5" />, label: 'Orders' },

    { to: '/profile/wallet', icon: <Wallet className="h-5 w-5" />, label: 'Wallet' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return currentPath === path;
    return currentPath.startsWith(path);
  };

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:hidden">
      <div className="flex gap-2 pb-2">
        {navItems.map((item) => (
          <NavTab
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.to, item.exact)}
          />
        ))}
      </div>
    </div>
  );
}

// Desktop Sidebar
function DesktopSidebar({ currentPath }: { currentPath: string }) {
  const { signOut } = useAuth();
  
  const navItems = [
    { to: '/profile', icon: <UserIcon className="h-5 w-5" />, label: 'Profile Info', exact: true },
    { to: '/profile/orders', icon: <Package className="h-5 w-5" />, label: 'My Orders' },
    { to: '/profile/addresses', icon: <MapPin className="h-5 w-5" />, label: 'Addresses' },

    { to: '/profile/wallet', icon: <Wallet className="h-5 w-5" />, label: 'Wallet' },
    { to: '/profile/security', icon: <Shield className="h-5 w-5" />, label: 'Security' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return currentPath === path;
    return currentPath.startsWith(path);
  };

  return (
    <Card className="hidden md:block p-4 h-fit sticky top-24">
      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavTab
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.to, item.exact)}
          />
        ))}
        <div className="pt-4 mt-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={async () => {
              await signOut();
              window.location.href = '/';
            }}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </nav>
    </Card>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ 
    ordersCount: 0, 
    groupBuysCount: 0, 
    totalSpent: 0,
    walletBalance: 0 
  });

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      loadProfileData();
      loadStats();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      setProfile(data);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    
    // Get orders count and total spent
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('user_id', user.id);
    
    // Get group buys count
    const { count: groupBuysCount } = await supabase
      .from('group_buy_commitments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get wallet balance
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('balance_promo')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const ordersCount = orders?.length || 0;
    const totalSpent = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
    const walletBalance = wallet?.balance_promo || 0;
    
    setStats({
      ordersCount,
      groupBuysCount: groupBuysCount || 0,
      totalSpent,
      walletBalance,
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pb-8">
        {/* Profile Header Card */}
        <Card className="overflow-hidden mb-6 mt-4 md:mt-8">
          <ProfileHeader profile={profile} stats={stats} />
        </Card>

        {/* Mobile Navigation */}
        <MobileNav currentPath={location.pathname} />

        {/* Desktop Layout with Sidebar */}
        <div className="grid md:grid-cols-4 gap-6 mt-4 md:mt-0">
          <DesktopSidebar currentPath={location.pathname} />
          
          <div className="md:col-span-3">
            <Card className="overflow-hidden">
              <Routes>
                <Route index element={<ProfileInfo />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:orderId" element={<OrderDetail />} />
                <Route path="addresses" element={<AddressesProfile />} />

                <Route path="security" element={<SecurityProfile />} />
                <Route path="wallet" element={<WalletProfile />} />
                <Route path="membership" element={<MembershipWalletProfile />} />
              </Routes>
            </Card>
          </div>
        </div>

        {/* Mobile Sign Out Button */}
        <div className="md:hidden mt-6">
          <Button 
            variant="outline"
            className="w-full justify-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
