
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Send } from 'lucide-react';
import { getEmailTemplate } from '@/utils/emailTemplates';

const SYSTEM_TEMPLATES = [
  { id: 'order_update', name: 'Order Update', description: 'Sent when updating an order status manually' },
  { id: 'payment_reminder', name: 'Payment Reminder', description: 'Sent to remind customers about pending payments' },
  { id: 'welcome_email', name: 'Welcome Email', description: 'Sent to new customers' },
];

export function EmailTemplatesManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(SYSTEM_TEMPLATES[0].id);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetchTemplate(selectedTemplateId);
  }, [selectedTemplateId]);

  const fetchTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_id', templateId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubject(data.subject);
        setContent(data.html_content); // Using html_content for the body
      } else {
        // Set defaults if not found
        if (templateId === 'order_update') {
          setSubject('Update on Order #{{orderId}}');
          setContent('Hi {{customerName}},\n\nWe wanted to give you an update on your order #{{orderId}}.\n\nThe current status is: {{status}}.\n\nThanks,\nSentra Team');
        } else {
          setSubject('');
          setContent('');
        }
      }
    } catch (error: any) {
      console.error('Error fetching template:', error);
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const templateName = SYSTEM_TEMPLATES.find(t => t.id === selectedTemplateId)?.name || 'Unknown Template';
      
      const { error } = await supabase
        .from('email_templates')
        .upsert({
          template_id: selectedTemplateId,
          name: templateName,
          subject,
          html_content: content,
          text_content: content // For now, storing same in both
        }, { onConflict: 'template_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast({
        title: "Validation Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setSendingTest(true);
    try {
      // Replace variables with dummy data for test
      let testSubject = subject
        .replace('{{orderId}}', '12345678')
        .replace('{{customerName}}', 'Test Customer')
        .replace('{{status}}', 'processing');
        
      let testBody = content
        .replace('{{orderId}}', '12345678')
        .replace('{{customerName}}', 'Test Customer')
        .replace('{{status}}', 'processing');

      // Use the shared template wrapper
      const htmlContent = getEmailTemplate(testSubject, testBody);

      // We can reuse the bulk email function or send-order-update. 
      // Since send-bulk-email is generic, let's use that for testing the template look.
      const { data, error } = await supabase.functions.invoke('send-bulk-email', {
        body: {
          subject: testSubject,
          htmlContent,
          textContent: testBody,
          recipientFilter: 'test', // Custom filter or just use testEmail
          testEmail // logic in edge function usually prioritizes testEmail
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to send test email');
      }

      toast({
        title: "Test Email Sent",
        description: `Sent to ${testEmail}`,
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Edit Template</CardTitle>
          <CardDescription>Customize the email content sent to customers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYSTEM_TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {SYSTEM_TEMPLATES.find(t => t.id === selectedTemplateId)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Subject Line</Label>
            <Input 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
              placeholder="e.g. Update on Order #{{orderId}}"
            />
          </div>

          <div className="space-y-2">
            <Label>Email Body</Label>
            <Textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              className="min-h-[200px] font-mono text-sm"
              placeholder="Enter email content..."
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Available variables:</p>
              <div className="flex gap-2">
                <code className="bg-muted px-1 py-0.5 rounded">{'{{customerName}}'}</code>
                <code className="bg-muted px-1 py-0.5 rounded">{'{{orderId}}'}</code>
                <code className="bg-muted px-1 py-0.5 rounded">{'{{status}}'}</code>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center">
             <div className="flex items-center gap-2 flex-1 mr-4">
                <Input 
                  placeholder="Test email address" 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="max-w-[200px]"
                />
                <Button variant="outline" size="sm" onClick={handleSendTest} disabled={sendingTest || !testEmail}>
                  {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
             </div>
             <Button onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
             </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Live preview of how the email will look.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden bg-gray-100 p-4 flex justify-center items-start h-[600px] overflow-y-auto">
             <div className="bg-white shadow-sm max-w-[600px] w-full origin-top transform scale-90">
               <div dangerouslySetInnerHTML={{ 
                 __html: getEmailTemplate(
                   subject.replace(/{{.*?}}/g, '...'), 
                   content.replace(/{{customerName}}/g, 'John Doe')
                          .replace(/{{orderId}}/g, '12345678')
                          .replace(/{{status}}/g, 'shipped')
                 ) 
               }} />
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
