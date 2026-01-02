import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Process referral after signup (deferred to avoid deadlock)
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(() => {
          processReferralFromMetadata(session.user);
        }, 0);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Process referral after user signs up
  const processReferralFromMetadata = async (user: User) => {
    try {
      const referralCode = user.user_metadata?.referral_code;
      if (!referralCode) return;
      
      console.log('[Auth] Processing referral code:', referralCode);
      
      // Find the affiliate link by code
      const { data: affiliateLink, error: linkError } = await supabase
        .from('affiliate_links')
        .select('id, user_id')
        .eq('code', referralCode.toUpperCase())
        .eq('is_active', true)
        .single();
      
      if (linkError || !affiliateLink) {
        console.log('[Auth] Affiliate link not found for code:', referralCode);
        return;
      }
      
      // Don't allow self-referral
      if (affiliateLink.user_id === user.id) {
        console.log('[Auth] Self-referral attempt blocked');
        return;
      }
      
      // Check if referral already exists
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', user.id)
        .maybeSingle();
      
      if (existingReferral) {
        console.log('[Auth] Referral already exists for user');
        return;
      }
      
      // Update the user's profile with referred_by
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          referred_by: affiliateLink.user_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (profileError) {
        console.error('[Auth] Failed to update profile with referrer:', profileError);
        return;
      }
      
      // Create referral record
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: affiliateLink.user_id,
          referred_id: user.id,
          affiliate_link_id: affiliateLink.id,
          status: 'pending'
        });
      
      if (referralError) {
        console.error('[Auth] Failed to create referral record:', referralError);
        return;
      }
      
      // Increment affiliate link signups
      const { data: currentLink } = await supabase
        .from('affiliate_links')
        .select('signups')
        .eq('id', affiliateLink.id)
        .single();
      
      if (currentLink) {
        await supabase
          .from('affiliate_links')
          .update({ 
            signups: (currentLink.signups || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', affiliateLink.id);
      }
      
      console.log('[Auth] Referral successfully processed');
    } catch (error) {
      console.error('[Auth] Error processing referral:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, referralCode?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          referral_code: referralCode || undefined
        },
        // Require email confirmation before allowing sign in
        // Note: This requires email confirmation to be enabled in Supabase Auth settings
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};