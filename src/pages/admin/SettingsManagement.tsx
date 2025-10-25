import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Mail, Users, FileText } from 'lucide-react';

// --- Sub-components for SettingsManagement ---

// 1. Terms & Conditions Management
function TermsAndConditionsManager() {
  const T_AND_C_KEY = 'terms_and_conditions';
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTandC();
  }, []);

  const loadTandC = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', T_AND_C_KEY)
      .maybeSingle();

    if (data?.value && typeof data.value === 'object' && 'content' in data.value) {
      setContent(data.value.content as string);
    } else if (!error) {
      // If no entry exists, create one
      const { data: newData } = await supabase
        .from('app_config')
        .insert({
          key: T_AND_C_KEY, 
          value: { content: "By proceeding with checkout, you agree to Sentra Perfumes' Terms of Service, including our shipping and returns policies. All sales are final on discounted items. Please allow 3-5 business days for processing and shipping." },
          description: 'The content for the checkout terms and conditions.'
        })
        .select('value')
        .single();
      
      if (newData?.value && typeof newData.value === 'object' && 'content' in newData.value) {
        setContent(newData.value.content as string);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const newValue = { content };

    const { error } = await supabase
      .from('app_config')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('key', T_AND_C_KEY);
      
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Terms and Conditions updated successfully.' });
    }
    setIsSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">This content is displayed to users during the checkout process.</p>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={15}
        placeholder="Enter the full Terms and Conditions text here..."
      />
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </div>
  );
}

// 2. Email Template Management
function EmailTemplateManager() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      setCurrentTemplate(template);
    } else {
      setCurrentTemplate(null);
    }
  }, [selectedTemplateId, templates]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('template_id');

    if (data) {
      setTemplates(data);
      if (data.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(data[0].id);
      }
    }
    setLoading(false);
    if (error) {
      toast({ title: 'Error loading templates', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdate = (field: string, value: string) => {
    setCurrentTemplate((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!currentTemplate) return;
    setIsSaving(true);
    
    const { id, subject, html_content, text_content } = currentTemplate;
    
    const { error } = await supabase
      .from('email_templates')
      .update({ subject, html_content, text_content, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      await loadTemplates();
      toast({ title: 'Success', description: `Template ${currentTemplate.template_id} updated.` });
    }
    setIsSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <Label>Select Email Template</Label>
        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
          <SelectTrigger>
            <Mail className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select an email template..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.template_id} - {template.subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {currentTemplate && (
        <div className="space-y-4">
          <div>
            <Label>Template ID (read-only)</Label>
            <Input value={currentTemplate.template_id} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground mt-1">Variables: {JSON.stringify(currentTemplate.variables)}</p>
          </div>

          <div>
            <Label>Subject</Label>
            <Input 
              value={currentTemplate.subject} 
              onChange={(e) => handleUpdate('subject', e.target.value)} 
            />
          </div>

          <div>
            <Label>HTML Content</Label>
            <Textarea
              value={currentTemplate.html_content}
              onChange={(e) => handleUpdate('html_content', e.target.value)}
              rows={10}
            />
          </div>
          
          <div>
            <Label>Plain Text Content (Optional)</Label>
            <Textarea
              value={currentTemplate.text_content || ''}
              onChange={(e) => handleUpdate('text_content', e.target.value)}
              rows={5}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Template'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// 3. User & Role Management
function UserRoleManager() {
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<any>(null);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState('admin'); 
  const [isLoading, setIsLoading] = useState(false);
  const allRoles = ['admin', 'product_manager', 'order_processor']; 

  const handleSearch = async () => {
    setIsLoading(true);
    setUser(null);
    setCurrentRoles([]);

    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email)
      .maybeSingle();

    if (userError || !userData) {
      toast({ title: 'Error', description: 'User not found or you lack permissions.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.id);

    if (rolesData) {
      const roles = rolesData.map(r => r.role);
      setCurrentRoles(roles);
      setUser(userData);
    }
    setIsLoading(false);
  };

  const handleAssignRole = async () => {
    if (!user || currentRoles.includes(newRole)) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('user_roles')
      .insert([{
        user_id: user.id,
        role: newRole as 'admin' | 'product_manager' | 'order_processor'
      }])
      .select()
      .single();

    if (error) {
      toast({ title: 'Error assigning role', description: error.message, variant: 'destructive' });
    } else {
      setCurrentRoles([...currentRoles, newRole]);
      toast({ title: 'Success', description: `${newRole} role assigned to ${user.email}.` });
    }
    setIsLoading(false);
  };

  const handleRemoveRole = async (roleToRemove: string) => {
    if (!user || !currentRoles.includes(roleToRemove)) return; 
    setIsLoading(true);

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)
      .eq('role', roleToRemove as 'admin' | 'product_manager' | 'order_processor');
    
    if (error) {
      toast({ title: 'Error removing role', description: error.message, variant: 'destructive' });
    } else {
      setCurrentRoles(currentRoles.filter(r => r !== roleToRemove));
      toast({ title: 'Success', description: `${roleToRemove} role removed from ${user.email}.` });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Search User by Email</Label>
        <div className="flex space-x-2">
          <Input 
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <Button onClick={handleSearch} disabled={isLoading || !email}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>
      </div>

      {user && (
        <Card className="p-4 space-y-4">
          <CardTitle className="text-xl">User: {user.full_name || 'N/A'} ({user.email})</CardTitle>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Current Roles:</h4>
            <div className="flex flex-wrap gap-2">
              {currentRoles.length === 0 ? (
                <span className="text-sm text-muted-foreground">No special roles assigned</span>
              ) : (
                currentRoles.map(role => (
                  <div key={role} className="flex items-center space-x-2 rounded-full px-3 py-1 bg-muted">
                    <span className="capitalize text-sm">{role.replace('_', ' ')}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-4 w-4 p-0 text-xs text-destructive hover:bg-transparent" 
                      onClick={() => handleRemoveRole(role)}
                      disabled={isLoading}
                    >
                      &times;
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Assign New Role:</h4>
            <div className="flex space-x-2">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {allRoles
                    .filter(role => !currentRoles.includes(role)) 
                    .map(role => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignRole} disabled={isLoading || !newRole || currentRoles.includes(newRole)}>
                <Plus className="h-4 w-4 mr-2" /> Assign
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// --- Main Component ---
export default function SettingsManagement() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Settings</h1>
      
      <Card>
        <Tabs defaultValue="roles" className="w-full">
          <CardHeader className="p-0">
            <TabsList className="grid w-full grid-cols-3 h-auto rounded-none border-b bg-transparent p-0">
              <TabsTrigger value="roles" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Users className="h-4 w-4 mr-2" /> User Roles
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Mail className="h-4 w-4 mr-2" /> Email Templates
              </TabsTrigger>
              <TabsTrigger value="terms" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <FileText className="h-4 w-4 mr-2" /> T&C
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="roles" className="p-6">
            <UserRoleManager />
          </TabsContent>
          
          <TabsContent value="templates" className="p-6">
            <EmailTemplateManager />
          </TabsContent>

          <TabsContent value="terms" className="p-6">
            <TermsAndConditionsManager />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
