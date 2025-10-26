import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Upload, X } from 'lucide-react';
import { ProductPerformanceChart } from '@/components/admin/ProductPerformanceChart';
import { TopProductsWidget } from '@/components/admin/TopProductsWidget';
import { getTopProductsByViews, getTopProductsByPurchases } from '@/utils/analytics';
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  category_id: string | null;
  vendor_id: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  scent_profile: string | null;
}
interface Category {
  id: string;
  name: string;
}
interface Vendor {
  id: string;
  rep_full_name: string;
  email: string;
}
export function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [topByViews, setTopByViews] = useState<any[]>([]);
  const [topByPurchases, setTopByPurchases] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const emptyProduct: Omit<Product, 'id'> = {
    name: '',
    description: '',
    price: 0,
    original_price: null,
    stock_quantity: 0,
    category_id: null,
    vendor_id: null,
    image_url: null,
    is_featured: false,
    is_active: true,
    scent_profile: null
  };
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchVendors();
    fetchAnalytics();
  }, []);
  useEffect(() => {
    fetchAnalytics();
  }, [period]);
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
      const [views, purchases] = await Promise.all([getTopProductsByViews(days, 10), getTopProductsByPurchases(days, 10)]);
      setTopByViews(views);
      setTopByPurchases(purchases);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };
  const fetchProducts = async () => {
    const {
      data,
      error
    } = await supabase.from('products').select('*').order('created_at', {
      ascending: false
    });
    if (error) {
      toast.error('Failed to load products');
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };
  const fetchCategories = async () => {
    const {
      data
    } = await supabase.from('categories').select('id, name').order('name');
    setCategories(data || []);
  };

  const fetchVendors = async () => {
    const { data } = await supabase
      .from('vendors')
      .select('id, rep_full_name, email')
      .order('rep_full_name');
    setVendors(data || []);
  };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('product-images').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload image');
        return null;
      }
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('product-images').getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    let imageUrl = editingProduct?.image_url || null;

    // Upload new image if selected
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        return; // Stop if upload failed
      }
    }
    const scentValue = formData.get('scent_profile') as string;
    const validScents = ['aquatic', 'citrus', 'floral', 'fresh', 'gourmand', 'oriental', 'spicy', 'woody'];
    const productData = {
      name: formData.get('name') as string,
      description: description,
      price: parseFloat(formData.get('price') as string),
      original_price: formData.get('original_price') ? parseFloat(formData.get('original_price') as string) : null,
      stock_quantity: parseInt(formData.get('stock_quantity') as string),
      category_id: formData.get('category_id') as string || null,
      vendor_id: formData.get('vendor_id') as string || null,
      image_url: imageUrl,
      is_featured: formData.get('is_featured') === 'true',
      is_active: formData.get('is_active') === 'true',
      scent_profile: (scentValue && validScents.includes(scentValue) ? scentValue : null) as any
    };
    if (editingProduct) {
      const {
        error
      } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
      if (error) {
        toast.error('Failed to update product');
        console.error(error);
      } else {
        toast.success('Product updated successfully');
        setIsDialogOpen(false);
        clearImage();
        fetchProducts();
      }
    } else {
      const {
        error
      } = await supabase.from('products').insert([productData]);
      if (error) {
        toast.error('Failed to create product');
        console.error(error);
      } else {
        toast.success('Product created successfully');
        setIsDialogOpen(false);
        clearImage();
        fetchProducts();
      }
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const {
      error
    } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete product');
      console.error(error);
    } else {
      toast.success('Product deleted successfully');
      fetchProducts();
    }
  };
  const openDialog = (product?: Product) => {
    setEditingProduct(product || null);
    setDescription(product?.description || '');
    clearImage();
    if (product?.image_url) {
      setImagePreview(product.image_url);
    }
    setIsDialogOpen(true);
  };
  if (loading) return <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-muted-foreground">Loading products...</p>
    </div>;
  return <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Product Management</h2>
        <p className="text-muted-foreground">Manage your product catalog and track performance</p>
      </div>

      {/* Analytics Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Product Management</h3>
          <div className="flex gap-2">
            <Button variant={period === 'today' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('today')}>
              Today
            </Button>
            <Button variant={period === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('week')}>
              This Week
            </Button>
            <Button variant={period === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('month')}>
              This Month
            </Button>
          </div>
        </div>

        {/* Top Products Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopProductsWidget products={topByViews} type="views" loading={analyticsLoading} />
          <TopProductsWidget products={topByPurchases} type="purchases" loading={analyticsLoading} />
        </div>

        {/* Performance Chart */}
        <ProductPerformanceChart viewsData={topByViews} purchasesData={topByPurchases} loading={analyticsLoading} />
      </div>

      {/* Products Table Section */}
      <div className="flex items-center justify-between pt-6 border-t">
        <h3 className="text-xl font-semibold">All Products</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" name="name" defaultValue={editingProduct?.name} required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <RichTextEditor content={description} onChange={setDescription} placeholder="Enter product description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price (₦)</Label>
                  <Input id="price" name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required />
                </div>
                <div>
                  <Label htmlFor="original_price">Original Price (₦)</Label>
                  <Input id="original_price" name="original_price" type="number" step="0.01" defaultValue={editingProduct?.original_price || ''} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input id="stock_quantity" name="stock_quantity" type="number" defaultValue={editingProduct?.stock_quantity} required />
                </div>
                <div>
                  <Label htmlFor="category_id">Category</Label>
                  <Select name="category_id" defaultValue={editingProduct?.category_id || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="vendor_id">Vendor</Label>
                <Select name="vendor_id" defaultValue={editingProduct?.vendor_id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.rep_full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="image">Product Image</Label>
                <div className="space-y-4">
                  {imagePreview && <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border" />
                      <Button type="button" size="sm" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0" onClick={clearImage}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>}
                  <div className="flex items-center gap-2">
                    <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <Label htmlFor="image" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90">
                      <Upload className="h-4 w-4" />
                      {imageFile ? 'Change Image' : 'Upload Image'}
                    </Label>
                    {imageFile && <span className="text-sm text-muted-foreground">
                        {imageFile.name}
                      </span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, max 5MB
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="scent_profile">Scent Profile</Label>
                <Select name="scent_profile" defaultValue={editingProduct?.scent_profile || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scent profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aquatic">Aquatic</SelectItem>
                    <SelectItem value="citrus">Citrus</SelectItem>
                    <SelectItem value="floral">Floral</SelectItem>
                    <SelectItem value="fresh">Fresh</SelectItem>
                    <SelectItem value="gourmand">Gourmand</SelectItem>
                    <SelectItem value="oriental">Oriental</SelectItem>
                    <SelectItem value="spicy">Spicy</SelectItem>
                    <SelectItem value="woody">Woody</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="is_featured">Featured</Label>
                  <Select name="is_featured" defaultValue={editingProduct?.is_featured ? 'true' : 'false'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="is_active">Active</Label>
                  <Select name="is_active" defaultValue={editingProduct?.is_active ? 'true' : 'false'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : editingProduct ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>₦{product.price.toLocaleString()}</TableCell>
                  <TableCell>{product.stock_quantity}</TableCell>
                  <TableCell>{categories.find(c => c.id === product.category_id)?.name || '-'}</TableCell>
                  <TableCell>{vendors.find(v => v.id === product.vendor_id)?.rep_full_name || '-'}</TableCell>
                  <TableCell>
                    <span className={product.is_active ? 'text-green-600' : 'text-red-600'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDialog(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
}