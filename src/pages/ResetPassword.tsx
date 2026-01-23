import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { KeyRound, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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

type TokenType = 'custom' | 'supabase' | null;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logoUrl } = useBranding();
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenType, setTokenType] = useState<TokenType>(null);
  const [customToken, setCustomToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  useEffect(() => {
    const validateToken = async () => {
      // Check for custom token in query params first (our new secure flow)
      const token = searchParams.get('token');
      
      if (token) {
        console.log('[ResetPassword] Custom token found, validating...');
        
        try {
          const { data, error } = await supabase.functions.invoke('reset-password-with-token', {
            body: { token }
          });

          if (error) {
            console.error('[ResetPassword] Token validation error:', error);
            setErrorMessage('Unable to validate reset link. Please try again.');
            setIsValidSession(false);
            return;
          }

          if (data?.isValid) {
            console.log('[ResetPassword] Custom token is valid');
            setTokenType('custom');
            setCustomToken(token);
            setUserEmail(data.email);
            setIsValidSession(true);
            return;
          } else {
            console.log('[ResetPassword] Custom token is invalid:', data?.error);
            setErrorMessage(data?.error || 'This reset link is invalid or has expired.');
            setIsValidSession(false);
            return;
          }
        } catch (err) {
          console.error('[ResetPassword] Error validating token:', err);
          setErrorMessage('Unable to validate reset link. Please try again.');
          setIsValidSession(false);
          return;
        }
      }

      // Fallback: Check for Supabase hash tokens (legacy support)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        console.log('[ResetPassword] Supabase hash tokens found');
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('[ResetPassword] Failed to set session:', error);
            setErrorMessage('This reset link is invalid or has expired.');
            setIsValidSession(false);
          } else if (data.session) {
            console.log('[ResetPassword] Session established from hash tokens');
            setTokenType('supabase');
            setIsValidSession(true);
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch (err) {
          console.error('[ResetPassword] Error setting session:', err);
          setErrorMessage('This reset link is invalid or has expired.');
          setIsValidSession(false);
        }
        return;
      }
      
      // Fallback: Check for token_hash in query params (Supabase direct link format)
      const tokenHash = searchParams.get('token_hash');
      const tokenQueryType = searchParams.get('type');
      
      if (tokenHash && tokenQueryType === 'recovery') {
        console.log('[ResetPassword] Supabase token_hash found');
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
          });
          
          if (error) {
            console.error('[ResetPassword] Failed to verify OTP:', error);
            setErrorMessage('This reset link is invalid or has expired.');
            setIsValidSession(false);
          } else if (data.session) {
            console.log('[ResetPassword] Session established from OTP verification');
            setTokenType('supabase');
            setIsValidSession(true);
          }
        } catch (err) {
          console.error('[ResetPassword] Error verifying OTP:', err);
          setErrorMessage('This reset link is invalid or has expired.');
          setIsValidSession(false);
        }
        return;
      }
      
      // Fallback: Check existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[ResetPassword] Existing session found');
        setTokenType('supabase');
        setIsValidSession(true);
      } else {
        console.log('[ResetPassword] No valid token or session found');
        setErrorMessage('No reset link detected. Please request a new password reset.');
        setIsValidSession(false);
      }
    };

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[ResetPassword] Auth state change:', event);
      if (event === 'PASSWORD_RECOVERY') {
        setTokenType('supabase');
        setIsValidSession(true);
      }
    });

    validateToken();

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    try {
      if (tokenType === 'custom' && customToken) {
        // Use custom token reset flow (our secure edge function)
        console.log('[ResetPassword] Using custom token reset flow');
        
        const { data: resetData, error: resetError } = await supabase.functions.invoke(
          'reset-password-with-token?action=reset',
          {
            body: { 
              token: customToken, 
              newPassword: data.password 
            }
          }
        );

        if (resetError || !resetData?.success) {
          toast({
            title: 'Error',
            description: resetData?.error || resetError?.message || 'Failed to reset password',
            variant: 'destructive'
          });
          return;
        }

        setIsSuccess(true);
        toast({
          title: 'Password Updated',
          description: 'Your password has been reset successfully.'
        });

        // Redirect after success
        setTimeout(() => navigate('/auth'), 2000);

      } else if (tokenType === 'supabase') {
        // Use Supabase session-based reset flow (legacy)
        console.log('[ResetPassword] Using Supabase session reset flow');
        
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          toast({
            title: 'Error',
            description: 'Session expired. Please request a new password reset link.',
            variant: 'destructive'
          });
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password: data.password
        });

        // Log audit (non-blocking)
        try {
          await supabase
            .from('password_change_audit' as any)
            .insert({
              user_id: user.id,
              change_type: 'recovery_link',
              change_source: 'reset_password_page',
              success: !error,
              error_message: error?.message || null,
              user_agent: navigator.userAgent,
            });
        } catch (auditErr) {
          console.error('Failed to log password change:', auditErr);
        }

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

        // Redirect based on user role
        setTimeout(async () => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();

          if (roles) {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid/expired token state
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
              {errorMessage || 'This password reset link is invalid or has expired. Please request a new one.'}
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
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

  // Password reset form
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
          <CardDescription className="text-center">
            {userEmail ? (
              <>Reset password for <span className="font-medium">{userEmail}</span></>
            ) : (
              'Enter your new password'
            )}
          </CardDescription>
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
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
