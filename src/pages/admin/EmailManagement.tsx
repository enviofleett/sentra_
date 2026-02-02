
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, Eye } from 'lucide-react';
import { getEmailTemplate } from '@/utils/emailTemplates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const EmailManagement = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [recipientFilter, setRecipientFilter] = useState<string>('waiting_list_all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleSend = async (isTest: boolean = false) => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject and message are required.",
        variant: "destructive",
      });
      return;
    }

    if (isTest && !testEmail) {
      toast({
        title: "Validation Error",
        description: "Test email address is required for test send.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Map the UI filter to the API filter
      let apiFilter = 'all';
      if (recipientFilter === 'waiting_list_verified') apiFilter = 'verified';
      if (recipientFilter === 'waiting_list_pending') apiFilter = 'pending';
      if (recipientFilter === 'customers') apiFilter = 'customers';

      // Generate the HTML content using the template
      const htmlContent = getEmailTemplate(subject, message);

      const payload: any = {
        subject,
        htmlContent,
        textContent: message, // Plain text fallback
        recipientFilter: apiFilter,
      };

      if (isTest) {
        payload.testEmail = testEmail;
      }

      const { data, error } = await supabase.functions.invoke('send-bulk-email', {
        body: payload
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to send emails');
      }

      toast({
        title: isTest ? "Test Email Sent" : "Bulk Emails Sent",
        description: isTest 
          ? `Test email sent to ${testEmail}` 
          : `Successfully processed ${data.sent} emails.`,
      });

      if (!isTest) {
        // Clear form after successful bulk send
        setSubject('');
        setMessage('');
      }

    } catch (error: any) {
      console.error('Error sending emails:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send emails. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatedHtml = getEmailTemplate(subject || 'Subject Preview', message || 'Message content preview...');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Email Campaigns</h2>
        <p className="text-muted-foreground">Send bulk emails to your waiting list or customers.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Compose Email</CardTitle>
            <CardDescription>Create your email campaign content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipients</Label>
              <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting_list_all">Waiting List - All</SelectItem>
                  <SelectItem value="waiting_list_verified">Waiting List - Verified Only</SelectItem>
                  <SelectItem value="waiting_list_pending">Waiting List - Pending Only</SelectItem>
                  <SelectItem value="customers">All Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input 
                id="subject" 
                placeholder="Enter email subject" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message Body (HTML supported)</Label>
              <Textarea 
                id="message" 
                placeholder="Type your message here... You can use {{name}} variable." 
                className="min-h-[200px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The message will be wrapped in the standard Sentra email template.
                You can use <code>{'{{name}}'}</code> to insert the recipient's name.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <div className="flex gap-2 items-end">
                 <div className="flex-1 space-y-2">
                    <Label htmlFor="test-email">Test Email Address</Label>
                    <Input 
                      id="test-email" 
                      placeholder="your@email.com" 
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                 </div>
                 <Button 
                   variant="outline" 
                   onClick={() => handleSend(true)}
                   disabled={isLoading || !testEmail}
                 >
                   {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                   Send Test
                 </Button>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="flex-1">
                      <Eye className="mr-2 h-4 w-4" /> Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[800px] h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Email Preview</DialogTitle>
                    </DialogHeader>
                    <div className="border rounded-md p-4 bg-gray-50 min-h-[400px]">
                      <iframe 
                        srcDoc={generatedHtml} 
                        className="w-full h-[600px] border-none bg-white"
                        title="Email Preview"
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  className="flex-1" 
                  onClick={() => handleSend(false)}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Bulk Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 hidden md:block">
           <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>This is how your email will look.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="border rounded-md overflow-hidden bg-gray-100 p-4 flex justify-center items-start h-[600px] overflow-y-auto">
               <div className="bg-white shadow-sm max-w-[600px] w-full origin-top transform scale-90">
                 <div dangerouslySetInnerHTML={{ __html: generatedHtml }} />
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
