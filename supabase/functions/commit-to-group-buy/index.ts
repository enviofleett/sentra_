import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommitmentRequest {
  campaignId: string;
  quantity: number;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  console.log('[Commit-to-Group-Buy] Function invoked at', new Date().toISOString());

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Commit-to-Group-Buy] No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Commit-to-Group-Buy] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Commit-to-Group-Buy] User authenticated: ${user.id}`);

    const requestBody = await req.json();
    const { campaignId, quantity }: CommitmentRequest = requestBody;

    console.log(`[Commit-to-Group-Buy] Request - Campaign: ${campaignId}, Quantity: ${quantity}`);

    // Input validation
    if (!campaignId || !UUID_REGEX.test(campaignId)) {
      console.error('[Commit-to-Group-Buy] Invalid campaignId');
      return new Response(JSON.stringify({ error: 'Invalid campaign ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!quantity || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      console.error('[Commit-to-Group-Buy] Invalid quantity:', quantity);
      return new Response(JSON.stringify({ error: 'Quantity must be a positive integer between 1 and 100' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch campaign with explicit FK hint to avoid ambiguity
    console.log('[Commit-to-Group-Buy] Fetching campaign details');

    const { data: campaign, error: campaignError } = await supabase
      .from('group_buy_campaigns')
      .select(`
        *,
        products!group_buy_campaigns_product_id_fkey (
          name,
          price
        )
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('[Commit-to-Group-Buy] Campaign query error:', campaignError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch campaign details',
        details: campaignError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!campaign) {
      console.error('[Commit-to-Group-Buy] Campaign not found');
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Commit-to-Group-Buy] Campaign found - Status: ${campaign.status}, Current: ${campaign.current_quantity}/${campaign.goal_quantity}`);

    // Validate campaign is active
    if (campaign.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Campaign is not active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate not expired
    if (new Date(campaign.expiry_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Campaign has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing commitment
    console.log('[Commit-to-Group-Buy] Checking for existing commitment');

    const { data: existingCommitment } = await supabase
      .from('group_buy_commitments')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .in('status', ['committed_unpaid', 'committed_paid'])
      .maybeSingle();

    if (existingCommitment) {
      console.log('[Commit-to-Group-Buy] User already has commitment');
      return new Response(JSON.stringify({ 
        error: 'You already have a commitment for this campaign. Please check your Group Buys page.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ATOMIC QUANTITY UPDATE using PostgreSQL row-level locking
    // This prevents overselling even under high concurrency
    console.log(`[Commit-to-Group-Buy] Attempting atomic quantity increment: +${quantity}`);

    interface AtomicResult {
      success: boolean;
      new_quantity: number;
      remaining_spots: number;
      error_message: string | null;
    }

    const { data: atomicResult, error: atomicError } = await supabase
      .rpc('atomic_increment_campaign_quantity', {
        p_campaign_id: campaignId,
        p_quantity: quantity
      })
      .single<AtomicResult>();

    if (atomicError) {
      console.error('[Commit-to-Group-Buy] Atomic increment error:', atomicError);
      return new Response(JSON.stringify({ 
        error: 'Failed to reserve spot. Please try again.',
        details: atomicError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!atomicResult?.success) {
      console.log(`[Commit-to-Group-Buy] Atomic increment failed: ${atomicResult?.error_message}`);
      return new Response(JSON.stringify({ 
        error: atomicResult?.error_message || 'Failed to reserve spot',
        remainingSpots: atomicResult?.remaining_spots || 0,
        retry: atomicResult?.error_message?.includes('spots remaining')
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expectedNewQuantity = atomicResult.new_quantity;
    const originalQuantity = expectedNewQuantity - quantity;
    console.log(`[Commit-to-Group-Buy] Atomic increment success - New quantity: ${expectedNewQuantity}`);

    // SERVER-SIDE PRICE: Use discount_price from database, never from request
    const commitmentPrice = Number(campaign.discount_price);

    // Create commitment
    const { data: commitment, error: commitmentError } = await supabase
      .from('group_buy_commitments')
      .insert({
        campaign_id: campaignId,
        user_id: user.id,
        quantity,
        committed_price: commitmentPrice, // Server-verified price
        status: 'committed_unpaid'
      })
      .select()
      .single();

    if (commitmentError) {
      console.error('[Commit-to-Group-Buy] Commitment creation failed, rolling back quantity');
      // Rollback campaign quantity using atomic decrement
      await supabase.rpc('atomic_decrement_campaign_quantity', {
        p_campaign_id: campaignId,
        p_quantity: quantity
      });
      
      return new Response(JSON.stringify({ error: 'Failed to create commitment. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Commit-to-Group-Buy] Commitment created: ${commitment.id}`);

    // Fetch user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Send confirmation email (non-blocking)
    supabase.functions.invoke('send-email', {
      body: {
        to: profile?.email || user.email,
        templateId: 'GROUPBUY_COMMITMENT_CONFIRMATION',
        data: {
          customer_name: profile?.full_name || 'Customer',
          product_name: campaign.products?.name || 'Product',
          quantity: quantity.toString(),
          discount_price: commitmentPrice.toString(),
          current_quantity: expectedNewQuantity.toString(),
          goal_quantity: campaign.goal_quantity.toString(),
          expiry_date: new Date(campaign.expiry_at).toLocaleString()
        }
      }
    }).catch(err => console.error('[Commit-to-Group-Buy] Email error (non-blocking):', err));

    // Handle pay_to_book mode - initialize Paystack payment
    if (campaign.payment_mode === 'pay_to_book') {
      console.log('[Commit-to-Group-Buy] Initializing payment for pay_to_book mode');
      
      const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
      if (!paystackSecretKey) {
        console.error('[Commit-to-Group-Buy] PAYSTACK_SECRET_KEY not configured');
        return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get callback URL from config or env
      const { data: configData } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'live_callback_url')
        .maybeSingle();
      
      const appBaseUrl = (configData?.value as any)?.url || Deno.env.get('APP_BASE_URL');

      if (!appBaseUrl) {
        console.error('[Commit-to-Group-Buy] APP_BASE_URL not configured');
        return new Response(JSON.stringify({ error: 'Application base URL not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // SERVER-SIDE AMOUNT CALCULATION - never trust client
      const amountInKobo = Math.round(commitmentPrice * quantity * 100);

      console.log(`[Commit-to-Group-Buy] Paystack amount: ${amountInKobo} kobo`);

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
            commitment_id: commitment.id,
            campaign_id: campaignId,
            user_id: user.id,
            type: 'group_buy_commitment'
          },
          callback_url: `${appBaseUrl}/checkout/success?commitment_id=${commitment.id}&type=group_buy`
        }),
      });

      const paystackData = await paystackResponse.json();

      if (!paystackData.status) {
        console.error('[Commit-to-Group-Buy] Paystack error:', paystackData);
        return new Response(JSON.stringify({ error: 'Payment initialization failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[Commit-to-Group-Buy] Payment URL generated successfully');

      return new Response(JSON.stringify({
        commitment,
        paymentUrl: paystackData.data.authorization_url,
        requiresImmediatePayment: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // pay_on_success mode - just return success
    console.log('[Commit-to-Group-Buy] Success (pay_on_success mode)');
    return new Response(JSON.stringify({
      commitment,
      message: 'Commitment created successfully. You will be notified when the goal is reached.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Commit-to-Group-Buy] Error:', error.message);
    console.error('[Commit-to-Group-Buy] Stack:', error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
