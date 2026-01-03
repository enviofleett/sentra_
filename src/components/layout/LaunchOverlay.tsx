import { useState, useEffect } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Gift, Clock, Instagram, Star, Percent, Truck, Shield, Sparkles, Heart, Eye, X, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '@/hooks/useBranding';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LaunchOverlayProps {
  children: React.ReactNode;
}
interface PreLaunchSettings {
  is_prelaunch_mode: boolean;
  launch_date: string | null;
  banner_image_url: string | null;
  banner_title: string | null;
  banner_subtitle: string | null;
  waitlist_reward_amount: number;
  headline_text: string | null;
  headline_accent: string | null;
  description_text: string | null;
  badge_1_text: string | null;
  badge_1_icon: string | null;
  badge_2_text: string | null;
  badge_2_icon: string | null;
}
interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}
const iconMap: Record<string, React.ComponentType<{
  className?: string;
}>> = {
  gift: Gift,
  clock: Clock,
  star: Star,
  percent: Percent,
  truck: Truck,
  shield: Shield,
  sparkles: Sparkles,
  heart: Heart
};
function BadgeIcon({
  icon,
  className
}: {
  icon: string;
  className?: string;
}) {
  const IconComponent = iconMap[icon] || Gift;
  return <IconComponent className={className} />;
}
function CountdownTimer({
  launchDate
}: {
  launchDate: string;
}) {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(launchDate).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor(difference / (1000 * 60 * 60) % 24),
          minutes: Math.floor(difference / 1000 / 60 % 60),
          seconds: Math.floor(difference / 1000 % 60)
        });
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [launchDate]);
  const TimeBlock = ({
    value,
    label
  }: {
    value: number;
    label: string;
  }) => <div className="flex flex-col items-center">
      <div className="bg-white border border-border rounded-lg px-4 py-3 min-w-[70px] md:min-w-[80px] shadow-sm">
        <span className="text-2xl md:text-3xl font-bold text-foreground font-mono">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-muted-foreground mt-2 uppercase tracking-wider font-medium">{label}</span>
    </div>;
  return <div className="flex gap-3 md:gap-4 justify-center lg:justify-start">
      <TimeBlock value={timeLeft.days} label="Days" />
      <TimeBlock value={timeLeft.hours} label="Hours" />
      <TimeBlock value={timeLeft.minutes} label="Mins" />
      <TimeBlock value={timeLeft.seconds} label="Secs" />
    </div>;
}
function WaitlistFormModal({
  isOpen,
  onClose,
  rewardAmount,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  rewardAmount: number;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [facebookHandle, setFacebookHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    const {
      error
    } = await supabase.from('waiting_list').insert([{
      email: email.toLowerCase().trim(),
      full_name: fullName.trim(),
      social_handle: instagramHandle.trim() || null,
      facebook_handle: facebookHandle.trim() || null,
      tiktok_handle: tiktokHandle.trim() || null
    }]);
    if (error) {
      if (error.code === '23505') {
        toast.error('This email is already registered!');
      } else {
        console.error('Signup error:', error);
        toast.error('Something went wrong. Please try again.');
      }
      setLoading(false);
      return;
    }

    // Send welcome email
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: email.toLowerCase().trim(),
          templateId: 'WAITLIST_WELCOME',
          data: {
            name: fullName.trim(),
            reward_amount: rewardAmount.toLocaleString()
          }
        }
      });
      console.log('Welcome email sent to:', email);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the signup if email fails
    }
    toast.success('Welcome to the Sentra Circle!');
    onSuccess();
    setLoading(false);
  };
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Join the Waiting List
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-sm text-muted-foreground text-center mb-4">
          Be first to access exclusive scents & receive ₦{rewardAmount.toLocaleString()} launch credit
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm">Full Name *</Label>
            <Input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required className="h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm">Email Address *</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="h-11" />
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3 font-extrabold">
              Follow us on social media for bonus rewards @sentra_africa.
Also add your social handles to unlock the N100,000 Giftcard.          
 
            </p>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="modal-instagram" className="text-sm flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  Instagram
                </Label>
                <Input id="modal-instagram" type="text" value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} placeholder="@yourusername" className="h-10" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="modal-facebook" className="text-sm flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </Label>
                  <Input id="modal-facebook" type="text" value={facebookHandle} onChange={e => setFacebookHandle(e.target.value)} placeholder="username" className="h-10" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="modal-tiktok" className="text-sm flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                    </svg>
                    TikTok
                  </Label>
                  <Input id="modal-tiktok" type="text" value={tiktokHandle} onChange={e => setTiktokHandle(e.target.value)} placeholder="@username" className="h-10" />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-foreground hover:bg-foreground/90 text-background font-medium py-6">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Join the Waitlist'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          By joining, you agree to receive exclusive updates from Sentra
        </p>
      </DialogContent>
    </Dialog>;
}
function renderHeadlineWithAccent(headline: string, accent: string) {
  if (!accent || !headline.includes(accent)) {
    return <span>{headline}</span>;
  }
  const parts = headline.split(accent);
  return <>
      {parts[0]}
      <span className="text-primary">{accent}</span>
      {parts[1]}
    </>;
}
// Admin Preview Bar Component
function AdminPreviewBar({ onExit }: { onExit: () => void }) {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-2 px-4 flex items-center justify-between shadow-lg"
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">Admin Preview Mode</span>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/admin/settings">
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 h-8">
            <Settings className="h-4 w-4 mr-1" />
            Admin
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onExit}
          className="text-primary-foreground hover:bg-primary-foreground/20 h-8"
        >
          <X className="h-4 w-4 mr-1" />
          Exit Preview
        </Button>
      </div>
    </motion.div>
  );
}

export function LaunchOverlay({
  children
}: LaunchOverlayProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { logoUrl } = useBranding();
  const [settings, setSettings] = useState<PreLaunchSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [adminCheckDone, setAdminCheckDone] = useState(false);

  // CRITICAL: Bypass lockdown for admin and auth routes IMMEDIATELY at the top
  // This must be checked BEFORE any hooks or async operations
  const isExcludedRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth');
  
  // Check for admin status and preview mode together
  useEffect(() => {
    // Skip admin check for excluded routes
    if (isExcludedRoute) {
      setAdminCheckDone(true);
      return;
    }

    const checkAdminAndPreview = async () => {
      const previewParam = searchParams.get('preview');
      const storedPreview = localStorage.getItem('admin_preview_mode');
      const wantsPreview = previewParam === 'admin' || storedPreview === 'true';

      if (!user) {
        setIsAdmin(false);
        setIsPreviewMode(false);
        setAdminCheckDone(true);
        return;
      }

      // Check admin role
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const userIsAdmin = !!data;
      setIsAdmin(userIsAdmin);

      // Only allow preview mode if user is actually an admin
      if (userIsAdmin && wantsPreview) {
        localStorage.setItem('admin_preview_mode', 'true');
        setIsPreviewMode(true);
      } else if (!userIsAdmin) {
        // Clear preview mode if not admin
        localStorage.removeItem('admin_preview_mode');
        setIsPreviewMode(false);
      }
      
      setAdminCheckDone(true);
    };

    checkAdminAndPreview();
  }, [user, searchParams, isExcludedRoute]);

  useEffect(() => {
    // Skip prelaunch check for excluded routes
    if (isExcludedRoute) {
      setIsLoading(false);
      return;
    }
    checkPrelaunchMode();
  }, [isExcludedRoute]);

  const checkPrelaunchMode = async () => {
    const { data, error } = await supabase
      .from('pre_launch_settings')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error checking prelaunch mode:', error);
      setSettings(null);
      setIsLoading(false);
      return;
    }
    setSettings(data);
    setIsLoading(false);
  };

  const exitPreviewMode = () => {
    localStorage.removeItem('admin_preview_mode');
    setIsPreviewMode(false);
  };

  // Bypass lockdown for admin and auth routes - render children immediately
  if (isExcludedRoute) {
    return <>{children}</>;
  }

  // Still checking settings or admin status for non-excluded routes
  if (isLoading || !adminCheckDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin in preview mode - show store with preview bar
  if (settings?.is_prelaunch_mode && isAdmin && isPreviewMode) {
    return (
      <>
        <AdminPreviewBar onExit={exitPreviewMode} />
        <div className="pt-10">{children}</div>
      </>
    );
  }

  // Not in prelaunch mode or no settings - show normal app
  if (!settings?.is_prelaunch_mode) {
    return <>{children}</>;
  }
  const rewardAmount = settings.waitlist_reward_amount || 100000;
  const bannerImage = settings.banner_image_url || '/placeholder.svg';
  const headline = settings.headline_text || 'Exclusive fragrances at BETTER PRICES always.';
  const headlineAccent = settings.headline_accent || 'at BETTER PRICES';
  const description = settings.description_text || 'Join our exclusive waiting list to get early access to premium fragrances at unbeatable prices. Plus, earn rewards just for signing up!';
  const badge1Text = settings.badge_1_text || `₦${rewardAmount.toLocaleString()} Credits`;
  const badge1Icon = settings.badge_1_icon || 'gift';
  const badge2Text = settings.badge_2_text || '24hr Early Access';
  const badge2Icon = settings.badge_2_icon || 'clock';
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-6 md:py-8">
        <div className="container mx-auto px-4 text-center">
          {logoUrl ? <img src={logoUrl} alt="Sentra" className="h-8 md:h-10 mx-auto mb-3" /> : <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-3">
              {settings.banner_title || 'SENTRA'}
            </h1>}
          <span className="inline-block bg-muted text-muted-foreground text-xs md:text-sm px-4 py-1.5 rounded-full font-medium tracking-wide">
            Coming Soon
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
          
          {/* Product Image - First on mobile */}
          <motion.div initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.6
        }} className="relative flex justify-center order-1 lg:order-1 w-full">
            <div className="relative w-full max-w-md lg:max-w-none">
              {/* Decorative circle behind image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full blur-3xl scale-110" />
              
              <motion.img src={bannerImage} alt="Featured Fragrance" className="relative w-full h-auto object-contain drop-shadow-2xl mx-auto lg:w-96" animate={{
              y: [0, -10, 0]
            }} transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }} />
            </div>
          </motion.div>

          {/* Content Column - Second on mobile */}
          <motion.div initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.6,
          delay: 0.2
        }} className="text-center lg:text-left order-2 lg:order-2">
            {/* Headline */}
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
              {renderHeadlineWithAccent(headline, headlineAccent)}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-lg mx-auto lg:mx-0">
              {description}
            </p>

            {/* Countdown Timer */}
            {settings.launch_date && <motion.div initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: 0.4,
            duration: 0.5
          }} className="mb-8">
                <p className="text-sm text-muted-foreground mb-3 font-medium uppercase tracking-wider">
                  Launching In
                </p>
                <CountdownTimer launchDate={settings.launch_date} />
              </motion.div>}

            {/* Feature Badges */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-8">
              {badge1Text && <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                  <BadgeIcon icon={badge1Icon} className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{badge1Text}</span>
                </div>}
              {badge2Text && <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                  <BadgeIcon icon={badge2Icon} className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{badge2Text}</span>
                </div>}
            </div>

            {/* CTA Button */}
            <AnimatePresence mode="wait">
              {!submitted ? <motion.div key="cta" initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }}>
                  <Button onClick={() => setIsModalOpen(true)} size="lg" className="bg-foreground hover:bg-foreground/90 text-background font-semibold px-8 py-6 text-base w-full sm:w-auto">
                    Join the Waiting List
                  </Button>
                </motion.div> : <motion.div key="success" initial={{
              opacity: 0,
              scale: 0.95
            }} animate={{
              opacity: 1,
              scale: 1
            }} className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center lg:text-left">
                  <div className="flex items-center gap-3 justify-center lg:justify-start mb-2">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Gift className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Welcome to the Circle!</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    You're on the list! We'll verify your social handles and credit your ₦{rewardAmount.toLocaleString()} launch bonus.
                  </p>
                </motion.div>}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sentra. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Waitlist Modal */}
      <WaitlistFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} rewardAmount={rewardAmount} onSuccess={() => {
      setIsModalOpen(false);
      setSubmitted(true);
    }} />
    </div>;
}