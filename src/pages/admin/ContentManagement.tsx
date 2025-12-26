import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, Save, Type, LayoutGrid, Sparkles } from 'lucide-react';

interface SiteContent {
  id: string;
  section: string;
  content_key: string;
  content_value: string;
  content_type: string;
}

interface SiteBanner {
  id: string;
  section: string;
  title: string | null;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

interface FeaturedBrand {
  id: string;
  name: string;
  logo_url: string;
  display_order: number;
  is_active: boolean;
}

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState('content');
  const [contents, setContents] = useState<SiteContent[]>([]);
  const [banners, setBanners] = useState<SiteBanner[]>([]);
  const [brands, setBrands] = useState<FeaturedBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContent, setEditingContent] = useState<SiteContent | null>(null);
  const [editingBanner, setEditingBanner] = useState<SiteBanner | null>(null);
  const [editingBrand, setEditingBrand] = useState<FeaturedBrand | null>(null);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [isBannerDialogOpen, setIsBannerDialogOpen] = useState(false);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [contentRes, bannersRes, brandsRes] = await Promise.all([
      supabase.from('site_content').select('*').order('section'),
      supabase.from('site_banners').select('*').order('display_order'),
      supabase.from('featured_brands').select('*').order('display_order')
    ]);

    if (contentRes.data) setContents(contentRes.data);
    if (bannersRes.data) setBanners(bannersRes.data);
    if (brandsRes.data) setBrands(brandsRes.data);
    setLoading(false);
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('site-banners')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return null;
    }

    const { data: urlData } = supabase.storage.from('site-banners').getPublicUrl(fileName);
    setUploading(false);
    return urlData.publicUrl;
  };

  // Content CRUD
  const saveContent = async (content: Partial<SiteContent>) => {
    if (editingContent?.id) {
      const { error } = await supabase
        .from('site_content')
        .update({ content_value: content.content_value })
        .eq('id', editingContent.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Content updated' });
        loadData();
        setIsContentDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('site_content')
        .insert({
          section: content.section,
          content_key: content.content_key,
          content_value: content.content_value,
          content_type: content.content_type || 'text'
        });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Content created' });
        loadData();
        setIsContentDialogOpen(false);
      }
    }
    setEditingContent(null);
  };

  const deleteContent = async (id: string) => {
    const { error } = await supabase.from('site_content').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Content deleted' });
      loadData();
    }
  };

  // Banner CRUD
  const saveBanner = async (banner: Partial<SiteBanner>, imageFile?: File) => {
    let imageUrl = banner.image_url;

    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile, 'banners');
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const bannerData = {
      section: banner.section,
      title: banner.title,
      subtitle: banner.subtitle,
      button_text: banner.button_text,
      button_link: banner.button_link,
      image_url: imageUrl,
      display_order: banner.display_order || 0,
      is_active: banner.is_active ?? true
    };

    if (editingBanner?.id) {
      const { error } = await supabase
        .from('site_banners')
        .update(bannerData)
        .eq('id', editingBanner.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Banner updated' });
        loadData();
        setIsBannerDialogOpen(false);
      }
    } else {
      const { error } = await supabase.from('site_banners').insert(bannerData);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Banner created' });
        loadData();
        setIsBannerDialogOpen(false);
      }
    }
    setEditingBanner(null);
  };

  const deleteBanner = async (id: string) => {
    const { error } = await supabase.from('site_banners').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Banner deleted' });
      loadData();
    }
  };

  // Brand CRUD
  const saveBrand = async (brand: Partial<FeaturedBrand>, logoFile?: File) => {
    let logoUrl = brand.logo_url;

    if (logoFile) {
      const uploadedUrl = await uploadImage(logoFile, 'brands');
      if (uploadedUrl) logoUrl = uploadedUrl;
    }

    const brandData = {
      name: brand.name,
      logo_url: logoUrl,
      display_order: brand.display_order || 0,
      is_active: brand.is_active ?? true
    };

    if (editingBrand?.id) {
      const { error } = await supabase
        .from('featured_brands')
        .update(brandData)
        .eq('id', editingBrand.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Brand updated' });
        loadData();
        setIsBrandDialogOpen(false);
      }
    } else {
      const { error } = await supabase.from('featured_brands').insert(brandData);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Brand created' });
        loadData();
        setIsBrandDialogOpen(false);
      }
    }
    setEditingBrand(null);
  };

  const deleteBrand = async (id: string) => {
    const { error } = await supabase.from('featured_brands').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Brand deleted' });
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Management</h1>
        <p className="text-muted-foreground">Manage site content, banners, and featured brands</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content" className="gap-2">
            <Type className="h-4 w-4" />
            Site Content
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Banners
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Brands
          </TabsTrigger>
        </TabsList>

        {/* Site Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Editable Text Content</h2>
            <Button onClick={() => { setEditingContent(null); setIsContentDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contents.map((content) => (
                  <TableRow key={content.id}>
                    <TableCell className="font-medium">{content.section}</TableCell>
                    <TableCell>{content.content_key}</TableCell>
                    <TableCell className="max-w-xs truncate">{content.content_value}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingContent(content); setIsContentDialogOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteContent(content.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Content Dialog */}
          <ContentDialog
            open={isContentDialogOpen}
            onOpenChange={setIsContentDialogOpen}
            content={editingContent}
            onSave={saveContent}
          />
        </TabsContent>

        {/* Banners Tab */}
        <TabsContent value="banners" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Site Banners</h2>
            <Button onClick={() => { setEditingBanner(null); setIsBannerDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((banner) => (
              <Card key={banner.id} className="overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  <img
                    src={banner.image_url}
                    alt={banner.title || 'Banner'}
                    className="w-full h-full object-cover"
                  />
                  {!banner.is_active && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">Inactive</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{banner.section}</p>
                      {banner.title && <p className="text-sm text-muted-foreground">{banner.title}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingBanner(banner); setIsBannerDialogOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBanner(banner.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Banner Dialog */}
          <BannerDialog
            open={isBannerDialogOpen}
            onOpenChange={setIsBannerDialogOpen}
            banner={editingBanner}
            onSave={saveBanner}
            uploading={uploading}
          />
        </TabsContent>

        {/* Brands Tab */}
        <TabsContent value="brands" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Featured Brands</h2>
            <Button onClick={() => { setEditingBrand(null); setIsBrandDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {brands.map((brand) => (
              <Card key={brand.id} className={`overflow-hidden ${!brand.is_active ? 'opacity-50' : ''}`}>
                <div className="aspect-[3/2] bg-white p-4 flex items-center justify-center">
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm truncate">{brand.name}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditingBrand(brand); setIsBrandDialogOpen(true); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteBrand(brand.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Brand Dialog */}
          <BrandDialog
            open={isBrandDialogOpen}
            onOpenChange={setIsBrandDialogOpen}
            brand={editingBrand}
            onSave={saveBrand}
            uploading={uploading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Content Dialog Component
function ContentDialog({
  open,
  onOpenChange,
  content,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: SiteContent | null;
  onSave: (content: Partial<SiteContent>) => void;
}) {
  const [formData, setFormData] = useState({
    section: '',
    content_key: '',
    content_value: '',
    content_type: 'text'
  });

  useEffect(() => {
    if (content) {
      setFormData({
        section: content.section,
        content_key: content.content_key,
        content_value: content.content_value,
        content_type: content.content_type
      });
    } else {
      setFormData({ section: '', content_key: '', content_value: '', content_type: 'text' });
    }
  }, [content]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{content ? 'Edit Content' : 'Add Content'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Section</Label>
              <Input
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="hero, popular_products..."
                disabled={!!content}
              />
            </div>
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                value={formData.content_key}
                onChange={(e) => setFormData({ ...formData, content_key: e.target.value })}
                placeholder="headline, title..."
                disabled={!!content}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Textarea
              value={formData.content_value}
              onChange={(e) => setFormData({ ...formData, content_value: e.target.value })}
              placeholder="Enter the content value..."
              rows={4}
            />
          </div>
          <Button onClick={() => onSave(formData)} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Banner Dialog Component
function BannerDialog({
  open,
  onOpenChange,
  banner,
  onSave,
  uploading
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner: SiteBanner | null;
  onSave: (banner: Partial<SiteBanner>, imageFile?: File) => void;
  uploading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<SiteBanner>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (banner) {
      setFormData(banner);
      setPreview(banner.image_url);
    } else {
      setFormData({ section: '', is_active: true, display_order: 0 });
      setPreview(null);
    }
    setImageFile(null);
  }, [banner]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{banner ? 'Edit Banner' : 'Add Banner'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Input
              value={formData.section || ''}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              placeholder="hero, lifestyle_1, lifestyle_2..."
            />
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            {preview && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <Input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle (optional)</Label>
              <Input
                value={formData.subtitle || ''}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={formData.button_text || ''}
                onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Button Link</Label>
              <Input
                value={formData.button_link || ''}
                onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Order:</Label>
              <Input
                type="number"
                className="w-20"
                value={formData.display_order || 0}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <Button
            onClick={() => onSave(formData, imageFile || undefined)}
            className="w-full"
            disabled={uploading || (!banner && !imageFile)}
          >
            {uploading ? 'Uploading...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Brand Dialog Component
function BrandDialog({
  open,
  onOpenChange,
  brand,
  onSave,
  uploading
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: FeaturedBrand | null;
  onSave: (brand: Partial<FeaturedBrand>, logoFile?: File) => void;
  uploading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<FeaturedBrand>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (brand) {
      setFormData(brand);
      setPreview(brand.logo_url);
    } else {
      setFormData({ name: '', is_active: true, display_order: 0 });
      setPreview(null);
    }
    setLogoFile(null);
  }, [brand]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{brand ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Brand Name</Label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Dior, Tom Ford..."
            />
          </div>

          <div className="space-y-2">
            <Label>Logo</Label>
            {preview && (
              <div className="h-20 bg-white border rounded-lg flex items-center justify-center p-4 mb-2">
                <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
            <Input type="file" accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Order:</Label>
              <Input
                type="number"
                className="w-20"
                value={formData.display_order || 0}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <Button
            onClick={() => onSave(formData, logoFile || undefined)}
            className="w-full"
            disabled={uploading || (!brand && !logoFile)}
          >
            {uploading ? 'Uploading...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
