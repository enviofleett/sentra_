import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Instagram } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function CountdownTimer({ launchDate }: { launchDate: string }) {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(launchDate).getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [launchDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 min-w-[60px] md:min-w-[80px]">
        <span className="text-2xl md:text-3xl font-bold text-primary font-mono">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="flex gap-2 md:gap-4 justify-center">
      <TimeBlock value={timeLeft.days} label="Days" />
      <TimeBlock value={timeLeft.hours} label="Hours" />
      <TimeBlock value={timeLeft.minutes} label="Mins" />
      <TimeBlock value={timeLeft.seconds} label="Secs" />
    </div>
  );
}

export function LaunchOverlay({ children }: LaunchOverlayProps) {
  const location = useLocation();
  const [settings, setSettings] = useState<PreLaunchSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [facebookHandle, setFacebookHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    checkPrelaunchMode();
  }, []);

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !fullName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('waiting_list')
      .insert([{
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
    } else {
      setSubmitted(true);
      toast.success('Welcome to the Sentra Circle!');
    }

    setLoading(false);
  };

  // Still checking
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Bypass lockdown for admin and auth routes
  const isExcludedRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth');
  
  // Not in prelaunch mode, no settings, or excluded route - show normal app
  if (!settings?.is_prelaunch_mode || isExcludedRoute) {
    return <>{children}</>;
  }

  const rewardAmount = settings.waitlist_reward_amount || 100000;

  // Prelaunch mode - show waitlist
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Banner Image */}
      {settings.banner_image_url && (
        <div className="absolute inset-0 z-0">
          <img 
            src={settings.banner_image_url} 
            alt="Launch Banner" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        </div>
      )}

      {/* Elegant gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-6 md:mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4 md:mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium tracking-wide">Coming Soon</span>
            </motion.div>
            
            <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-2 md:mb-4">
              {settings.banner_title || 'Sentra'}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg px-4">
              {settings.banner_subtitle || "Nigeria's Premier Fragrance Boutique"}
            </p>

            {/* Countdown Timer */}
            {settings.launch_date && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="mt-6"
              >
                <p className="text-sm text-muted-foreground mb-3">Launching In</p>
                <CountdownTimer launchDate={settings.launch_date} />
              </motion.div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 md:p-8 shadow-2xl"
              >
                <div className="text-center mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                    Join the Sentra Circle
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Be first to access exclusive scents & receive ₦{rewardAmount.toLocaleString()} launch credit
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-3 md:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-foreground text-sm">Full Name *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      required
                      className="bg-background/50 border-border/50 focus:border-primary h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground text-sm">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="bg-background/50 border-border/50 focus:border-primary h-11"
                    />
                  </div>

                  {/* Social Handles Section */}
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-3">
                      Follow us on social media for bonus rewards
                    </p>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="instagram" className="text-foreground text-sm flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-500" />
                          Instagram
                        </Label>
                        <Input
                          id="instagram"
                          type="text"
                          value={instagramHandle}
                          onChange={(e) => setInstagramHandle(e.target.value)}
                          placeholder="@yourusername"
                          className="bg-background/50 border-border/50 focus:border-primary h-10"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="facebook" className="text-foreground text-sm flex items-center gap-2">
                            <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Facebook
                          </Label>
                          <Input
                            id="facebook"
                            type="text"
                            value={facebookHandle}
                            onChange={(e) => setFacebookHandle(e.target.value)}
                            placeholder="username"
                            className="bg-background/50 border-border/50 focus:border-primary h-10"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="tiktok" className="text-foreground text-sm flex items-center gap-2">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                            </svg>
                            TikTok
                          </Label>
                          <Input
                            id="tiktok"
                            type="text"
                            value={tiktokHandle}
                            onChange={(e) => setTiktokHandle(e.target.value)}
                            placeholder="@username"
                            className="bg-background/50 border-border/50 focus:border-primary h-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 mt-4"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Join the Waitlist'
                    )}
                  </Button>
                </form>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  By joining, you agree to receive exclusive updates from Sentra
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 md:p-8 shadow-2xl text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center"
                >
                  <Sparkles className="h-8 w-8 text-primary" />
                </motion.div>
                
                <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-2">
                  Welcome to the Circle
                </h2>
                <p className="text-muted-foreground mb-4">
                  You're on the list! We'll verify your social handles and credit your ₦{rewardAmount.toLocaleString()} launch bonus.
                </p>
                <p className="text-sm text-primary">
                  Follow @SentraScents on all platforms for updates
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
