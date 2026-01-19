import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductToClassify {
  id: string;
  name: string;
  description: string | null;
  gender: string | null;
  size: string | null;
}

interface ClassificationResult {
  gender: string;
  size: string;
}

interface ProcessingResult {
  success: boolean;
  product_id: string;
  product_name: string;
  gender?: string;
  size?: string;
  error?: string;
}

const VALID_GENDERS = ['Men', 'Women', 'Unisex'];

async function classifyProduct(
  genAI: GoogleGenerativeAI,
  product: ProductToClassify
): Promise<ClassificationResult | null> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const prompt = `You are a perfume classification expert. Analyze the following product and extract:
1. Gender: Determine if this perfume is for "Men", "Women", or "Unisex"
   - "Pour Homme" means Men
   - "Pour Femme" means Women
   - Look for keywords like "men", "women", "masculine", "feminine", "unisex"
   - If unclear, default to "Unisex"
2. Size: Extract the volume/weight (e.g., "100ml", "3.4 oz", "50ml")
   - Look for patterns like: 100ml, 3.4oz, 50 ml, etc.
   - If not found, return empty string

Product Name: ${product.name}
Product Description: ${product.description || 'N/A'}

Return a JSON object with exactly this structure:
{
  "gender": "Men" | "Women" | "Unisex",
  "size": "string (e.g., 100ml, 3.4 oz, or empty string)"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      console.error(`Empty response for product ${product.id}`);
      return null;
    }

    const parsed = JSON.parse(text) as ClassificationResult;

    // Validate gender
    if (!VALID_GENDERS.includes(parsed.gender)) {
      console.error(`Invalid gender "${parsed.gender}" for product ${product.id}, defaulting to Unisex`);
      parsed.gender = 'Unisex';
    }

    // Clean up size
    if (parsed.size) {
      parsed.size = parsed.size.trim();
    }

    return parsed;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error classifying product ${product.id}:`, errorMessage);
    return null;
  }
}

async function classifySingleProduct(
  genAI: GoogleGenerativeAI,
  supabase: any,
  product: ProductToClassify
): Promise<ProcessingResult> {
  try {
    console.log(`Classifying: ${product.name}`);

    const classification = await classifyProduct(genAI, product);

    if (!classification) {
      return {
        success: false,
        product_id: product.id,
        product_name: product.name,
        error: 'Failed to classify product',
      };
    }

    // Update the product in the database
    const updateData: { gender?: string; size?: string } = {};

    if (classification.gender) {
      updateData.gender = classification.gender;
    }

    if (classification.size) {
      updateData.size = classification.size;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id);

      if (updateError) {
        console.error(`Error updating product ${product.id}:`, updateError);
        return {
          success: false,
          product_id: product.id,
          product_name: product.name,
          error: `Database update failed: ${updateError.message}`,
        };
      }
    }

    return {
      success: true,
      product_id: product.id,
      product_name: product.name,
      gender: classification.gender,
      size: classification.size,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error processing ${product.name}:`, errorMessage);
    return {
      success: false,
      product_id: product.id,
      product_name: product.name,
      error: errorMessage,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      product_ids,
      only_unclassified = true,
      batch_size = 10,
      offset = 0,
    } = body;

    // Validate environment variables
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);

    console.log('Starting bulk product classification...');

    // Build query to fetch products
    let query = supabase
      .from('products')
      .select('id, name, description, gender, size', { count: 'exact' })
      .eq('is_active', true);

    // Filter by specific product IDs if provided
    if (product_ids && Array.isArray(product_ids) && product_ids.length > 0) {
      query = query.in('id', product_ids);
    }

    // Filter by unclassified products if requested
    if (only_unclassified) {
      query = query.or('gender.is.null,size.is.null');
    }

    // Apply pagination
    query = query.range(offset, offset + batch_size - 1);

    const { data: products, error: fetchError, count: totalCount } = await query;

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: offset > 0 ? 'Batch complete - no more products' : 'No products found to classify',
          summary: { total: totalCount || 0, processed: 0, successful: 0, failed: 0 },
          results: [],
          pagination: { offset, batch_size, has_more: false, total: totalCount || 0 },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(
      `Classifying batch of ${products.length} products (offset: ${offset}, total: ${totalCount})...`
    );

    const results: ProcessingResult[] = [];

    // Process products sequentially with rate limiting
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Add delay between requests to respect API rate limits (100ms)
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const result = await classifySingleProduct(genAI, supabase, product);
      results.push(result);

      const status = result.success
        ? `✓ ${result.gender || 'N/A'} | ${result.size || 'N/A'}`
        : `✗ ${result.error}`;
      console.log(`Progress: ${offset + i + 1}/${totalCount} - ${product.name}: ${status}`);
    }

    const summary = {
      total: totalCount || 0,
      processed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };

    const hasMore = offset + products.length < (totalCount || 0);

    console.log(
      `Batch complete: ${summary.successful} successful, ${summary.failed} failed. Has more: ${hasMore}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
        pagination: {
          offset,
          batch_size,
          has_more: hasMore,
          next_offset: hasMore ? offset + batch_size : null,
          total: totalCount || 0,
          processed_so_far: offset + products.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in bulk classification:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to process bulk classification';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
