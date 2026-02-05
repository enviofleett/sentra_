
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, Send, Smartphone, Monitor, History, Check } from 'lucide-react';
import { getEmailTemplate } from '@/utils/emailTemplates';
import { RichTextEditor } from './RichTextEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-save ref to track latest content without triggering effects
  const contentRef = useRef(content);
  const subjectRef = useRef(subject);

  useEffect(() => {
    contentRef.current = content;
    subjectRef.current = subject;
  }, [content, subject]);

  useEffect(() => {
    fetchTemplate(selectedTemplateId);
    fetchVersions(selectedTemplateId);
  }, [selectedTemplateId]);

  // Auto-save logic (30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (contentRef.current && (contentRef.current !== '' || subjectRef.current !== '')) {
        handleAutoSave();
      }
    }, 30000);

    return () => clearInterval(interval);
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
        setContent(data.html_content);
        setLastSaved(new Date(data.updated_at));
      } else {
        // Set defaults if not found
        if (templateId === 'order_update') {
          setSubject('Update on Order #{{orderId}}');
          setContent('<p>Hi {{customerName}},</p><p>We wanted to give you an update on your order #{{orderId}}.</p><p>The current status is: <strong>{{status}}</strong>.</p><p>Thanks,<br>Sentra Team</p>');
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

  const fetchVersions = async (templateId: string) => {
    const { data } = await supabase
      .from('email_template_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setVersions(data);
  };

  const handleAutoSave = async () => {
    setIsAutoSaving(true);
    try {
      await saveTemplate(true);
    } catch (err) {
      console.error("Auto-save failed", err);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const saveTemplate = async (isAuto: boolean = false) => {
    const templateName = SYSTEM_TEMPLATES.find(t => t.id === selectedTemplateId)?.name || 'Unknown Template';
    
    // 1. Update main template
    const { error } = await supabase
      .from('email_templates')
      .upsert({
        template_id: selectedTemplateId,
        name: templateName,
        subject: subjectRef.current,
        html_content: contentRef.current,
        text_content: contentRef.current, // Simplified
        updated_at: new Date().toISOString()
      }, { onConflict: 'template_id' });

    if (error) throw error;

    setLastSaved(new Date());

    if (!isAuto) {
      // 2. Create version history entry only on manual save
      await supabase.from('email_template_versions').insert({
        template_id: selectedTemplateId,
        subject: subjectRef.current,
        html_content: contentRef.current,
        text_content: contentRef.current
      });
      fetchVersions(selectedTemplateId);
      
      toast({
        title: "Success",
        description: "Template saved successfully",
      });
    }
  };

  const handleManualSave = async () => {
    setLoading(true);
    try {
      await saveTemplate(false);
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

  const handleRestoreVersion = (version: any) => {
    if (confirm('Are you sure you want to restore this version? Current changes will be lost.')) {
      setSubject(version.subject);
      setContent(version.html_content);
      toast({ title: "Version Restored", description: `Restored version from ${new Date(version.created_at).toLocaleString()}` });
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
      let testSubject = subject
        .replace('{{orderId}}', '12345678')
        .replace('{{customerName}}', 'Test Customer')
        .replace('{{status}}', 'processing');
        
      let testBody = content
        .replace('{{orderId}}', '12345678')
        .replace('{{customerName}}', 'Test Customer')
        .replace('{{status}}', 'processing');

      const htmlContent = getEmailTemplate(testSubject, testBody);

      const { data, error } = await supabase.functions.invoke('send-bulk-email', {
        body: {
          subject: testSubject,
          htmlContent,
          textContent: testBody,
          recipientFilter: 'test',
          testEmail
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Editor</CardTitle>
              <CardDescription>Customize the email content.</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isAutoSaving && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>}
              {!isAutoSaving && lastSaved && <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Saved {lastSaved.toLocaleTimeString()}</span>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="flex gap-2">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setShowHistory(!showHistory)} title="Version History">
                <History className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showHistory && versions.length > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <Label className="text-xs mb-2 block">Version History</Label>
                <ScrollArea className="h-[100px]">
                  <div className="space-y-1">
                    {versions.map((v) => (
                      <div key={v.id} className="flex justify-between items-center text-xs p-2 hover:bg-background rounded border cursor-pointer" onClick={() => handleRestoreVersion(v)}>
                        <span>{new Date(v.created_at).toLocaleString()}</span>
                        <Badge variant="outline">Restore</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

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
            <RichTextEditor 
              content={content} 
              onChange={setContent} 
            />
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <p>Variables:</p>
              <div className="flex gap-2 flex-wrap">
                <code className="bg-muted px-1 py-0.5 rounded cursor-pointer hover:bg-muted-foreground/20" onClick={() => setContent(c => c + ' {{customerName}}')}>{'{{customerName}}'}</code>
                <code className="bg-muted px-1 py-0.5 rounded cursor-pointer hover:bg-muted-foreground/20" onClick={() => setContent(c => c + ' {{orderId}}')}>{'{{orderId}}'}</code>
                <code className="bg-muted px-1 py-0.5 rounded cursor-pointer hover:bg-muted-foreground/20" onClick={() => setContent(c => c + ' {{status}}')}>{'{{status}}'}</code>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input 
                  placeholder="Test email" 
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="max-w-[200px]"
                />
                <Button variant="outline" size="icon" onClick={handleSendTest} disabled={sendingTest || !testEmail}>
                  {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
             </div>
             <Button onClick={handleManualSave} disabled={loading} className="w-full sm:w-auto">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
             </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-dashed">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Live Preview</CardTitle>
            <div className="flex items-center bg-background border rounded-lg p-1">
              <Button 
                variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setPreviewDevice('desktop')}
              >
                <Monitor className="h-4 w-4 mr-1" /> Desktop
              </Button>
              <Button 
                variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setPreviewDevice('mobile')}
              >
                <Smartphone className="h-4 w-4 mr-1" /> Mobile
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-4 bg-slate-100 dark:bg-black/20 overflow-hidden">
          <div 
            className={`bg-white shadow-xl transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${
              previewDevice === 'mobile' 
                ? 'w-[375px] h-[667px] rounded-[30px] border-[8px] border-slate-800' 
                : 'w-full max-w-[800px] h-[600px] rounded-lg border'
            }`}
          >
            {previewDevice === 'mobile' && (
              <div className="h-6 bg-slate-800 w-full flex justify-center">
                <div className="h-4 w-32 bg-black rounded-b-xl"></div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto bg-white">
               <div dangerouslySetInnerHTML={{ 
                 __html: getEmailTemplate(
                   subject.replace(/{{.*?}}/g, '...'), 
                   content
                    .replace(/{{customerName}}/g, 'John Doe')
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
