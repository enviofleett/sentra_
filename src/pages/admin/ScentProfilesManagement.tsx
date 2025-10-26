import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ScentProfile {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function ScentProfilesManagement() {
  const [scentProfiles, setScentProfiles] = useState<ScentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ScentProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    loadScentProfiles();
  }, []);

  const loadScentProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scent_profiles')
      .select('*')
      .order('display_order');

    if (error) {
      toast.error('Failed to load scent profiles');
      console.error(error);
    } else {
      setScentProfiles(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProfile) {
      const { error } = await supabase
        .from('scent_profiles')
        .update(formData)
        .eq('id', editingProfile.id);

      if (error) {
        toast.error('Failed to update scent profile');
        console.error(error);
      } else {
        toast.success('Scent profile updated successfully');
        resetForm();
        loadScentProfiles();
      }
    } else {
      const { error } = await supabase
        .from('scent_profiles')
        .insert([formData]);

      if (error) {
        toast.error('Failed to create scent profile');
        console.error(error);
      } else {
        toast.success('Scent profile created successfully');
        resetForm();
        loadScentProfiles();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scent profile?')) return;

    const { error } = await supabase
      .from('scent_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete scent profile');
      console.error(error);
    } else {
      toast.success('Scent profile deleted successfully');
      loadScentProfiles();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      display_order: 0,
    });
    setEditingProfile(null);
    setDialogOpen(false);
  };

  const startEdit = (profile: ScentProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || '',
      is_active: profile.is_active,
      display_order: profile.display_order,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Scent Profiles Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Scent Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProfile ? 'Edit Scent Profile' : 'Add Scent Profile'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingProfile ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scent Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scentProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium capitalize">{profile.name}</TableCell>
                      <TableCell className="hidden md:table-cell">{profile.description || '-'}</TableCell>
                      <TableCell>{profile.display_order}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${profile.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {profile.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(profile)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(profile.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
