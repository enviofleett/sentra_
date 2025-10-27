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

serve(async (req) => {
  console.log('🚀 commit-to-group-buy function invoked');
  console.log('📥 Request method:', req.method);
  console.log('📥 Request headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Authenticating user...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    console.log('🔑 Auth header present:', !!authHeader);

    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ User authenticated:', user.id);

    const requestBody = await req.json();
    console.log('📦 Request body:', requestBody);
    
    const { campaignId, quantity }: CommitmentRequest = requestBody;

    // Fetch campaign details with better error handling
    console.log('🔍 Fetching campaign:', campaignId);

    const { data: campaign, error: campaignError } = await supabase
      .from('group_buy_campaigns')
      .select(`
        *,
        products (
          name,
          price
        )
      `)
      .eq('id', campaignId)
      .single();

    console.log('📊 Campaign query result:', { campaign, error: campaignError });

    if (campaignError) {
      console.error('❌ Campaign query error:', campaignError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch campaign details',
        details: campaignError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!campaign) {
      console.error('❌ Campaign not found');
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate campaign is active and not expired
    if (campaign.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Campaign is not active' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(campaign.expiry_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Campaign has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already has a commitment
    console.log('🔍 Checking for existing commitment...');

    const { data: existingCommitment, error: commitmentCheckError } = await supabase
      .from('group_buy_commitments')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .in('status', ['committed_unpaid', 'committed_paid'])
      .maybeSingle();

    console.log('📋 Existing commitment check:', { existingCommitment, error: commitmentCheckError });

    if (existingCommitment) {
      console.log('⚠️ User already has a commitment');
      return new Response(JSON.stringify({ 
        error: 'You already have a commitment for this campaign. Please check your Group Buys page.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if quantity doesn't exceed remaining spots
    const remainingSpots = campaign.goal_quantity - campaign.current_quantity;
    if (quantity > remainingSpots) {
      return new Response(JSON.stringify({ 
        error: `Only ${remainingSpots} spots remaining`,
        remainingSpots 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create commitment
    const { data: commitment, error: commitmentError } = await supabase
      .from('group_buy_commitments')
      .insert({
        campaign_id: campaignId,
        user_id: user.id,
        quantity,
        committed_price: campaign.discount_price,
        status: 'committed_unpaid'
      })
      .select()
      .single();

    if (commitmentError) {
      console.error('Error creating commitment:', commitmentError);
      return new Response(JSON.stringify({ error: 'Failed to create commitment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update campaign current_quantity
    await supabase
      .from('group_buy_campaigns')
      .update({ current_quantity: campaign.current_quantity + quantity })
      .eq('id', campaignId);

    // Fetch user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Send confirmation email
    await supabase.functions.invoke('send-email', {
      body: {
        to: profile?.email || user.email,
        templateId: 'GROUPBUY_COMMITMENT_CONFIRMATION',
        data: {
          customer_name: profile?.full_name || 'Customer',
          product_name: campaign.products.name,
          quantity: quantity.toString(),
          discount_price: campaign.discount_price.toString(),
          current_quantity: (campaign.current_quantity + quantity).toString(),
          goal_quantity: campaign.goal_quantity.toString(),
          expiry_date: new Date(campaign.expiry_at).toLocaleString()
        }
      }
    });

    // Handle pay_to_book mode
    if (campaign.payment_mode === 'pay_to_book') {
      // Initialize Paystack payment
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: profile?.email || user.email,
          amount: Math.round(Number(campaign.discount_price) * quantity * 100),
          metadata: {
            commitment_id: commitment.id,
            campaign_id: campaignId,
            user_id: user.id,
            type: 'group_buy_commitment'
          },
          callback_url: `${Deno.env.get('SUPABASE_URL')?.replace('https://deggysidjvpyervagpra.supabase.co', 'https://deggysidjvpyervagpra.lovableproject.com')}/profile/groupbuys`
        }),
      });

      const paystackData = await paystackResponse.json();

      if (!paystackData.status) {
        console.error('Paystack error:', paystackData);
        return new Response(JSON.stringify({ error: 'Payment initialization failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
    return new Response(JSON.stringify({
      commitment,
      message: 'Commitment created successfully. You will be notified when the goal is reached.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('💥 Error in commit-to-group-buy:', error);
    console.error('Stack trace:', error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
