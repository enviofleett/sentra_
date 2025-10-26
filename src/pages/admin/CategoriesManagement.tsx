import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

interface ScentProfile {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [scentProfiles, setScentProfiles] = useState<ScentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingScentProfile, setEditingScentProfile] = useState<ScentProfile | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isScentDialogOpen, setIsScentDialogOpen] = useState(false);
  const [scentFormData, setScentFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchCategories();
    fetchScentProfiles();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      toast.error('Failed to load categories');
      console.error(error);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const fetchScentProfiles = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const categoryData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      image_url: formData.get('image_url') as string || null,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', editingCategory.id);

      if (error) {
        toast.error('Failed to update category');
        console.error(error);
      } else {
        toast.success('Category updated successfully');
        setIsCategoryDialogOpen(false);
        fetchCategories();
      }
    } else {
      const { error } = await supabase
        .from('categories')
        .insert([categoryData]);

      if (error) {
        toast.error('Failed to create category');
        console.error(error);
      } else {
        toast.success('Category created successfully');
        setIsCategoryDialogOpen(false);
        fetchCategories();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete category');
      console.error(error);
    } else {
      toast.success('Category deleted successfully');
      fetchCategories();
    }
  };

  const openDialog = (category?: Category) => {
    setEditingCategory(category || null);
    setIsCategoryDialogOpen(true);
  };

  const handleScentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingScentProfile) {
      const { error } = await supabase
        .from('scent_profiles')
        .update(scentFormData)
        .eq('id', editingScentProfile.id);

      if (error) {
        toast.error('Failed to update scent profile');
        console.error(error);
      } else {
        toast.success('Scent profile updated successfully');
        resetScentForm();
        fetchScentProfiles();
      }
    } else {
      const { error } = await supabase
        .from('scent_profiles')
        .insert([scentFormData]);

      if (error) {
        toast.error('Failed to create scent profile');
        console.error(error);
      } else {
        toast.success('Scent profile created successfully');
        resetScentForm();
        fetchScentProfiles();
      }
    }
  };

  const handleScentDelete = async (id: string) => {
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
      fetchScentProfiles();
    }
  };

  const resetScentForm = () => {
    setScentFormData({
      name: '',
      description: '',
      is_active: true,
      display_order: 0,
    });
    setEditingScentProfile(null);
    setIsScentDialogOpen(false);
  };

  const startScentEdit = (profile: ScentProfile) => {
    setEditingScentProfile(profile);
    setScentFormData({
      name: profile.name,
      description: profile.description || '',
      is_active: profile.is_active,
      display_order: profile.display_order,
    });
    setIsScentDialogOpen(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Categories & Scent Profiles</h2>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="scents">Scent Profiles</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Manage Categories</h3>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Category Name</Label>
                      <Input id="name" name="name" defaultValue={editingCategory?.name} required />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" defaultValue={editingCategory?.description || ''} />
                    </div>
                    <div>
                      <Label htmlFor="image_url">Image URL</Label>
                      <Input id="image_url" name="image_url" defaultValue={editingCategory?.image_url || ''} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
                      <Button type="submit">{editingCategory ? 'Update' : 'Create'}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Categories ({categories.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{category.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDialog(category)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(category.id)}>
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
        </TabsContent>

        <TabsContent value="scents">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Manage Scent Profiles</h3>
              <Dialog open={isScentDialogOpen} onOpenChange={setIsScentDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetScentForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scent Profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingScentProfile ? 'Edit Scent Profile' : 'Add Scent Profile'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleScentSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="scent-name">Name *</Label>
                      <Input
                        id="scent-name"
                        value={scentFormData.name}
                        onChange={(e) => setScentFormData({ ...scentFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="scent-description">Description</Label>
                      <Textarea
                        id="scent-description"
                        value={scentFormData.description}
                        onChange={(e) => setScentFormData({ ...scentFormData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="scent-display-order">Display Order</Label>
                      <Input
                        id="scent-display-order"
                        type="number"
                        value={scentFormData.display_order}
                        onChange={(e) => setScentFormData({ ...scentFormData, display_order: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="scent-is-active"
                        checked={scentFormData.is_active}
                        onCheckedChange={(checked) => setScentFormData({ ...scentFormData, is_active: checked })}
                      />
                      <Label htmlFor="scent-is-active">Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingScentProfile ? 'Update' : 'Create'}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetScentForm} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Scent Profiles ({scentProfiles.length})</CardTitle>
              </CardHeader>
              <CardContent>
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
                                onClick={() => startScentEdit(profile)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleScentDelete(profile.id)}
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
