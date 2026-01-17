import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useBranding } from '@/hooks/useBranding';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { logoUrl } = useBranding();
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  useEffect(() => {
    // Handle the recovery token from URL hash parameters
    const handleRecoveryToken = async () => {
      // Check for hash parameters (Supabase includes tokens in hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      // Also check query parameters as fallback
      const queryParams = new URLSearchParams(window.location.search);
      const tokenHash = queryParams.get('token_hash') || queryParams.get('token');
      const tokenType = queryParams.get('type');
      
      console.log('[ResetPassword] URL analysis:', {
        hasHashToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        type,
        hasQueryToken: !!tokenHash,
        tokenType
      });
      
      // If we have access_token in hash, set the session directly
      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('[ResetPassword] Failed to set session:', error);
            setIsValidSession(false);
          } else if (data.session) {
            console.log('[ResetPassword] Session established from hash tokens');
            setIsValidSession(true);
            // Clear the hash from URL for cleaner UX
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch (err) {
          console.error('[ResetPassword] Error setting session:', err);
          setIsValidSession(false);
        }
        return;
      }
      
      // If we have a token_hash in query params (direct Supabase link format)
      if (tokenHash && tokenType === 'recovery') {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
          
          if (error) {
            console.error('[ResetPassword] Failed to verify OTP:', error);
            setIsValidSession(false);
          } else if (data.session) {
            console.log('[ResetPassword] Session established from OTP verification');
            setIsValidSession(true);
          }
        } catch (err) {
          console.error('[ResetPassword] Error verifying OTP:', err);
          setIsValidSession(false);
        }
        return;
      }
      
      // Fallback: check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[ResetPassword] Existing session found');
        setIsValidSession(true);
      } else {
        console.log('[ResetPassword] No valid session or token found');
        setIsValidSession(false);
      }
    };

    // Listen for auth state changes (handles the recovery link redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[ResetPassword] Auth state change:', event);
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      } else if (event === 'SIGNED_IN' && session) {
        // Only set valid if we're on this page intentionally
        if (isValidSession === null) {
          setIsValidSession(true);
        }
      }
    });

    handleRecoveryToken();

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      setIsSuccess(true);
      toast({
        title: 'Password Updated',
        description: 'Your password has been reset successfully.'
      });

      // Redirect to appropriate page after a delay
      setTimeout(async () => {
        // Check if user is admin
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
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
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
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Invalid or Expired Link</h2>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
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
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Password Reset Successful</h2>
            <p className="text-muted-foreground">
              Your password has been updated. Redirecting you now...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardDescription className="text-center">Enter your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
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

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
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

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                <p className="font-medium mb-1">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>At least 8 characters</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Updating...' : 'Reset Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
