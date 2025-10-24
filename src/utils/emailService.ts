interface EmailData {
  [key: string]: string | number;
}

export const sendEmail = async (
  to: string, 
  templateId: string, 
  data: EmailData
): Promise<{ success: boolean; messageId: string }> => {
  // Fetch template from database
  const { supabase } = await import('@/integrations/supabase/client');
  
  const { data: template, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_id', templateId)
    .single();

  if (error || !template) {
    console.error('Email template not found:', templateId);
    return { success: false, messageId: '' };
  }

  // Compile template with data
  let compiledHtml = template.html_content;
  let compiledSubject = template.subject;

  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    compiledHtml = compiledHtml.replace(regex, String(value));
    compiledSubject = compiledSubject.replace(regex, String(value));
  });

  // Simulate email sending (log to console)
  const emailPayload = {
    to,
    subject: compiledSubject,
    html: compiledHtml,
    sentAt: new Date().toISOString(),
    templateId,
    data
  };

  console.log('📧 EMAIL SENT (SIMULATED):', emailPayload);

  // In production, you would call an Edge Function to send via Resend
  // const { data: result } = await supabase.functions.invoke('send-email', {
  //   body: emailPayload
  // });

  return { 
    success: true, 
    messageId: 'sim_' + Date.now() 
  };
};