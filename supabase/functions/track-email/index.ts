import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b
]);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get('c');
    const email = url.searchParams.get('e');
    const eventType = url.searchParams.get('t') || 'opened';
    const redirectUrl = url.searchParams.get('r');
    const unsubscribe = url.searchParams.get('u') === '1';

    console.log(`📧 Tracking event: ${eventType} for campaign ${campaignId}, email: ${email}, unsubscribe: ${unsubscribe}`);

    if (!campaignId || !email) {
      console.error('Missing required parameters');
      // Still return pixel/redirect to not break user experience
      if (eventType === 'clicked' && redirectUrl) {
        return Response.redirect(redirectUrl, 302);
      }
      return new Response(TRACKING_PIXEL, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user agent and IP for analytics
    const userAgent = req.headers.get('user-agent') || '';
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('cf-connecting-ip') || '';

    const decodedEmail = decodeURIComponent(email).toLowerCase();

    if (unsubscribe) {
      const { data: existingUnsub } = await supabase
        .from('email_unsubscribes')
        .select('id')
        .eq('email', decodedEmail)
        .maybeSingle();

      if (!existingUnsub) {
        const { error: unsubError } = await supabase
          .from('email_unsubscribes')
          .insert({ email: decodedEmail, category: 'general' });

        if (unsubError) {
          console.error('Failed to insert unsubscribe:', unsubError);
        } else {
          console.log(`✅ Unsubscribed ${decodedEmail}`);
        }
      } else {
        console.log(`⏭️ ${decodedEmail} already unsubscribed`);
      }

      const landingUrl = redirectUrl || (Deno.env.get('APP_BASE_URL') || 'https://sentra.ng');
      return Response.redirect(landingUrl, 302);
    }

    // Check for duplicate events (prevent counting multiple opens)
    const { data: existingEvent } = await supabase
      .from('email_tracking_events')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('recipient_email', decodedEmail)
      .eq('event_type', eventType)
      .maybeSingle();

    if (!existingEvent) {
      // Record tracking event
      const { error: insertError } = await supabase
        .from('email_tracking_events')
        .insert({
          campaign_id: campaignId,
          recipient_email: decodedEmail,
          event_type: eventType,
          link_url: redirectUrl || null,
          user_agent: userAgent,
          ip_address: ipAddress
        });

      if (insertError) {
        console.error('Failed to insert tracking event:', insertError);
      } else {
        // Update campaign counters
        if (eventType === 'opened') {
          const { data: campaign } = await supabase
            .from('email_campaigns')
            .select('opened_count')
            .eq('id', campaignId)
            .single();
          
          if (campaign) {
            await supabase
              .from('email_campaigns')
              .update({ opened_count: (campaign.opened_count || 0) + 1 })
              .eq('id', campaignId);
          }
        } else {
          const { data: campaign } = await supabase
            .from('email_campaigns')
            .select('clicked_count')
            .eq('id', campaignId)
            .single();
          
          if (campaign) {
            await supabase
              .from('email_campaigns')
              .update({ clicked_count: (campaign.clicked_count || 0) + 1 })
              .eq('id', campaignId);
          }
        }

        console.log(`✅ Tracked ${eventType} event for ${email}`);
      }
    } else {
      console.log(`⏭️ Duplicate ${eventType} event skipped for ${email}`);
    }

    // Return appropriate response
    if (eventType === 'clicked' && redirectUrl) {
      return Response.redirect(decodeURIComponent(redirectUrl), 302);
    }

    // Return tracking pixel for open events
    return new Response(TRACKING_PIXEL, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Tracking error:', error);
    
    // Always return a valid response
    const url = new URL(req.url);
    const redirectUrl = url.searchParams.get('r');
    
    if (redirectUrl) {
      return Response.redirect(decodeURIComponent(redirectUrl), 302);
    }
    
    return new Response(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif' }
    });
  }
});
