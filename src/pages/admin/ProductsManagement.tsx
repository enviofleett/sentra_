import { useEffect, useState, useMemo } from 'react';
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
import { Pencil, Trash2, Plus, Upload, X, AlertTriangle, TrendingUp, TrendingDown, Search, CheckSquare, Square, Power, PowerOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductPerformanceChart } from '@/components/admin/ProductPerformanceChart';
import { TopProductsWidget } from '@/components/admin/TopProductsWidget';
import { getTopProductsByViews, getTopProductsByPurchases } from '@/utils/analytics';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  original_price: number | null;
  stock_quantity: number | null;
  category_id: string | null;
  vendor_id: string | null;
  image_url: string | null;
  images: any;
  is_featured: boolean;
  is_active: boolean | null;
  scent_profile: string | null;
  brand: string | null;
  size: string | null;
  margin_override_allowed: boolean | null;
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

// Margin calculator component
function MarginCalculator({ 
  price, 
  costPrice, 
  marginOverride, 
  onMarginOverrideChange 
}: { 
  price: number; 
  costPrice: number | null;
  marginOverride: boolean;
  onMarginOverrideChange: (checked: boolean) => void;
}) {
  if (costPrice === null || costPrice === 0 || isNaN(costPrice)) {
    return (
      <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
        <p className="text-sm text-muted-foreground">Enter cost price to see margin</p>
      </div>
    );
  }

  const marginAmount = price - costPrice;
  const marginPercentage = price > 0 ? (marginAmount / price) * 100 : 0;
  
  const isNegative = marginAmount < 0;
  const isLow = marginPercentage >= 0 && marginPercentage < 20;
  const isCriticallyLow = marginPercentage >= 0 && marginPercentage < 10;
  const isHealthy = marginPercentage >= 20;

  return (
    <div className={`p-3 rounded-lg border ${
      isNegative ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' : 
      isLow ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' : 
      'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {isNegative ? (
          <><TrendingDown className="h-4 w-4 text-red-600" /><span className="text-sm font-medium text-red-600">Negative Margin</span></>
        ) : isLow ? (
          <><AlertTriangle className="h-4 w-4 text-yellow-600" /><span className="text-sm font-medium text-yellow-600">Low Margin Warning</span></>
        ) : (
          <><TrendingUp className="h-4 w-4 text-green-600" /><span className="text-sm font-medium text-green-600">Healthy Margin</span></>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Amount:</span>
          <span className={`ml-1 font-medium ${isNegative ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}`}>
            ₦{marginAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Percentage:</span>
          <span className={`ml-1 font-medium ${isNegative ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}`}>
            {marginPercentage.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* Margin Override Checkbox - only show when margin is critically low */}
      {isCriticallyLow && !isNegative && (
        <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-yellow-700">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="margin-override"
              checked={marginOverride}
              onCheckedChange={(checked) => onMarginOverrideChange(checked as boolean)}
            />
            <label 
              htmlFor="margin-override" 
              className="text-sm text-yellow-700 dark:text-yellow-400 cursor-pointer"
            >
              Allow saving with low margin (override safety check)
            </label>
          </div>
          <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
            Check this to save the product despite the margin being below 10%
          </p>
        </div>
      )}
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Live margin calculation state
  const [livePrice, setLivePrice] = useState<number>(0);
  const [liveCostPrice, setLiveCostPrice] = useState<number | null>(null);
  const [marginOverride, setMarginOverride] = useState<boolean>(false);

  const emptyProduct: Omit<Product, 'id'> = {
    name: '',
    description: '',
    price: 0,
    cost_price: null,
    original_price: null,
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
    margin_override_allowed: false
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
    const costPriceValue = formData.get('cost_price') as string;
    const productData = {
      name: formData.get('name') as string,
      description: description,
      price: parseFloat(formData.get('price') as string),
      cost_price: costPriceValue ? parseFloat(costPriceValue) : null,
      original_price: formData.get('original_price') ? parseFloat(formData.get('original_price') as string) : null,
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
      margin_override_allowed: marginOverride
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

  // Bulk action handlers
  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.brand?.toLowerCase().includes(query) ||
      product.scent_profile?.toLowerCase().includes(query) ||
      categories.find(c => c.id === product.category_id)?.name.toLowerCase().includes(query)
    );
  });

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedProducts.size} products?`)) return;
    
    setBulkLoading(true);
    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', Array.from(selectedProducts));
    
    if (error) {
      toast.error('Failed to delete products');
      console.error(error);
    } else {
      toast.success(`${selectedProducts.size} products deleted successfully`);
      setSelectedProducts(new Set());
      fetchProducts();
    }
    setBulkLoading(false);
  };

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    setBulkLoading(true);
    const { error } = await supabase
      .from('products')
      .update({ is_active: isActive })
      .in('id', Array.from(selectedProducts));
    
    if (error) {
      toast.error('Failed to update products');
      console.error(error);
    } else {
      toast.success(`${selectedProducts.size} products ${isActive ? 'activated' : 'deactivated'}`);
      setSelectedProducts(new Set());
      fetchProducts();
    }
    setBulkLoading(false);
  };

  const openDialog = (product?: Product) => {
    setEditingProduct(product || null);
    setDescription(product?.description || '');
    setLivePrice(product?.price || 0);
    setLiveCostPrice(product?.cost_price || null);
    setMarginOverride(product?.margin_override_allowed || false);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t">
        <h3 className="text-xl font-semibold">All Products</h3>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Selling Price (₦)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct?.price}
                    onChange={(e) => setLivePrice(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost_price">Cost Price (₦)</Label>
                  <Input
                    id="cost_price"
                    name="cost_price"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduct?.cost_price || ''}
                    onChange={(e) => setLiveCostPrice(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Enter cost"
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
              
              {/* Real-time Margin Calculator */}
              <MarginCalculator price={livePrice} costPrice={liveCostPrice} marginOverride={marginOverride} onMarginOverrideChange={setMarginOverride} />
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
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>
              {searchQuery 
                ? `Search Results (${filteredProducts.length})`
                : `All Products (${products.length})`
              }
            </CardTitle>
          </div>
          
          {/* Bulk Actions Bar */}
          {selectedProducts.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate(true)}
                  disabled={bulkLoading}
                >
                  <Power className="h-4 w-4 mr-1" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatusUpdate(false)}
                  disabled={bulkLoading}
                >
                  <PowerOff className="h-4 w-4 mr-1" />
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkLoading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProducts(new Set())}
                  disabled={bulkLoading}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(product => (
                <TableRow key={product.id} className={selectedProducts.has(product.id) ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => toggleSelectProduct(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>₦{product.price.toLocaleString()}</TableCell>
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
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? `No products found matching "${searchQuery}"` : 'No products found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
}