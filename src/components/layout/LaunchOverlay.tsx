import { useState, useEffect } from 'react';
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

export function LaunchOverlay({ children }: LaunchOverlayProps) {
  const [isPrelaunch, setIsPrelaunch] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [socialHandle, setSocialHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    checkPrelaunchMode();
  }, []);

  const checkPrelaunchMode = async () => {
    const { data, error } = await supabase
      .from('pre_launch_settings')
      .select('is_prelaunch_mode')
      .maybeSingle();

    if (error) {
      console.error('Error checking prelaunch mode:', error);
      setIsPrelaunch(false);
      return;
    }

    setIsPrelaunch(data?.is_prelaunch_mode ?? false);
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
        social_handle: socialHandle.trim() || null
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
  if (isPrelaunch === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not in prelaunch mode, show normal app
  if (!isPrelaunch) {
    return <>{children}</>;
  }

  // Prelaunch mode - show waitlist
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Elegant gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium tracking-wide">Coming Soon</span>
            </motion.div>
            
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
              Sentra
            </h1>
            <p className="text-muted-foreground text-lg">
              Nigeria's Premier Fragrance Boutique
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Join the Sentra Circle
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Be first to access exclusive scents & receive ₦100,000 launch credit
                  </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-foreground">Full Name *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      required
                      className="bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social" className="text-foreground flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-primary" />
                      Instagram Handle (for bonus)
                    </Label>
                    <Input
                      id="social"
                      type="text"
                      value={socialHandle}
                      onChange={(e) => setSocialHandle(e.target.value)}
                      placeholder="@yourusername"
                      className="bg-background/50 border-border/50 focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Follow us & get verified for your launch credit
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6"
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
                className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center"
                >
                  <Sparkles className="h-8 w-8 text-primary" />
                </motion.div>
                
                <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                  Welcome to the Circle
                </h2>
                <p className="text-muted-foreground mb-4">
                  You're on the list! We'll verify your social handle and credit your ₦100,000 launch bonus.
                </p>
                <p className="text-sm text-primary">
                  Follow @SentraScents on Instagram for updates
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
