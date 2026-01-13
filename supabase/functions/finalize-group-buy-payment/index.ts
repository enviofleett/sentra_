import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  commitmentId: string;
}

serve(async (req) => {
  console.log('[Finalize-Group-Buy-Payment] Function invoked at', new Date().toISOString());

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user - with null safety
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[Finalize-Group-Buy-Payment] No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Finalize-Group-Buy-Payment] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Finalize-Group-Buy-Payment] User: ${user.id}`);

    const { commitmentId }: PaymentRequest = await req.json();

    console.log(`[Finalize-Group-Buy-Payment] Processing commitment: ${commitmentId}`);

    // Fetch commitment with explicit FK hint
    const { data: commitment, error: commitmentError } = await supabase
      .from('group_buy_commitments')
      .select('*, group_buy_campaigns!inner(*, products!group_buy_campaigns_product_id_fkey(name, price))')
      .eq('id', commitmentId)
      .eq('user_id', user.id)
      .single();

    if (commitmentError || !commitment) {
      console.error('[Finalize-Group-Buy-Payment] Commitment not found:', commitmentError);
      return new Response(JSON.stringify({ error: 'Commitment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Finalize-Group-Buy-Payment] Commitment status: ${commitment.status}`);

    // Validate commitment is payable
    if (commitment.status !== 'committed_unpaid') {
      console.log(`[Finalize-Group-Buy-Payment] Commitment not payable - status: ${commitment.status}`);
      return new Response(JSON.stringify({ error: 'Commitment already processed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check payment deadline
    if (commitment.payment_deadline && new Date(commitment.payment_deadline) < new Date()) {
      console.error('[Finalize-Group-Buy-Payment] Payment deadline passed');
      return new Response(JSON.stringify({ error: 'Payment deadline has passed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, default_billing_address, default_shipping_address')
      .eq('id', user.id)
      .single();

    // SERVER-SIDE AMOUNT CALCULATION - use committed_price from DB, never from request
    const totalAmount = Number(commitment.committed_price) * commitment.quantity;
    const amountInKobo = Math.round(totalAmount * 100);

    console.log(`[Finalize-Group-Buy-Payment] Amount: ${totalAmount} (${amountInKobo} kobo)`);

    // Get APP_BASE_URL from config or env
    const { data: configData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'live_callback_url')
      .maybeSingle();
    
    const appBaseUrl = (configData?.value as any)?.url || Deno.env.get('APP_BASE_URL');

    if (!appBaseUrl) {
      console.error('[Finalize-Group-Buy-Payment] APP_BASE_URL not configured');
      return new Response(JSON.stringify({ error: 'Application base URL not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('[Finalize-Group-Buy-Payment] PAYSTACK_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Paystack payment
    console.log('[Finalize-Group-Buy-Payment] Initializing Paystack transaction');

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: profile?.email || user.email,
        amount: amountInKobo,
        metadata: {
          commitment_id: commitmentId,
          campaign_id: commitment.campaign_id,
          user_id: user.id,
          type: 'group_buy_final_payment'
        },
        callback_url: `${appBaseUrl}/checkout/success?commitment_id=${commitmentId}&type=group_buy`
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('[Finalize-Group-Buy-Payment] Paystack error:', paystackData);
      return new Response(JSON.stringify({ error: 'Payment initialization failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Finalize-Group-Buy-Payment] Payment URL generated successfully');

    return new Response(JSON.stringify({
      paymentUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Finalize-Group-Buy-Payment] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
