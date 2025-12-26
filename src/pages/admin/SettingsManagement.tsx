import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Mail, Users, FileText, Image as ImageIcon, Link, Rocket, Upload, PieChart, TrendingUp } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';

// --- Sub-components for SettingsManagement ---

// 0. Pre-Launch Settings Manager
function PreLaunchSettingsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState({
    id: '',
    is_prelaunch_mode: true,
    waitlist_reward_amount: 100000,
    launch_date: '',
    banner_image_url: '',
    banner_title: '',
    banner_subtitle: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pre_launch_settings')
      .select('*')
      .maybeSingle();

    if (data) {
      setSettings({
        id: data.id,
        is_prelaunch_mode: data.is_prelaunch_mode ?? true,
        waitlist_reward_amount: data.waitlist_reward_amount ?? 100000,
        launch_date: data.launch_date ? new Date(data.launch_date).toISOString().slice(0, 16) : '',
        banner_image_url: data.banner_image_url ?? '',
        banner_title: data.banner_title ?? '',
        banner_subtitle: data.banner_subtitle ?? ''
      });
    }
    if (error) {
      toast({ title: 'Error loading settings', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('pre_launch_settings')
      .update({
        is_prelaunch_mode: settings.is_prelaunch_mode,
        waitlist_reward_amount: settings.waitlist_reward_amount,
        launch_date: settings.launch_date ? new Date(settings.launch_date).toISOString() : null,
        banner_image_url: settings.banner_image_url || null,
        banner_title: settings.banner_title || null,
        banner_subtitle: settings.banner_subtitle || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', settings.id);

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Pre-launch settings updated.' });
    }
    setSaving(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `waitlist-banner-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('branding')
      .getPublicUrl(filePath);

    setSettings({ ...settings, banner_image_url: publicUrl });
    setUploading(false);
    toast({ title: 'Banner uploaded', description: 'Remember to save your changes.' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pre-Launch Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
        <div>
          <h3 className="font-semibold text-foreground">Pre-Launch Mode</h3>
          <p className="text-sm text-muted-foreground">
            When enabled, visitors see the waitlist page instead of the store
          </p>
        </div>
        <Switch
          checked={settings.is_prelaunch_mode}
          onCheckedChange={(checked) => setSettings({ ...settings, is_prelaunch_mode: checked })}
        />
      </div>

      {/* Launch Date */}
      <div className="space-y-2">
        <Label htmlFor="launch-date">Launch Date & Time</Label>
        <Input
          id="launch-date"
          type="datetime-local"
          value={settings.launch_date}
          onChange={(e) => setSettings({ ...settings, launch_date: e.target.value })}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          A countdown timer will appear on the waitlist page
        </p>
      </div>

      {/* Reward Amount */}
      <div className="space-y-2">
        <Label htmlFor="reward-amount">Waitlist Reward Amount (₦)</Label>
        <Input
          id="reward-amount"
          type="number"
          value={settings.waitlist_reward_amount}
          onChange={(e) => setSettings({ ...settings, waitlist_reward_amount: parseFloat(e.target.value) || 0 })}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Amount credited to verified waitlist signups
        </p>
      </div>

      {/* Banner Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Waitlist Page Banner</h3>
        
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="banner-title">Banner Title</Label>
            <Input
              id="banner-title"
              value={settings.banner_title}
              onChange={(e) => setSettings({ ...settings, banner_title: e.target.value })}
              placeholder="Sentra"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-subtitle">Banner Subtitle</Label>
            <Input
              id="banner-subtitle"
              value={settings.banner_subtitle}
              onChange={(e) => setSettings({ ...settings, banner_subtitle: e.target.value })}
              placeholder="Nigeria's Premier Fragrance Boutique"
            />
          </div>

          <div className="space-y-2">
            <Label>Banner Background Image</Label>
            <div className="flex items-center gap-4">
              {settings.banner_image_url && (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border">
                  <img 
                    src={settings.banner_image_url} 
                    alt="Banner preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: 1920x1080px, JPG or PNG
                </p>
              </div>
            </div>
            {settings.banner_image_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettings({ ...settings, banner_image_url: '' })}
                className="text-destructive hover:text-destructive"
              >
                Remove Image
              </Button>
            )}
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="mt-4">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Pre-Launch Settings'
        )}
      </Button>
    </div>
  );
}

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
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    template_id: '',
    name: '',
    subject: '',
    html_content: '',
    text_content: ''
  });

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

  const handleCreateTemplate = async () => {
    if (!newTemplate.template_id || !newTemplate.name || !newTemplate.subject || !newTemplate.html_content) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from('email_templates')
      .insert([newTemplate])
      .select()
      .single();

    if (error) {
      toast({ title: 'Error creating template', description: error.message, variant: 'destructive' });
    } else {
      await loadTemplates();
      setSelectedTemplateId(data.id);
      setIsCreating(false);
      setNewTemplate({ template_id: '', name: '', subject: '', html_content: '', text_content: '' });
      toast({ title: 'Success', description: `Template ${newTemplate.template_id} created.` });
    }
    setIsSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <Label>Select Email Template</Label>
          <Select value={selectedTemplateId} onValueChange={(val) => { setSelectedTemplateId(val); setIsCreating(false); }}>
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
        <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "secondary" : "default"}>
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? 'Cancel' : 'New Template'}
        </Button>
      </div>

      {isCreating ? (
        <Card className="p-4 space-y-4 border-dashed border-2">
          <h3 className="font-semibold text-lg">Create New Email Template</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Template ID *</Label>
              <Input 
                value={newTemplate.template_id}
                onChange={(e) => setNewTemplate({...newTemplate, template_id: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                placeholder="e.g., ORDER_CONFIRMATION"
              />
              <p className="text-xs text-muted-foreground mt-1">Used in code to reference this template</p>
            </div>
            <div>
              <Label>Name *</Label>
              <Input 
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="e.g., Order Confirmation Email"
              />
            </div>
          </div>

          <div>
            <Label>Subject *</Label>
            <Input 
              value={newTemplate.subject}
              onChange={(e) => setNewTemplate({...newTemplate, subject: e.target.value})}
              placeholder="e.g., Your order has been confirmed!"
            />
            <p className="text-xs text-muted-foreground mt-1">Use {"{{variable}}"} for dynamic content</p>
          </div>

          <div>
            <Label>HTML Content *</Label>
            <Textarea
              value={newTemplate.html_content}
              onChange={(e) => setNewTemplate({...newTemplate, html_content: e.target.value})}
              rows={10}
              placeholder="Enter HTML email template content..."
            />
          </div>
          
          <div>
            <Label>Plain Text Content (Optional)</Label>
            <Textarea
              value={newTemplate.text_content}
              onChange={(e) => setNewTemplate({...newTemplate, text_content: e.target.value})}
              rows={5}
              placeholder="Plain text version for email clients that don't support HTML"
            />
          </div>

          <Button onClick={handleCreateTemplate} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Template'
            )}
          </Button>
        </Card>
      ) : currentTemplate && (
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
        role: newRole as 'admin' | 'product_manager' | 'moderator' | 'user'
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
      .eq('role', roleToRemove as 'admin' | 'product_manager' | 'moderator' | 'user');
    
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

// 4. Branding Manager
function BrandingManager() {
  const { logoUrl, faviconUrl, refreshBranding } = useBranding();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [faviconPreview, setFaviconPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Error', description: 'Logo file must be less than 2MB', variant: 'destructive' });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        toast({ title: 'Error', description: 'Favicon file must be less than 1MB', variant: 'destructive' });
        return;
      }
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('branding')
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('branding')
      .getPublicUrl(path);

    return publicUrl;
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setIsUploading(true);

    try {
      const fileName = `logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
      const publicUrl = await uploadFile(logoFile, fileName);

      await supabase
        .from('app_config')
        .update({ value: publicUrl })
        .eq('key', 'branding_logo_url');

      await refreshBranding();
      toast({ title: 'Success', description: 'Logo uploaded successfully' });
      setLogoFile(null);
      setLogoPreview('');
    } catch (error: any) {
      toast({ title: 'Error uploading logo', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadFavicon = async () => {
    if (!faviconFile) return;
    setIsUploading(true);

    try {
      const fileName = `favicon-${Date.now()}.${faviconFile.name.split('.').pop()}`;
      const publicUrl = await uploadFile(faviconFile, fileName);

      await supabase
        .from('app_config')
        .update({ value: publicUrl })
        .eq('key', 'branding_favicon_url');

      await refreshBranding();
      toast({ title: 'Success', description: 'Favicon uploaded successfully' });
      setFaviconFile(null);
      setFaviconPreview('');
    } catch (error: any) {
      toast({ title: 'Error uploading favicon', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Application Logo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a logo image (max 2MB). Recommended dimensions: 330px × 70.4px
          </p>
          
          {logoUrl && !logoPreview && (
            <div className="mb-4 p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Current Logo:</p>
              <img src={logoUrl} alt="Current Logo" style={{ width: '330px', height: '70.4px' }} className="object-contain" />
            </div>
          )}

          {logoPreview && (
            <div className="mb-4 p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <img src={logoPreview} alt="Logo Preview" style={{ width: '330px', height: '70.4px' }} className="object-contain" />
            </div>
          )}

          <div className="flex gap-2">
            <Input 
              type="file" 
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleLogoChange}
              disabled={isUploading}
            />
            <Button onClick={handleUploadLogo} disabled={!logoFile || isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload Logo'}
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Favicon</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a favicon image (max 1MB). Recommended: .ico or .png file, 32px × 32px
          </p>
          
          {faviconUrl && !faviconPreview && (
            <div className="mb-4 p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Current Favicon:</p>
              <img src={faviconUrl} alt="Current Favicon" className="h-8 w-8 object-contain" />
            </div>
          )}

          {faviconPreview && (
            <div className="mb-4 p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <img src={faviconPreview} alt="Favicon Preview" className="h-8 w-8 object-contain" />
            </div>
          )}

          <div className="flex gap-2">
            <Input 
              type="file" 
              accept="image/x-icon,image/png"
              onChange={handleFaviconChange}
              disabled={isUploading}
            />
            <Button onClick={handleUploadFavicon} disabled={!faviconFile || isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload Favicon'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. Integration Settings Manager (Callback URLs, etc.)
function IntegrationSettingsManager() {
  const CALLBACK_URL_KEY = 'live_callback_url';
  const [callbackUrl, setCallbackUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCallbackUrl();
  }, []);

  const loadCallbackUrl = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', CALLBACK_URL_KEY)
      .maybeSingle();

    if (data?.value && typeof data.value === 'object' && 'url' in data.value) {
      setCallbackUrl(data.value.url as string);
    } else if (!error && !data) {
      // If no entry exists, create one with empty URL
      await supabase
        .from('app_config')
        .insert({
          key: CALLBACK_URL_KEY, 
          value: { url: '' },
          description: 'The live callback URL for Paystack payment redirects. Used for group buy and checkout flows.'
        });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Validate URL format if not empty
    if (callbackUrl && !callbackUrl.startsWith('https://')) {
      toast({ title: 'Invalid URL', description: 'Callback URL must start with https://', variant: 'destructive' });
      setIsSaving(false);
      return;
    }

    const newValue = { url: callbackUrl.trim() };

    // Try update first, then insert if not exists
    const { data: existing } = await supabase
      .from('app_config')
      .select('id')
      .eq('key', CALLBACK_URL_KEY)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('app_config')
        .update({ value: newValue, updated_at: new Date().toISOString() })
        .eq('key', CALLBACK_URL_KEY);
      error = result.error;
    } else {
      const result = await supabase
        .from('app_config')
        .insert({ 
          key: CALLBACK_URL_KEY, 
          value: newValue,
          description: 'The live callback URL for Paystack payment redirects.'
        });
      error = result.error;
    }
      
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Callback URL updated successfully.' });
    }
    setIsSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Paystack Callback URL</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Set the base URL for Paystack payment callbacks. This is the domain your customers will be redirected to after completing payment.
            Leave empty to use the default APP_BASE_URL environment variable.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="callback-url">Live Callback URL</Label>
            <Input
              id="callback-url"
              type="url"
              placeholder="https://yourdomain.com"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: https://sentra.ng — Do not include trailing slashes or paths.
            </p>
          </div>
        </div>

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

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-2">Webhook Configuration</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The Paystack Webhook URL must be configured in your Paystack Dashboard. Copy the URL below and set it in 
          <strong> Paystack Dashboard → Settings → API Keys & Webhooks → Live Webhook URL</strong>.
        </p>
        
        <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
          https://oczsddmantovkqfwczqk.supabase.co/functions/v1/paystack-webhook
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This URL receives payment notifications from Paystack and cannot be changed dynamically.
        </p>
      </div>
    </div>
  );
}

// 7. Profit Split Manager
function ProfitSplitManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    id: '',
    name: 'Default Split',
    capital_percentage: 40,
    admin_percentage: 20,
    growth_percentage: 25,
    marketing_percentage: 15
  });
  const [totals, setTotals] = useState({
    total_capital: 0,
    total_admin: 0,
    total_growth: 0,
    total_marketing: 0,
    total_revenue: 0,
    transaction_count: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Load config
    const { data: configData, error: configError } = await supabase
      .from('profit_split_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configData) {
      setConfig({
        id: configData.id,
        name: configData.name,
        capital_percentage: Number(configData.capital_percentage),
        admin_percentage: Number(configData.admin_percentage),
        growth_percentage: Number(configData.growth_percentage),
        marketing_percentage: Number(configData.marketing_percentage)
      });
    }

    // Load totals
    const { data: totalsData, error: totalsError } = await supabase
      .from('profit_bucket_totals')
      .select('*')
      .single();

    if (totalsData) {
      setTotals({
        total_capital: Number(totalsData.total_capital) || 0,
        total_admin: Number(totalsData.total_admin) || 0,
        total_growth: Number(totalsData.total_growth) || 0,
        total_marketing: Number(totalsData.total_marketing) || 0,
        total_revenue: Number(totalsData.total_revenue) || 0,
        transaction_count: Number(totalsData.transaction_count) || 0
      });
    }

    if (configError) {
      toast({ title: 'Error loading config', description: configError.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const totalPercentage = config.capital_percentage + config.admin_percentage + config.growth_percentage + config.marketing_percentage;
  const isValidTotal = totalPercentage === 100;

  const handleSave = async () => {
    if (!isValidTotal) {
      toast({ title: 'Invalid percentages', description: 'Percentages must sum to exactly 100%', variant: 'destructive' });
      return;
    }

    setSaving(true);

    if (config.id) {
      const { error } = await supabase
        .from('profit_split_config')
        .update({
          name: config.name,
          capital_percentage: config.capital_percentage,
          admin_percentage: config.admin_percentage,
          growth_percentage: config.growth_percentage,
          marketing_percentage: config.marketing_percentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) {
        toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Profit split configuration updated.' });
      }
    } else {
      const { data, error } = await supabase
        .from('profit_split_config')
        .insert([{
          name: config.name,
          capital_percentage: config.capital_percentage,
          admin_percentage: config.admin_percentage,
          growth_percentage: config.growth_percentage,
          marketing_percentage: config.marketing_percentage,
          is_active: true
        }])
        .select()
        .single();

      if (error) {
        toast({ title: 'Error creating', description: error.message, variant: 'destructive' });
      } else {
        setConfig({ ...config, id: data.id });
        toast({ title: 'Success', description: 'Profit split configuration created.' });
      }
    }

    setSaving(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bucket Totals */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Profit Bucket Totals
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-muted-foreground mb-1">Capital (Restocking)</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(totals.total_capital)}</p>
            <p className="text-xs text-muted-foreground">{config.capital_percentage}% of revenue</p>
          </div>
          
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm text-muted-foreground mb-1">Admin (Operations)</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(totals.total_admin)}</p>
            <p className="text-xs text-muted-foreground">{config.admin_percentage}% of revenue</p>
          </div>
          
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-muted-foreground mb-1">Growth (Expansion)</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totals.total_growth)}</p>
            <p className="text-xs text-muted-foreground">{config.growth_percentage}% of revenue</p>
          </div>
          
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm text-muted-foreground mb-1">Marketing (Ads)</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(totals.total_marketing)}</p>
            <p className="text-xs text-muted-foreground">{config.marketing_percentage}% of revenue</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue Processed</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.total_revenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold text-foreground">{totals.transaction_count}</p>
          </div>
        </div>
      </div>

      {/* Split Configuration */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Split Configuration
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config-name">Configuration Name</Label>
            <Input
              id="config-name"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              className="max-w-xs"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capital">Capital %</Label>
              <Input
                id="capital"
                type="number"
                min="0"
                max="100"
                value={config.capital_percentage}
                onChange={(e) => setConfig({ ...config, capital_percentage: parseFloat(e.target.value) || 0 })}
                className="bg-blue-500/5"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="admin">Admin %</Label>
              <Input
                id="admin"
                type="number"
                min="0"
                max="100"
                value={config.admin_percentage}
                onChange={(e) => setConfig({ ...config, admin_percentage: parseFloat(e.target.value) || 0 })}
                className="bg-purple-500/5"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="growth">Growth %</Label>
              <Input
                id="growth"
                type="number"
                min="0"
                max="100"
                value={config.growth_percentage}
                onChange={(e) => setConfig({ ...config, growth_percentage: parseFloat(e.target.value) || 0 })}
                className="bg-green-500/5"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="marketing">Marketing %</Label>
              <Input
                id="marketing"
                type="number"
                min="0"
                max="100"
                value={config.marketing_percentage}
                onChange={(e) => setConfig({ ...config, marketing_percentage: parseFloat(e.target.value) || 0 })}
                className="bg-orange-500/5"
              />
            </div>
          </div>

          <div className={`p-3 rounded-lg ${isValidTotal ? 'bg-green-500/10 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
            <p className="text-sm font-medium">
              Total: {totalPercentage}% {isValidTotal ? '✓' : '(must equal 100%)'}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || !isValidTotal}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---
export default function SettingsManagement() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Settings</h1>
      
      <Card>
        <Tabs defaultValue="prelaunch" className="w-full">
          <CardHeader className="p-0 overflow-x-auto">
            <TabsList className="grid w-full grid-cols-7 h-auto rounded-none border-b bg-transparent p-0 min-w-[700px]">
              <TabsTrigger value="prelaunch" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Rocket className="h-4 w-4 mr-2" /> Pre-Launch
              </TabsTrigger>
              <TabsTrigger value="profits" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <PieChart className="h-4 w-4 mr-2" /> Profits
              </TabsTrigger>
              <TabsTrigger value="roles" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Users className="h-4 w-4 mr-2" /> Roles
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Mail className="h-4 w-4 mr-2" /> Emails
              </TabsTrigger>
              <TabsTrigger value="terms" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <FileText className="h-4 w-4 mr-2" /> T&C
              </TabsTrigger>
              <TabsTrigger value="branding" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <ImageIcon className="h-4 w-4 mr-2" /> Branding
              </TabsTrigger>
              <TabsTrigger value="integrations" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Link className="h-4 w-4 mr-2" /> Integrations
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="prelaunch" className="p-6">
            <PreLaunchSettingsManager />
          </TabsContent>

          <TabsContent value="profits" className="p-6">
            <ProfitSplitManager />
          </TabsContent>

          <TabsContent value="roles" className="p-6">
            <UserRoleManager />
          </TabsContent>
          
          <TabsContent value="templates" className="p-6">
            <EmailTemplateManager />
          </TabsContent>

          <TabsContent value="terms" className="p-6">
            <TermsAndConditionsManager />
          </TabsContent>

          <TabsContent value="branding" className="p-6">
            <BrandingManager />
          </TabsContent>

          <TabsContent value="integrations" className="p-6">
            <IntegrationSettingsManager />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
