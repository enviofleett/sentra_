import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Category {
  id: string;
  name: string;
}

interface DiscountThreshold {
  id: string;
  name: string;
  type: 'quantity' | 'value';
  target_id: string | null;
  target_type: 'global' | 'product' | 'category';
  threshold: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type FormData = Omit<DiscountThreshold, 'id' | 'created_at' | 'updated_at'>;

const emptyThreshold: FormData = {
  name: '',
  type: 'quantity',
  target_id: null,
  target_type: 'global',
  threshold: 10,
  discount_type: 'percentage',
  discount_value: 10,
  is_active: true,
};

export default function DiscountThresholdsManagement() {
  const [thresholds, setThresholds] = useState<DiscountThreshold[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingThreshold, setEditingThreshold] = useState<DiscountThreshold | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyThreshold);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [thresholdsRes, productsRes, categoriesRes] = await Promise.all([
        supabase.from('discount_thresholds').select('*').order('threshold', { ascending: true }),
        supabase.from('products').select('id, name, price').eq('is_active', true),
        supabase.from('categories').select('id, name'),
      ]);

      setThresholds((thresholdsRes.data as DiscountThreshold[]) || []);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      toast.error('Failed to load discount data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
  };
  
  const handleSelectChange = (name: keyof FormData, value: string | boolean) => {
    setFormData(prev => {
      const newForm = { ...prev, [name]: value };
      
      if (name === 'target_type' && value === 'global') {
        newForm.target_id = null;
      }
      
      return newForm;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      threshold: Number(formData.threshold),
      discount_value: Number(formData.discount_value),
      target_id: formData.target_type === 'global' ? null : formData.target_id,
    };

    if (payload.target_type !== 'global' && !payload.target_id) {
      toast.error('A target Product or Category must be selected.');
      return;
    }
    
    try {
      if (editingThreshold) {
        const { error } = await supabase
          .from('discount_thresholds')
          .update(payload)
          .eq('id', editingThreshold.id);

        if (error) throw error;
        toast.success('Discount threshold updated successfully');
      } else {
        const { error } = await supabase
          .from('discount_thresholds')
          .insert([payload]);

        if (error) throw error;
        toast.success('Discount threshold created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount threshold?')) return;

    const { error } = await supabase.from('discount_thresholds').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete threshold');
      console.error(error);
    } else {
      toast.success('Threshold deleted successfully');
      fetchData();
    }
  };

  const openDialog = (threshold?: DiscountThreshold) => {
    setEditingThreshold(threshold || null);
    setFormData(threshold ? {
      name: threshold.name,
      type: threshold.type,
      target_id: threshold.target_id,
      target_type: threshold.target_type,
      threshold: threshold.threshold,
      discount_type: threshold.discount_type,
      discount_value: threshold.discount_value,
      is_active: threshold.is_active,
    } : emptyThreshold);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(emptyThreshold);
    setEditingThreshold(null);
  };
  
  const getTargetName = (threshold: DiscountThreshold) => {
    if (threshold.target_type === 'global') return 'Global (Cart Total)';
    if (threshold.target_type === 'product' && threshold.target_id) {
      return `Product: ${products.find(p => p.id === threshold.target_id)?.name || 'Unknown'}`;
    }
    if (threshold.target_type === 'category' && threshold.target_id) {
      return `Category: ${categories.find(c => c.id === threshold.target_id)?.name || 'Unknown'}`;
    }
    return 'N/A';
  };
  
  if (loading) return <div className="flex items-center justify-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discount Thresholds</h1>
          <p className="text-muted-foreground">Set up tiered discounts based on quantity or cart value.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Threshold
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingThreshold ? 'Edit' : 'Add'} Discount Threshold</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Discount Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleFormChange} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Type</Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(value) => handleSelectChange('target_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (Cart Total)</SelectItem>
                      <SelectItem value="product">Specific Product</SelectItem>
                      <SelectItem value="category">Product Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Threshold Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleSelectChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quantity">Quantity</SelectItem>
                      <SelectItem value="value">Total Value (₦)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.target_type !== 'global' && (
                <div className="space-y-2">
                  <Label>{formData.target_type === 'product' ? 'Product' : 'Category'} Target</Label>
                  <Select
                    value={formData.target_id || ''}
                    onValueChange={(value) => handleSelectChange('target_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select target ${formData.target_type}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.target_type === 'product' ? products : categories).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="threshold">Threshold ({formData.type === 'quantity' ? 'units' : '₦'})</Label>
                  <Input
                    id="threshold"
                    name="threshold"
                    type="number"
                    min="1"
                    step={formData.type === 'value' ? "0.01" : "1"}
                    value={formData.threshold}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value) => handleSelectChange('discount_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₦)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="discount_value">Discount Value ({formData.discount_type === 'percentage' ? '%' : '₦'})</Label>
                <Input
                  id="discount_value"
                  name="discount_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleSelectChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">
                  {editingThreshold ? 'Update' : 'Create'} Threshold
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Discount Thresholds ({thresholds.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thresholds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No discount thresholds configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                thresholds.map((threshold) => (
                  <TableRow key={threshold.id}>
                    <TableCell className="font-medium">{threshold.name}</TableCell>
                    <TableCell>{getTargetName(threshold)}</TableCell>
                    <TableCell>
                      {threshold.type === 'quantity' ? `${threshold.threshold} units` : `₦${Number(threshold.threshold).toLocaleString()}`}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {threshold.discount_type === 'percentage' ? `${threshold.discount_value}% OFF` : `₦${Number(threshold.discount_value).toLocaleString()} OFF`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={threshold.is_active ? 'default' : 'secondary'}>
                        {threshold.is_active ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDialog(threshold)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(threshold.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
