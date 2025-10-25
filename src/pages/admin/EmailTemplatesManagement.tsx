import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface EmailTemplate {
  id: string;
  template_id: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  variables: any;
  created_at: string;
}

export function EmailTemplatesManagement() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('template_id');

    if (error) {
      toast.error('Failed to load templates');
      console.error(error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const templateData = {
      template_id: formData.get('template_id') as string,
      subject: formData.get('subject') as string,
      html_content: formData.get('html_content') as string,
      text_content: formData.get('text_content') as string || null,
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from('email_templates')
        .update(templateData)
        .eq('id', editingTemplate.id);

      if (error) {
        toast.error('Failed to update template');
        console.error(error);
      } else {
        toast.success('Template updated successfully');
        setIsDialogOpen(false);
        fetchTemplates();
      }
    } else {
      const { error } = await supabase
        .from('email_templates')
        .insert([templateData]);

      if (error) {
        toast.error('Failed to create template');
        console.error(error);
      } else {
        toast.success('Template created successfully');
        setIsDialogOpen(false);
        fetchTemplates();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete template');
      console.error(error);
    } else {
      toast.success('Template deleted successfully');
      fetchTemplates();
    }
  };

  const openDialog = (template?: EmailTemplate) => {
    setEditingTemplate(template || null);
    setIsDialogOpen(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Email Templates</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Add Template'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="template_id">Template ID</Label>
                <Input 
                  id="template_id" 
                  name="template_id" 
                  placeholder="e.g., ORDER_CONFIRMATION" 
                  defaultValue={editingTemplate?.template_id} 
                  required 
                  disabled={!!editingTemplate}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Use uppercase with underscores (e.g., ORDER_SHIPPED, PASSWORD_RESET)
                </p>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input 
                  id="subject" 
                  name="subject" 
                  placeholder="Use variables like {{customer_name}}" 
                  defaultValue={editingTemplate?.subject} 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="html_content">HTML Content</Label>
                <Textarea 
                  id="html_content" 
                  name="html_content" 
                  rows={10}
                  placeholder="Use variables like {{customer_name}}, {{order_id}}" 
                  defaultValue={editingTemplate?.html_content} 
                  required 
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Available variables: customer_name, order_id, total_amount, tracking_number
                </p>
              </div>
              <div>
                <Label htmlFor="text_content">Plain Text Content (Optional)</Label>
                <Textarea 
                  id="text_content" 
                  name="text_content" 
                  rows={5}
                  placeholder="Plain text version for email clients that don't support HTML" 
                  defaultValue={editingTemplate?.text_content || ''} 
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingTemplate ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-mono text-sm">{template.template_id}</TableCell>
                  <TableCell>{template.subject}</TableCell>
                  <TableCell>{new Date(template.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDialog(template)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
