import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateTokenRequest {
  token: string;
}

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'validate';

    if (action === 'validate') {
      // Validate token and return user info
      const { token }: ValidateTokenRequest = await req.json();

      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[ResetPasswordToken] Validating token...');

      const { data, error } = await supabase.rpc('validate_password_reset_token', {
        p_token: token
      });

      if (error) {
        console.error('[ResetPasswordToken] Validation error:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to validate token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = data?.[0];
      
      if (!result?.is_valid) {
        console.log('[ResetPasswordToken] Token invalid:', result?.error_message);
        return new Response(
          JSON.stringify({ 
            success: false, 
            isValid: false,
            error: result?.error_message || 'Invalid token' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[ResetPasswordToken] Token valid for user:', result.email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          isValid: true,
          email: result.email 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'reset') {
      // Reset password using the token
      const { token, newPassword }: ResetPasswordRequest = await req.json();

      if (!token || !newPassword) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token and new password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!/[A-Z]/.test(newPassword)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must contain at least one uppercase letter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!/[a-z]/.test(newPassword)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must contain at least one lowercase letter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!/[0-9]/.test(newPassword)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must contain at least one number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('[ResetPasswordToken] Validating token for reset...');

      // First validate the token
      const { data: validationData, error: validationError } = await supabase.rpc('validate_password_reset_token', {
        p_token: token
      });

      if (validationError) {
        console.error('[ResetPasswordToken] Validation error:', validationError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to validate token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validation = validationData?.[0];
      
      if (!validation?.is_valid) {
        console.log('[ResetPasswordToken] Token invalid for reset:', validation?.error_message);
        return new Response(
          JSON.stringify({ success: false, error: validation?.error_message || 'Invalid token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userId = validation.user_id;
      console.log('[ResetPasswordToken] Updating password for user:', userId);

      // Update the user's password using admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (updateError) {
        console.error('[ResetPasswordToken] Password update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark token as used
      await supabase.rpc('consume_password_reset_token', { p_token: token });

      // Log to audit table
      try {
        await supabase.from('password_change_audit').insert({
          user_id: userId,
          change_type: 'recovery_link',
          change_source: 'custom_token_reset',
          success: true,
        });
      } catch (auditError) {
        console.error('[ResetPasswordToken] Failed to log audit:', auditError);
      }

      console.log('[ResetPasswordToken] ✅ Password updated successfully');
      return new Response(
        JSON.stringify({ success: true, message: 'Password updated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('[ResetPasswordToken] ❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
