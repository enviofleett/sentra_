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
    
    const body = await req.json();
    const { entryId, migrateAll } = body;

    // Handle bulk migration of all verified users
    if (migrateAll) {
      console.log('[Verify Waitlist] Starting bulk migration of verified users');
      return await handleBulkMigration(supabase, corsHeaders);
    }

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

    if (entry.is_social_verified && entry.reward_credited) {
      console.log('[Verify Waitlist] Entry already verified and rewarded');
      return new Response(JSON.stringify({ error: 'Already verified and rewarded' }), { 
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

    // Process the single entry
    const result = await processWaitlistEntry(supabase, entry, rewardAmount, user.id);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('[Verify Waitlist] Successfully verified and rewarded entry:', entryId);

    return new Response(JSON.stringify({ 
      success: true, 
      rewardAmount,
      userId: result.userId,
      message: `User created, verified, and ₦${rewardAmount.toLocaleString()} credited to wallet!` 
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

async function processWaitlistEntry(
  supabase: any, 
  entry: any, 
  rewardAmount: number, 
  adminId: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    console.log('[Process Entry] Processing:', entry.email);
    
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === entry.email);
    
    let userId: string;
    let isNewUser = false;
    
    if (existingUser) {
      console.log('[Process Entry] User already exists:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Create new user with a random password (they'll need to reset it)
      const tempPassword = crypto.randomUUID() + 'Aa1!';
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: entry.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: entry.full_name || '',
          source: 'waitlist'
        }
      });
      
      if (createError) {
        console.error('[Process Entry] Failed to create user:', createError);
        return { success: false, error: `Failed to create user: ${createError.message}` };
      }
      
      userId = newUser.user.id;
      isNewUser = true;
      console.log('[Process Entry] Created new user:', userId);
      
      // Create profile for the new user
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: entry.email,
          full_name: entry.full_name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      if (profileError) {
        console.error('[Process Entry] Failed to create profile:', profileError);
        // Non-fatal, continue
      }
    }
    
    // Credit the wallet using the database function
    const { error: creditError } = await supabase.rpc('credit_waitlist_reward', {
      p_user_id: userId,
      p_amount: rewardAmount
    });
    
    if (creditError) {
      console.error('[Process Entry] Failed to credit wallet:', creditError);
      return { success: false, error: `Failed to credit wallet: ${creditError.message}` };
    }
    
    console.log('[Process Entry] Wallet credited with:', rewardAmount);
    
    // Update the waitlist entry
    const { error: updateError } = await supabase
      .from('waiting_list')
      .update({
        is_social_verified: true,
        reward_credited: true,
        verified_at: new Date().toISOString(),
        verified_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', entry.id);
    
    if (updateError) {
      console.error('[Process Entry] Failed to update waitlist entry:', updateError);
      return { success: false, error: `Failed to update waitlist: ${updateError.message}` };
    }
    
    // Send welcome email with password reset link for new users
    if (isNewUser) {
      try {
        // Use APP_BASE_URL secret or fallback to published URL
        const appBaseUrl = Deno.env.get('APP_BASE_URL');
        if (!appBaseUrl) {
          console.warn('[Process Entry] WARNING: APP_BASE_URL secret is not configured. Using fallback URL. Configure this in Supabase Dashboard > Functions > Secrets');
        }
        const resolvedBaseUrl = appBaseUrl || 'https://sentra-scent-shop-ai.lovable.app';
        console.log('[Process Entry] Using base URL for reset link:', resolvedBaseUrl);
        
        // Generate password reset link
        const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: entry.email,
          options: {
            redirectTo: `${resolvedBaseUrl}/reset-password`
          }
        });
        
        if (resetError) {
          console.error('[Process Entry] Failed to generate reset link:', resetError);
        } else {
          const resetUrl = resetData?.properties?.action_link || `${resolvedBaseUrl}/auth`;
          
          // Send welcome email
          const emailPayload = {
            to: entry.email,
            templateId: 'WAITLIST_WELCOME',
            data: {
              name: entry.full_name || 'Valued Customer',
              reward_amount: rewardAmount.toLocaleString(),
              reset_url: resetUrl
            }
          };
          
          // Call the send-email function internally
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify(emailPayload)
          });
          
          if (emailResponse.ok) {
            console.log('[Process Entry] Welcome email sent to:', entry.email);
          } else {
            const emailError = await emailResponse.text();
            console.error('[Process Entry] Failed to send welcome email:', emailError);
          }
        }
      } catch (emailErr) {
        console.error('[Process Entry] Email sending error:', emailErr);
        // Non-fatal, user is still created
      }
    }
    
    console.log('[Process Entry] Successfully processed entry for:', entry.email);
    return { success: true, userId };
    
  } catch (error) {
    console.error('[Process Entry] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function handleBulkMigration(supabase: any, corsHeaders: Record<string, string>) {
  try {
    // Get all verified waitlist entries that haven't been fully processed
    const { data: entries, error: fetchError } = await supabase
      .from('waiting_list')
      .select('*')
      .eq('is_social_verified', true);
    
    if (fetchError) {
      console.error('[Bulk Migration] Failed to fetch entries:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch waitlist entries' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No verified entries to migrate',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[Bulk Migration] Found', entries.length, 'verified entries to process');
    
    // Get reward amount
    const { data: settings } = await supabase
      .from('pre_launch_settings')
      .select('waitlist_reward_amount')
      .maybeSingle();
    
    const rewardAmount = settings?.waitlist_reward_amount || 100000;
    
    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Add delay between users to respect Supabase API rate limits (skip first iteration)
      if (i > 0) {
        console.log('[Bulk Migration] Rate limiting: waiting 1.2s before next user...');
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      
      // Log progress every 10 users
      if (i > 0 && i % 10 === 0) {
        console.log(`[Bulk Migration] Progress: ${i}/${entries.length} entries processed (${successCount} success, ${skipCount} skipped, ${errors.length} errors)`);
      }
      
      // Check if user already has a wallet with promo balance (already migrated)
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === entry.email);
      
      if (existingUser) {
        // Check if wallet already has this reward
        const { data: wallet } = await supabase
          .from('user_wallets')
          .select('balance_promo')
          .eq('user_id', existingUser.id)
          .maybeSingle();
        
        if (wallet && wallet.balance_promo >= rewardAmount) {
          console.log('[Bulk Migration] Skipping already migrated user:', entry.email);
          skipCount++;
          continue;
        }
      }
      
      // Process the entry (will create user if needed and credit wallet)
      const result = await processWaitlistEntry(supabase, entry, rewardAmount, 'system-migration');
      
      if (result.success) {
        successCount++;
      } else {
        errors.push(`${entry.email}: ${result.error}`);
      }
    }
    
    console.log('[Bulk Migration] Completed. Success:', successCount, 'Skipped:', skipCount, 'Errors:', errors.length);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Migration complete! ${successCount} users created/credited, ${skipCount} already migrated`,
      processed: successCount,
      skipped: skipCount,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[Bulk Migration] Error:', error);
    return new Response(JSON.stringify({ error: 'Bulk migration failed' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}