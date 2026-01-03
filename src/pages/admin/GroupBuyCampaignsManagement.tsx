import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Edit, XCircle, CheckCircle, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function GroupBuyCampaignsManagement() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [forceSucceedDialogOpen, setForceSucceedDialogOpen] = useState(false);
  const [processingForceSucceed, setProcessingForceSucceed] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [formData, setFormData] = useState<{
    product_id: string;
    goal_quantity: number;
    discount_price: number;
    payment_mode: 'pay_on_success' | 'pay_to_book';
    payment_window_hours: number;
    expiry_at: string;
    status: 'draft' | 'active';
  }>({
    product_id: '',
    goal_quantity: 10,
    discount_price: 0,
    payment_mode: 'pay_on_success',
    payment_window_hours: 6,
    expiry_at: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchCampaigns();
    fetchProducts();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('group_buy_campaigns')
        .select('*, products!group_buy_campaigns_product_id_fkey(name, image_url, vendor_id, vendors(rep_full_name))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      toast.error('Failed to load campaigns');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, vendor_id')
        .eq('is_active', true);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.product_id) {
      toast.error('Please select a product');
      return;
    }
    
    if (formData.discount_price <= 0) {
      toast.error('Discount price must be greater than 0');
      return;
    }
    
    if (formData.goal_quantity <= 0) {
      toast.error('Goal quantity must be greater than 0');
      return;
    }
    
    if (!formData.expiry_at) {
      toast.error('Please set an expiry date');
      return;
    }
    
    const expiryDate = new Date(formData.expiry_at);
    if (expiryDate <= new Date()) {
      toast.error('Expiry date must be in the future');
      return;
    }
    
    let campaignIdToUpdate = selectedCampaign?.id;

    try {
      if (selectedCampaign) {
        const { error } = await supabase
          .from('group_buy_campaigns')
          .update(formData)
          .eq('id', selectedCampaign.id);

        if (error) throw error;
        toast.success('Campaign updated successfully');
        campaignIdToUpdate = selectedCampaign.id;
      } else {
        const { data, error } = await supabase
          .from('group_buy_campaigns')
          .insert([formData])
          .select('id')
          .single();

        if (error) throw error;
        campaignIdToUpdate = data.id;
        toast.success('Campaign created successfully');
      }
      
      // Update product's active_group_buy_id to control widget visibility
      if (campaignIdToUpdate && formData.product_id) {
        const newActiveId = formData.status === 'active' ? campaignIdToUpdate : null;
        
        const { error: productUpdateError } = await supabase
          .from('products')
          .update({ active_group_buy_id: newActiveId })
          .eq('id', formData.product_id);

        if (productUpdateError) {
          console.error('Failed to link/unlink product active_group_buy_id:', productUpdateError);
          toast.error('Campaign saved, but failed to link to product.');
        }
      }

      setDialogOpen(false);
      setSelectedCampaign(null);
      resetForm();
      fetchCampaigns();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
      console.error(error);
    }
  };

  const handleCancelCampaign = async () => {
    if (!selectedCampaign) return;

    try {
      const { error } = await supabase
        .from('group_buy_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', selectedCampaign.id);

      if (error) throw error;
      
      // Unlink product on cancel
      if (selectedCampaign.product_id) {
        await supabase
          .from('products')
          .update({ active_group_buy_id: null })
          .eq('id', selectedCampaign.product_id);
      }

      toast.success('Campaign cancelled');
      setCancelDialogOpen(false);
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch (error: any) {
      toast.error('Failed to cancel campaign');
      console.error(error);
    }
  };

  const handleForceSucceed = async () => {
    if (!selectedCampaign) return;

    setProcessingForceSucceed(true);
    try {
      // First update the campaign to goal_reached status
      const { error: updateError } = await supabase
        .from('group_buy_campaigns')
        .update({ 
          status: 'goal_reached',
          current_quantity: selectedCampaign.goal_quantity // Force it to goal
        })
        .eq('id', selectedCampaign.id);

      if (updateError) throw updateError;

      // Trigger the process-group-buy-goals function
      const { error: invokeError } = await supabase.functions.invoke('process-group-buy-goals');

      if (invokeError) {
        console.error('Error invoking process-group-buy-goals:', invokeError);
        toast.warning('Campaign marked as successful. Fulfillment will process shortly.');
      } else {
        toast.success('Campaign force-succeeded and fulfillment started!');
      }

      setForceSucceedDialogOpen(false);
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message || 'Failed to force succeed campaign');
      console.error(error);
    } finally {
      setProcessingForceSucceed(false);
    }
  };

  const openDialog = (campaign?: any) => {
    if (campaign) {
      setSelectedCampaign(campaign);
      setFormData({
        product_id: campaign.product_id,
        goal_quantity: campaign.goal_quantity,
        discount_price: campaign.discount_price,
        payment_mode: campaign.payment_mode,
        payment_window_hours: campaign.payment_window_hours,
        expiry_at: campaign.expiry_at?.split('T')[0] || '',
        status: campaign.status
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      goal_quantity: 10,
      discount_price: 0,
      payment_mode: 'pay_on_success',
      payment_window_hours: 6,
      expiry_at: '',
      status: 'draft'
    });
  };

  const getStatusColor = (status: string): "default" | "destructive" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "secondary"> = {
      draft: 'secondary',
      pending: 'secondary',
      active: 'default',
      goal_met_pending_payment: 'default',
      goal_met_paid_finalized: 'default',
      paid_finalized: 'default',
      failed_expired: 'destructive',
      cancelled: 'destructive'
    };
    return colors[status] || 'secondary';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Group Buy Campaigns</h1>
          <p className="text-muted-foreground">Manage group buying campaigns</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedCampaign ? 'Edit' : 'Create'} Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select 
                  value={formData.product_id} 
                  onValueChange={(value) => setFormData({...formData, product_id: value})}
                  disabled={!!selectedCampaign}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (₦{product.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Goal Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.goal_quantity}
                    onChange={(e) => setFormData({...formData, goal_quantity: parseInt(e.target.value) || 1})}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Minimum number of participants needed</p>
                </div>

                <div className="space-y-2">
                  <Label>Discount Price (₦) *</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.discount_price || ''}
                    onChange={(e) => setFormData({...formData, discount_price: parseFloat(e.target.value) || 0})}
                    placeholder="Enter discount price"
                    required
                  />
                  <p className="text-xs text-muted-foreground">The special group buy price (must be greater than 0)</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <RadioGroup 
                  value={formData.payment_mode}
                  onValueChange={(value) => setFormData({...formData, payment_mode: value as any})}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pay_to_book" id="pay_to_book" />
                    <Label htmlFor="pay_to_book">Pay to Book (Immediate payment required)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pay_on_success" id="pay_on_success" />
                    <Label htmlFor="pay_on_success">Pay on Success (Payment after goal is met)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Payment Window: {formData.payment_window_hours} hours</Label>
                <Slider
                  value={[formData.payment_window_hours]}
                  onValueChange={([value]) => setFormData({...formData, payment_window_hours: value})}
                  min={1}
                  max={24}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiry_at}
                  onChange={(e) => setFormData({...formData, expiry_at: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({...formData, status: value as any})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">
                {selectedCampaign ? 'Update' : 'Create'} Campaign
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{campaign.products?.name}</CardTitle>
                  <CardDescription>Vendor: {campaign.vendors?.rep_full_name}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getStatusColor(campaign.status)}>
                    {campaign.status.replace(/_/g, ' ')}
                  </Badge>
                  {['pending', 'active'].includes(campaign.status) && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openDialog(campaign)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setForceSucceedDialogOpen(true);
                        }}
                        title="Force Succeed"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedCampaign(campaign);
                          setCancelDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Discount Price</p>
                    <p className="font-semibold">₦{campaign.discount_price}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Mode</p>
                    <p className="font-semibold">{campaign.payment_mode.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment Window</p>
                    <p className="font-semibold">{campaign.payment_window_hours}h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expires</p>
                    <p className="font-semibold">{new Date(campaign.expiry_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-semibold">{campaign.current_quantity} / {campaign.goal_quantity}</span>
                  </div>
                  <Progress value={(campaign.current_quantity / campaign.goal_quantity) * 100} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the campaign and refund all payments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelCampaign}>Confirm Cancellation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={forceSucceedDialogOpen} onOpenChange={setForceSucceedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Succeed Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the campaign as goal-reached and trigger the fulfillment process. 
              All paid commitments will have orders created, and unpaid commitments will receive payment notifications.
              <br /><br />
              <strong>Current progress:</strong> {selectedCampaign?.current_quantity || 0} / {selectedCampaign?.goal_quantity || 0}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingForceSucceed}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleForceSucceed}
              disabled={processingForceSucceed}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingForceSucceed ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Force Succeed'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
