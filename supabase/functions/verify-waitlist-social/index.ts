import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Verify Waitlist] Received request');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Verify Waitlist] No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create authenticated client to verify admin
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get the user from the token
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      console.error('[Verify Waitlist] User not found:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[Verify Waitlist] User authenticated:', user.id);
    
    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      console.error('[Verify Waitlist] User is not admin');
      return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[Verify Waitlist] Admin verified');
    
    const { entryId } = await req.json();
    if (!entryId) {
      return new Response(JSON.stringify({ error: 'Entry ID required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[Verify Waitlist] Processing entry:', entryId);

    // Get the waitlist entry
    const { data: entry, error: entryError } = await supabase
      .from('waiting_list')
      .select('*')
      .eq('id', entryId)
      .maybeSingle();

    if (entryError || !entry) {
      console.error('[Verify Waitlist] Entry not found:', entryError);
      return new Response(JSON.stringify({ error: 'Waitlist entry not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (entry.is_social_verified) {
      console.log('[Verify Waitlist] Entry already verified');
      return new Response(JSON.stringify({ error: 'Already verified' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get the reward amount from settings
    const { data: settings } = await supabase
      .from('pre_launch_settings')
      .select('waitlist_reward_amount')
      .maybeSingle();

    const rewardAmount = settings?.waitlist_reward_amount || 100000;
    console.log('[Verify Waitlist] Reward amount:', rewardAmount);

    // Call the atomic verify function
    const { data: success, error: rpcError } = await supabase.rpc('verify_and_reward_user', {
      entry_id: entryId,
      admin_id: user.id
    });

    if (rpcError) {
      console.error('[Verify Waitlist] RPC error:', rpcError);
      return new Response(JSON.stringify({ error: 'Failed to verify entry' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[Verify Waitlist] Successfully verified entry:', entryId);

    return new Response(JSON.stringify({ 
      success: true, 
      rewardAmount,
      message: `Entry verified and ₦${rewardAmount.toLocaleString()} reward credited` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Verify Waitlist] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
