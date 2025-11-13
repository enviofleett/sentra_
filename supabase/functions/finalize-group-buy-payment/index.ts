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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { commitmentId }: PaymentRequest = await req.json();

    // Fetch commitment details
    const { data: commitment, error: commitmentError } = await supabase
      .from('group_buy_commitments')
      .select('*, group_buy_campaigns!inner(*, products(name, price))')
      .eq('id', commitmentId)
      .eq('user_id', user.id)
      .single();

    if (commitmentError || !commitment) {
      console.error('Commitment not found:', commitmentError);
      return new Response(JSON.stringify({ error: 'Commitment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate commitment is unpaid
    if (commitment.status !== 'committed_unpaid') {
      return new Response(JSON.stringify({ error: 'Commitment already processed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check payment deadline
    if (commitment.payment_deadline && new Date(commitment.payment_deadline) < new Date()) {
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

    const campaign = commitment.group_buy_campaigns;
    const totalAmount = Number(commitment.committed_price) * commitment.quantity;

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: profile?.email || user.email,
        amount: Math.round(totalAmount * 100),
        metadata: {
          commitment_id: commitmentId,
          campaign_id: commitment.campaign_id,
          user_id: user.id,
          type: 'group_buy_final_payment'
        },
        callback_url: `${Deno.env.get('APP_BASE_URL')}/profile/groupbuys`
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
      paymentUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in finalize-group-buy-payment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
