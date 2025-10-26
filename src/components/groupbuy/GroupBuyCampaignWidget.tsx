import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Share2, Users, Clock, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface GroupBuyCampaignWidgetProps {
  campaignId: string;
  productId: string;
}

export const GroupBuyCampaignWidget = ({ campaignId, productId }: GroupBuyCampaignWidgetProps) => {
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  useEffect(() => {
    if (!campaign) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(campaign.expiry_at).getTime();
      const distance = expiry - now;

      if (distance < 0) {
        setTimeLeft("Expired");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [campaign]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('group_buy_campaigns')
        .select('*, products!group_buy_campaigns_product_id_fkey(name, price, image_url)')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load group buy details');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to join this group buy');
      navigate('/auth');
      return;
    }

    setCommitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('commit-to-group-buy', {
        body: { campaignId, quantity: 1 }
      });

      if (error) throw error;

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast.success('Successfully joined the group buy! You will be notified when the goal is reached.');
        fetchCampaign();
      }
    } catch (error: any) {
      console.error('Error committing:', error);
      toast.error(error.message || 'Failed to join group buy');
    } finally {
      setCommitting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Join me in this group buy for ${campaign.products.name} at ₦${campaign.discount_price}!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: campaign.products.name, text: shareText, url: shareUrl });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  if (!campaign) return null;

  const progress = (campaign.current_quantity / campaign.goal_quantity) * 100;
  const savingsPercent = campaign.products?.price 
    ? Math.round(((campaign.products.price - campaign.discount_price) / campaign.products.price) * 100)
    : 0;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="default" className="text-sm">
            <Tag className="w-3 h-3 mr-1" />
            Group Buy Active
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">₦{campaign.discount_price}</span>
            {campaign.products?.price && (
              <span className="text-lg text-muted-foreground line-through">₦{campaign.products.price}</span>
            )}
            {savingsPercent > 0 && (
              <Badge variant="secondary" className="ml-2">Save {savingsPercent}%</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {campaign.payment_mode === 'pay_on_success' 
              ? 'Pay only when the goal is reached' 
              : 'Pay now to secure your spot'}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Progress
            </span>
            <span className="font-semibold">{campaign.current_quantity} / {campaign.goal_quantity}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Time left
          </span>
          <span className="font-medium">{timeLeft}</span>
        </div>

        <Button 
          onClick={handleCommit} 
          className="w-full" 
          size="lg"
          disabled={committing || timeLeft === "Expired"}
        >
          {committing ? 'Processing...' : 'Commit to Buy'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Join others in this group buy to unlock the special price!
        </p>
      </div>
    </Card>
  );
};
