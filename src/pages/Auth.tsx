import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { sendEmail } from '@/utils/emailService';
import { supabase } from '@/integrations/supabase/client';
import { useBranding } from '@/hooks/useBranding';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Gift } from 'lucide-react';

// Validation schemas
const signInSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

// --------------------------------------------------------
// Reusable Auth Form Component
// --------------------------------------------------------

interface AuthFormContentProps {
  onSuccess?: () => void;
  initialTab?: 'signin' | 'signup';
  navigate?: ReturnType<typeof useNavigate>;
  referralCode?: string;
}

export const AuthFormContent: React.FC<AuthFormContentProps> = ({ 
  onSuccess, 
  initialTab = 'signin',
  navigate: externalNavigate,
  referralCode
}) => {
  const defaultNavigate = useNavigate();
  const navigate = externalNavigate || defaultNavigate;
  const { signIn, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(referralCode ? 'signup' : initialTab);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' }
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '' }
  });

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive'
      });
      return;
    }

    setSendingResetEmail(true);
    try {
      // Use custom edge function for better-looking emails that avoid spam filters
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          emails: [forgotPasswordEmail.trim()]
        }
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      if (data && !data.success) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send password reset email',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'Email Sent',
        description: 'Check your inbox for the password reset link.'
      });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSendingResetEmail(false);
    }
  };

  const handleSignIn = async (data: SignInFormData) => {
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email before signing in.';
        }
        
        toast({ 
          title: 'Sign In Failed', 
          description: errorMessage, 
          variant: 'destructive' 
        });
        return;
      }

      toast({ title: 'Success', description: 'Signed in successfully!' });

      // Check if user is admin (only if not from modal)
      if (!onSuccess) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          if (roles) {
            navigate('/admin');
            return;
          }
        }
        navigate('/');
      } else {
        onSuccess();
      }

      signInForm.reset();
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: 'An unexpected error occurred. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    try {
      const { error } = await signUp(data.email, data.password, data.fullName, referralCode);
      
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        }
        
        toast({ 
          title: 'Sign Up Failed', 
          description: errorMessage, 
          variant: 'destructive' 
        });
        return;
      }

      // Send welcome email
      await sendEmail(data.email, 'WELCOME_CUSTOMER', { customer_name: data.fullName });

      // Check if user was logged in immediately (email confirmation disabled)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        toast({ 
          title: 'Success', 
          description: 'Account created successfully!' 
        });
        signUpForm.reset();
        onSuccess ? onSuccess() : navigate('/');
      } else {
        toast({ 
          title: 'Success', 
          description: 'Account created! Please check your email to verify your account.' 
        });
        signUpForm.reset();
        setActiveTab('signin');
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: 'An unexpected error occurred. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')}>
      {referralCode && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">You were referred! Sign up to get started.</span>
        </div>
      )}
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>
      
      <TabsContent value="signin" className="mt-4">
        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="font-semibold">Reset Password</h3>
              <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
            </div>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={sendingResetEmail}>
              {sendingResetEmail ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowForgotPassword(false)}
            >
              Back to Sign In
            </Button>
          </form>
        ) : (
          <Form {...signInForm}>
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <FormField
                control={signInForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        autoComplete="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={signInForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        autoComplete="current-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={signInForm.formState.isSubmitting}
              >
                {signInForm.formState.isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full text-sm"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot your password?
              </Button>
            </form>
          </Form>
        )}
      </TabsContent>

      <TabsContent value="signup" className="mt-4">
        <Form {...signUpForm}>
          <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
            <FormField
              control={signUpForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Doe" 
                      autoComplete="name"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={signUpForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="you@example.com" 
                      autoComplete="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={signUpForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      autoComplete="new-password"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={signUpForm.formState.isSubmitting}
            >
              {signUpForm.formState.isSubmitting ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>
        </Form>
      </TabsContent>
    </Tabs>
  );
};

// --------------------------------------------------------
// Original Auth page for the /auth route
// --------------------------------------------------------

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { logoUrl } = useBranding();
  
  // Capture referral code from URL (?ref=CODE)
  const referralCode = searchParams.get('ref') || searchParams.get('referral') || undefined;

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          {logoUrl ? (
            <div className="flex justify-center mb-2">
              <img src={logoUrl} alt="Logo" className="h-12 max-w-[200px] object-contain" />
            </div>
          ) : (
            <CardTitle className="text-2xl text-center gradient-gold bg-clip-text text-transparent">Sentra</CardTitle>
          )}
          <CardDescription className="text-center">Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthFormContent navigate={navigate} referralCode={referralCode} />
        </CardContent>
      </Card>
    </div>
  );
}
