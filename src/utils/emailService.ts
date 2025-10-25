interface EmailData {
  [key: string]: string | number;
}

export const sendEmail = async (
  to: string, 
  templateId: string, 
  data: EmailData
): Promise<{ success: boolean; messageId: string }> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    console.log('📧 Sending email via Edge Function:', { to, templateId });

    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: { to, templateId, data }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      return { success: false, messageId: '' };
    }

    console.log('✅ Email sent successfully:', result);
    return { 
      success: result.success, 
      messageId: result.messageId || '' 
    };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, messageId: '' };
  }
};