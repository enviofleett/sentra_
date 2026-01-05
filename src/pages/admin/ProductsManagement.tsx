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
  cost_price: number | null;
  target_margin_percentage: number;
  stock_quantity: number;
  category_id: string | null;
  vendor_id: string | null;
  image_url: string | null;
  images: any;
  is_featured: boolean;
  is_active: boolean;
  scent_profile: string | null;
  brand: string | null;
  size: string | null;
  margin_override_allowed: boolean;
  margin_override_reason: string | null;
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [topByViews, setTopByViews] = useState<any[]>([]);
  const [topByPurchases, setTopByPurchases] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formCostPrice, setFormCostPrice] = useState<number | null>(null);
  const [formTargetMargin, setFormTargetMargin] = useState<number>(30);

  // Calculate margin percentage
  const calculateMargin = (price: number, cost: number | null): number | null => {
    if (!cost || cost === 0 || price === 0) return null;
    return ((price - cost) / price) * 100;
  };

  const currentMargin = calculateMargin(formPrice, formCostPrice);

  const getMarginStatus = (margin: number | null): {
    status: 'NO_DATA' | 'LOSS' | 'CRITICAL' | 'LOW' | 'BELOW_TARGET' | 'HEALTHY';
    color: string;
    icon: string;
  } => {
    if (margin === null) return { status: 'NO_DATA', color: 'text-gray-500', icon: '⚪' };
    if (margin <= 0) return { status: 'LOSS', color: 'text-red-600', icon: '🔴' };
    if (margin < 10) return { status: 'CRITICAL', color: 'text-red-500', icon: '⚠️' };
    if (margin < 20) return { status: 'LOW', color: 'text-yellow-600', icon: '🟡' };
    if (margin < formTargetMargin) return { status: 'BELOW_TARGET', color: 'text-yellow-500', icon: '📊' };
    return { status: 'HEALTHY', color: 'text-green-600', icon: '🟢' };
  };

  const marginStatus = getMarginStatus(currentMargin);

  const emptyProduct: Omit<Product, 'id'> = {
    name: '',
    description: '',
    price: 0,
    original_price: null,
    cost_price: null,
    target_margin_percentage: 30,
    stock_quantity: 0,
    category_id: null,
    vendor_id: null,
    image_url: null,
    images: [],
    is_featured: false,
    is_active: true,
    scent_profile: null,
    brand: null,
    size: null,
    margin_override_allowed: false,
    margin_override_reason: null
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
    const files = Array.from(e.target.files || []);
    
    if (imageFiles.length + files.length > 3) {
      toast.error('Maximum 3 images allowed');
      return;
    }
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select only image files');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
    }
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImageFiles([...imageFiles, ...files]);
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };
  
  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };
  
  const clearImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
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
    
    // Upload new images if selected
    const uploadedUrls: string[] = [];
    if (imageFiles.length > 0) {
      setUploading(true);
      for (const file of imageFiles) {
        const url = await uploadImage(file);
        if (url) {
          uploadedUrls.push(url);
        } else {
          setUploading(false);
          return; // Stop if any upload failed
        }
      }
      setUploading(false);
    }
    
    // Keep existing images if editing and no new images uploaded
    const finalImages = uploadedUrls.length > 0 
      ? uploadedUrls 
      : (editingProduct?.images as string[] || []);
    const scentValue = formData.get('scent_profile') as string;
    const validScents = ['aquatic', 'citrus', 'floral', 'fresh', 'gourmand', 'oriental', 'spicy', 'woody'];
    const productData = {
      name: formData.get('name') as string,
      description: description,
      price: parseFloat(formData.get('price') as string),
      original_price: formData.get('original_price') ? parseFloat(formData.get('original_price') as string) : null,
      cost_price: formData.get('cost_price') ? parseFloat(formData.get('cost_price') as string) : null,
      target_margin_percentage: formData.get('target_margin_percentage') ? parseFloat(formData.get('target_margin_percentage') as string) : 30,
      stock_quantity: parseInt(formData.get('stock_quantity') as string),
      category_id: formData.get('category_id') as string || null,
      vendor_id: formData.get('vendor_id') as string || null,
      image_url: finalImages[0] || null,
      images: finalImages,
      is_featured: formData.get('is_featured') === 'true',
      is_active: formData.get('is_active') === 'true',
      scent_profile: (scentValue && validScents.includes(scentValue) ? scentValue : null) as any,
      brand: formData.get('brand') as string || null,
      size: formData.get('size') as string || null,
      margin_override_allowed: formData.get('margin_override_allowed') === 'true',
      margin_override_reason: formData.get('margin_override_reason') as string || null
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
        clearImages();
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
        clearImages();
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
    setFormPrice(product?.price || 0);
    setFormCostPrice(product?.cost_price || null);
    setFormTargetMargin(product?.target_margin_percentage || 30);
    clearImages();
    if (product?.images && Array.isArray(product.images)) {
      setImagePreviews(product.images as string[]);
    } else if (product?.image_url) {
      setImagePreviews([product.image_url]);
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input id="name" name="name" defaultValue={editingProduct?.name} required />
                </div>
                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input id="brand" name="brand" defaultValue={editingProduct?.brand || ''} placeholder="e.g., Tom Ford" />
                </div>
              </div>
              <div>
                <Label htmlFor="size">Bottle Size</Label>
                <Input id="size" name="size" defaultValue={editingProduct?.size || ''} placeholder="e.g., 100ml" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Selling Price (₦)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct?.price}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="original_price">Original Price (₦)</Label>
                  <Input
                    id="original_price"
                    name="original_price"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct?.original_price || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost_price">Cost Price (₦)</Label>
                  <Input
                    id="cost_price"
                    name="cost_price"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct?.cost_price || ''}
                    onChange={(e) => setFormCostPrice(parseFloat(e.target.value) || null)}
                    placeholder="Enter product cost"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Purchase/manufacturing cost per unit
                  </p>
                </div>
                <div>
                  <Label htmlFor="target_margin_percentage">Target Margin (%)</Label>
                  <Input
                    id="target_margin_percentage"
                    name="target_margin_percentage"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct?.target_margin_percentage || 30}
                    onChange={(e) => setFormTargetMargin(parseFloat(e.target.value) || 30)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 30%
                  </p>
                </div>
              </div>

              {/* Margin Calculator Display */}
              {formCostPrice !== null && formCostPrice > 0 && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Margin Analysis</h4>
                    <span className={`text-lg ${marginStatus.color}`}>
                      {marginStatus.icon}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Gross Profit</p>
                      <p className="font-semibold">
                        ₦{(formPrice - (formCostPrice || 0)).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margin %</p>
                      <p className={`font-semibold ${marginStatus.color}`}>
                        {currentMargin !== null ? currentMargin.toFixed(2) : '0.00'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className={`font-semibold ${marginStatus.color}`}>
                        {marginStatus.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  {currentMargin !== null && currentMargin < 10 && (
                    <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
                      ⚠️ <strong>WARNING:</strong> Margin below 10% minimum. {currentMargin <= 0 ? 'Selling at a loss!' : 'Consider increasing price or lowering cost.'}
                    </div>
                  )}
                  {currentMargin !== null && currentMargin >= 10 && currentMargin < 20 && (
                    <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
                      💡 Margin is below recommended 20%. Room for improvement.
                    </div>
                  )}
                  {currentMargin !== null && currentMargin >= 20 && currentMargin < formTargetMargin && (
                    <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded text-blue-800 text-xs">
                      📊 Margin is below target of {formTargetMargin}%. Currently at {currentMargin.toFixed(2)}%.
                    </div>
                  )}
                  {currentMargin !== null && currentMargin >= formTargetMargin && (
                    <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-green-800 text-xs">
                      ✅ Healthy margin! Exceeds target of {formTargetMargin}%.
                    </div>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="description">Description</Label>
                <RichTextEditor content={description} onChange={setDescription} placeholder="Enter product description..." />
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
                <Label htmlFor="images">Product Images (Optional, up to 3)</Label>
                <div className="space-y-4">
                  {imagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative inline-block">
                          <img src={preview} alt={`Preview ${index + 1}`} className="h-24 w-24 object-cover rounded-lg border" />
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="destructive" 
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0" 
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {imagePreviews.length < 3 && (
                    <div className="flex items-center gap-2">
                      <Input 
                        id="images" 
                        type="file" 
                        accept="image/*" 
                        multiple
                        onChange={handleImageChange} 
                        className="hidden" 
                      />
                      <Label 
                        htmlFor="images" 
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90"
                      >
                        <Upload className="h-4 w-4" />
                        {imagePreviews.length > 0 ? 'Add More Images' : 'Upload Images'}
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {imagePreviews.length}/3 images
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Optional: Upload up to 3 images. Square images recommended, max 5MB each.
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
                <TableHead>Cost</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => {
                const productMargin = calculateMargin(product.price, product.cost_price);
                const productMarginStatus = getMarginStatus(productMargin);

                return <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>₦{product.price.toLocaleString()}</TableCell>
                  <TableCell>
                    {product.cost_price !== null ? (
                      `₦${product.cost_price.toLocaleString()}`
                    ) : (
                      <span className="text-muted-foreground text-xs">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {productMargin !== null ? (
                      <div className="flex items-center gap-2">
                        <span className={productMarginStatus.color}>
                          {productMarginStatus.icon}
                        </span>
                        <span className={`font-semibold ${productMarginStatus.color}`}>
                          {productMargin.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>{product.stock_quantity}</TableCell>
                  <TableCell>{categories.find(c => c.id === product.category_id)?.name || '-'}</TableCell>
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
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
}