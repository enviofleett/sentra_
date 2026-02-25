// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, last_name, phone } = await req.json();

    if (!email || !first_name || !last_name || !phone) {
      throw new Error("Email, First Name, Last Name, and Phone are required");
    }

    // @ts-ignore
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      console.error("PAYSTACK_SECRET_KEY is missing from environment variables");
      throw new Error("Paystack secret key not configured");
    }

    // Sanitize key (remove whitespace/newlines if present)
    const sanitizedKey = paystackSecretKey.trim();
    if (!sanitizedKey.startsWith("sk_")) {
        console.warn("Paystack Secret Key does not start with 'sk_'. This might be an invalid key.");
    }


    // Helper for retry logic
    const fetchWithRetry = async (url: string, options: any, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fetch(url, options);
          if (res.ok) return res;
          // If 4xx error (except 429), don't retry as it's likely a bad request
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
             return res; 
          }
        } catch (err) {
          if (i === retries - 1) throw err;
        }
        // Wait before retry (exponential backoff: 1s, 2s, 4s)
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
      throw new Error("Max retries reached");
    };

    // Safe JSON parser
    const safeJson = async (res: Response) => {
      try {
        return await res.json();
      } catch (e) {
        const text = await res.text();
        console.error("Failed to parse JSON response:", text);
        return { status: false, message: `Invalid JSON response: ${text.substring(0, 100)}` };
      }
    };

    // 1. Check if customer exists or create new one
    console.log(`Checking/Creating customer: ${email}, Phone: ${phone}`);
    let customerCode;
    let customerId;

    // First try to fetch customer
    // Note: Paystack doesn't have a direct "get by email" endpoint that is public/easy without listing.
    // However, creating a customer with an existing email returns the existing customer details.
    
    const createCustomerResponse = await fetchWithRetry("https://api.paystack.co/customer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sanitizedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        first_name,
        last_name,
        phone,
      }),
    });

    const customerData = await safeJson(createCustomerResponse);
    console.log("Customer creation response:", JSON.stringify(customerData));
    
    if (!customerData.status) {
       // If creation fails, maybe they exist?
       // Paystack usually returns the existing customer if email matches.
       // But if there's another error, we should throw.
       console.error("Customer creation failed:", customerData);
       throw new Error(customerData.message || "Failed to create/fetch customer");
    }

    customerCode = customerData.data.customer_code;
    customerId = customerData.data.id;
    console.log(`Customer Code: ${customerCode}, ID: ${customerId}`);

    // 2. Create/Fetch Dedicated Virtual Account
    // We try to create a dedicated account. If one exists, Paystack might return error or the existing one.
    // Actually, Paystack has a specific endpoint for this: POST /dedicated_account
    
    console.log(`Creating/Fetching DVA for customer ${customerCode}`);
    const dvaResponse = await fetchWithRetry("https://api.paystack.co/dedicated_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sanitizedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: customerCode,
        preferred_bank: "wema-bank" // Optional, but good for DVA
      }),
    });

    const dvaData = await safeJson(dvaResponse);
    console.log("DVA creation response:", JSON.stringify(dvaData));

    if (!dvaData.status) {
      // If failed, check if it's because they already have one.
      // Paystack message variations: 
      // "Customer already has a dedicated account"
      // "Dedicated account already assigned"
      const msg = (dvaData.message || "").toLowerCase();
      if (msg.includes("already has") || msg.includes("assigned")) {
        console.log("Customer already has DVA, fetching it...");
        // Fetch existing DVA
        const fetchDvaResponse = await fetchWithRetry(`https://api.paystack.co/dedicated_account?customer=${customerId}`, {
           method: "GET",
           headers: {
             Authorization: `Bearer ${sanitizedKey}`,
             "Content-Type": "application/json",
           },
        });
        const fetchDvaData = await safeJson(fetchDvaResponse);
        console.log("Fetch existing DVA response:", JSON.stringify(fetchDvaData));
        
        if (fetchDvaData.status && fetchDvaData.data.length > 0) {
            // Find the active one or just take the first one
            const account = fetchDvaData.data[0];
            return new Response(JSON.stringify({
                bank_name: account.bank.name,
                account_number: account.account_number,
                account_name: account.account_name
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
      }
      
      console.error("DVA creation failed:", dvaData);
      throw new Error(dvaData.message || "Failed to create dedicated account");
    }

    // Success - New DVA Created
    const account = dvaData.data;
    return new Response(JSON.stringify({
        bank_name: account.bank.name,
        account_number: account.account_number,
        account_name: account.account_name
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in paystack-create-virtual-account:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
