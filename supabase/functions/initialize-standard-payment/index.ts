import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  orderId: string;
  customerEmail: string;
  customerName: string;
}

interface SplitConfig {
  capital_percentage: number;
  admin_percentage: number;
  growth_percentage: number;
  marketing_percentage: number;
  capital_subaccount_code: string | null;
  admin_subaccount_code: string | null;
  growth_subaccount_code: string | null;
  marketing_subaccount_code: string | null;
}

interface ProductWithCost {
  id: string;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  name: string;
}

// NOTE: Merchant absorbs Paystack fees - customer pays exact order total

/**
 * Calculate profit-based split amounts for Paystack subaccounts
 */
function calculateProfitSplit(
  orderItems: any[],
  products: ProductWithCost[],
  config: SplitConfig
): { totalAmount: number; splits: any[] } {
  let totalCapital = 0;
  let totalProfit = 0;
  
  // Calculate total cost (capital) and total profit
  for (const item of orderItems) {
    const product = products.find(p => p.id === item.product_id);
    if (!product) continue;
    
    const costPrice = product.cost_price || 0;
    const sellingPrice = product.price;
    const quantity = item.quantity;
    
    // Capital = Cost * Quantity
    totalCapital += costPrice * quantity;
    
    // Profit = (Price - Cost) * Quantity
    const profit = (sellingPrice - costPrice) * quantity;
    totalProfit += profit;
  }
  
  // Calculate bucket amounts from profit
  const growthAmount = Math.round(totalProfit * (config.growth_percentage / 100) * 100) / 100;
  const marketingAmount = Math.round(totalProfit * (config.marketing_percentage / 100) * 100) / 100;
  const adminAmount = Math.round(totalProfit * (config.admin_percentage / 100) * 100) / 100;
  // Capital gets cost + its percentage of profit
  const capitalProfitShare = Math.round(totalProfit * (config.capital_percentage / 100) * 100) / 100;
  const capitalAmount = Math.round((totalCapital + capitalProfitShare) * 100) / 100;
  
  const totalAmount = capitalAmount + growthAmount + marketingAmount + adminAmount;
  
  // Build splits array for Paystack (only include if subaccount codes exist)
  const splits: any[] = [];
  
  if (config.capital_subaccount_code && capitalAmount > 0) {
    splits.push({
      subaccount: config.capital_subaccount_code,
      share: Math.round(capitalAmount * 100) // Amount in kobo
    });
  }
  
  if (config.growth_subaccount_code && growthAmount > 0) {
    splits.push({
      subaccount: config.growth_subaccount_code,
      share: Math.round(growthAmount * 100)
    });
  }
  
  if (config.marketing_subaccount_code && marketingAmount > 0) {
    splits.push({
      subaccount: config.marketing_subaccount_code,
      share: Math.round(marketingAmount * 100)
    });
  }
  
  if (config.admin_subaccount_code && adminAmount > 0) {
    splits.push({
      subaccount: config.admin_subaccount_code,
      share: Math.round(adminAmount * 100)
    });
  }
  
  return { totalAmount, splits };
}

serve(async (req) => {
  console.log('[Initialize Payment] Request received');

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
      console.error('[Initialize Payment] No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[Initialize Payment] Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { orderId, customerEmail, customerName }: PaymentRequest = await req.json();

    console.log(`[Initialize Payment] Processing order: ${orderId} for user: ${user.id}`);

    // Fetch order and verify ownership
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      console.error('[Initialize Payment] Order not found:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify order is still payable
    if (order.payment_status === 'paid' || order.paystack_status === 'success') {
      console.log('[Initialize Payment] Order already paid');
      return new Response(JSON.stringify({ error: 'Order already paid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SERVER-SIDE PRICE VERIFICATION: Recalculate total from database prices
    const orderItems = order.items as any[];
    const productIds = orderItems.map(item => item.product_id).filter(Boolean);

    console.log(`[Initialize Payment] Verifying ${productIds.length} products`);

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price, cost_price, stock_quantity, name, vendor_id, vendor:vendors(id, rep_full_name, min_order_quantity)')
      .in('id', productIds);

    if (productsError) {
      console.error('[Initialize Payment] Products fetch error:', productsError);
      return new Response(JSON.stringify({ error: 'Failed to verify products' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MOQ VALIDATION: Check minimum order quantities per vendor
    const vendorQuantities: Record<string, {
      vendorName: string;
      moq: number;
      totalQty: number;
    }> = {};

    for (const item of orderItems) {
      const product = products?.find(p => p.id === item.product_id);
      if (!product) continue;

      const vendorId = product.vendor_id;
      const vendor = (product as any).vendor;

      if (vendorId && vendor) {
        if (!vendorQuantities[vendorId]) {
          vendorQuantities[vendorId] = {
            vendorName: vendor.rep_full_name || 'Unknown Vendor',
            moq: vendor.min_order_quantity || 1,
            totalQty: 0
          };
        }
        vendorQuantities[vendorId].totalQty += item.quantity;
      }
    }

    // Check if any vendor's MOQ is not met
    const moqViolations: string[] = [];
    for (const [vendorId, data] of Object.entries(vendorQuantities)) {
      if (data.totalQty < data.moq) {
        const shortage = data.moq - data.totalQty;
        moqViolations.push(`${data.vendorName}: need ${shortage} more item(s) to meet minimum of ${data.moq}`);
        console.error(`[Initialize Payment] MOQ violation - ${data.vendorName}: ${data.totalQty}/${data.moq}`);
      }
    }

    if (moqViolations.length > 0) {
      return new Response(JSON.stringify({
        error: 'Minimum order quantity not met',
        details: moqViolations.join('; ')
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Initialize Payment] MOQ validation passed');

    // Recalculate total from current database prices
    let verifiedTotal = 0;
    const outOfStock: string[] = [];

    for (const item of orderItems) {
      const product = products?.find(p => p.id === item.product_id);
      if (!product) {
        console.error(`[Initialize Payment] Product ${item.product_id} not found`);
        return new Response(JSON.stringify({ error: `Product not found: ${item.name}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Stock check
      if (product.stock_quantity < item.quantity) {
        outOfStock.push(product.name);
      }

      // Use database price, not submitted price
      verifiedTotal += Number(product.price) * item.quantity;
    }

    if (outOfStock.length > 0) {
      console.error('[Initialize Payment] Out of stock:', outOfStock);
      return new Response(JSON.stringify({ 
        error: 'Stock unavailable',
        details: `Out of stock: ${outOfStock.join(', ')}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add shipping and tax (currently 0)
    const shippingCost = order.shipping_cost || 0;
    const tax = order.tax || 0;
    verifiedTotal += shippingCost + tax;

    console.log(`[Initialize Payment] Verified total: ${verifiedTotal}, Order total: ${order.total_amount}`);

    // Update order with verified amount if different (handles price changes since order creation)
    if (Math.abs(verifiedTotal - Number(order.total_amount)) > 0.01) {
      console.log(`[Initialize Payment] Price discrepancy detected, updating order`);
      await supabase
        .from('orders')
        .update({ 
          total_amount: verifiedTotal,
          subtotal: verifiedTotal - shippingCost - tax,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
    }

    // Generate payment reference if not exists
    let paymentReference = order.payment_reference;
    if (!paymentReference) {
      paymentReference = `order_${orderId}_${Date.now()}`;
      await supabase
        .from('orders')
        .update({ payment_reference: paymentReference })
        .eq('id', orderId);
    }

    // Get APP_BASE_URL
    const { data: configData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'live_callback_url')
      .maybeSingle();
    
    const appBaseUrl = (configData?.value as any)?.url || Deno.env.get('APP_BASE_URL');

    if (!appBaseUrl) {
      console.error('[Initialize Payment] APP_BASE_URL not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch profit split configuration with subaccount codes
    const { data: splitConfigData } = await supabase
      .from('profit_split_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const splitConfig: SplitConfig = splitConfigData ? {
      capital_percentage: Number(splitConfigData.capital_percentage) || 40,
      admin_percentage: Number(splitConfigData.admin_percentage) || 20,
      growth_percentage: Number(splitConfigData.growth_percentage) || 25,
      marketing_percentage: Number(splitConfigData.marketing_percentage) || 15,
      capital_subaccount_code: splitConfigData.capital_subaccount_code || null,
      admin_subaccount_code: splitConfigData.admin_subaccount_code || null,
      growth_subaccount_code: splitConfigData.growth_subaccount_code || null,
      marketing_subaccount_code: splitConfigData.marketing_subaccount_code || null,
    } : {
      capital_percentage: 40,
      admin_percentage: 20,
      growth_percentage: 25,
      marketing_percentage: 15,
      capital_subaccount_code: null,
      admin_subaccount_code: null,
      growth_subaccount_code: null,
      marketing_subaccount_code: null,
    };

    // Check if we have subaccount codes configured
    const hasSubaccounts = splitConfig.capital_subaccount_code || 
                          splitConfig.admin_subaccount_code || 
                          splitConfig.growth_subaccount_code || 
                          splitConfig.marketing_subaccount_code;

    // Initialize Paystack payment with SERVER-VERIFIED amount
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('[Initialize Payment] PAYSTACK_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Customer pays exact order total - merchant absorbs Paystack fees
    const amountInKobo = Math.round(verifiedTotal * 100);
    
    console.log(`[Initialize Payment] Amount: ₦${verifiedTotal}, Kobo: ${amountInKobo}`);

    // Build Paystack payload
    const paystackPayload: any = {
      email: customerEmail,
      amount: amountInKobo,
      reference: paymentReference,
      metadata: {
        order_id: orderId,
        user_id: user.id,
        customer_name: customerName,
        type: 'standard_order'
      },
      callback_url: `${appBaseUrl}/checkout/success?order_id=${orderId}&type=standard_order`
    };

    // Add split configuration if subaccounts are configured
    if (hasSubaccounts) {
      const { splits } = calculateProfitSplit(orderItems, products as ProductWithCost[], splitConfig);
      
      if (splits.length > 0) {
        paystackPayload.split = {
          type: "flat",
          currency: "NGN",
          subaccounts: splits,
          bearer_type: "account" // Main account bears transaction charges
        };
        console.log(`[Initialize Payment] Split configured with ${splits.length} subaccounts`);
      }
    }

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('[Initialize Payment] Paystack error:', paystackData);
      return new Response(JSON.stringify({ error: 'Payment initialization failed', details: paystackData.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Initialize Payment] SUCCESS - Authorization URL generated`);

    return new Response(JSON.stringify({
      paymentUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      amount: verifiedTotal
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Initialize Payment] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
