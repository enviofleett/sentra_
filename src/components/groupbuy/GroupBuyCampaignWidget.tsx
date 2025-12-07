import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Share2, Users, Clock, Tag, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface GroupBuyCampaignWidgetProps {
  campaignId: string;
  productId: string;
}

type CampaignStatus = 'draft' | 'active' | 'goal_reached' | 'expired' | 'completed' | 'cancelled' | 'goal_met_pending_payment' | 'goal_met_paid_finalized' | 'failed_expired';

export const GroupBuyCampaignWidget = ({ campaignId, productId }: GroupBuyCampaignWidgetProps) => {
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [userCommitment, setUserCommitment] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaign();
    checkUserCommitment();
  }, [campaignId]);

  useEffect(() => {
    if (!campaign) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(campaign.expiry_at).getTime();
      const distance = expiry - now;

      if (distance < 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        return;
      }

      setIsExpired(false);
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [campaign]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('group_buy_campaigns')
        .select('*, products(name, price, image_url)')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      
      // Check if campaign is actually active and not expired
      const now = new Date();
      const expiry = new Date(data.expiry_at);
      const status = data.status as CampaignStatus;
      
      if (expiry < now || !['active', 'goal_reached', 'goal_met_pending_payment'].includes(status)) {
        setIsExpired(true);
      }
      
      setCampaign(data);
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load group buy details');
    } finally {
      setLoading(false);
    }
  };

  const checkUserCommitment = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('group_buy_commitments')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', session.user.id)
      .in('status', ['committed_unpaid', 'committed_paid', 'paid_finalized'])
      .maybeSingle();

    setUserCommitment(data);
  };

  const handleCommit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to join this group buy');
      navigate('/auth');
      return;
    }

    if (isExpired) {
      toast.error('This group buy has expired');
      return;
    }

    setCommitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('commit-to-group-buy', {
        body: { campaignId, quantity: 1 }
      });

      if (error) {
        if (error.message?.includes('already have a commitment')) {
          toast.error('You have already joined this group buy. Check your profile page.');
          navigate('/profile/groupbuys');
          return;
        }
        throw error;
      }

      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast.success('Successfully joined the group buy! You will be notified when the goal is reached.');
        fetchCampaign();
        checkUserCommitment();
      }
    } catch (error: any) {
      console.error('Commit error:', error);
      
      if (error.message?.includes('already have a commitment')) {
        toast.error('You have already joined this group buy.');
      } else if (error.message?.includes('Campaign has expired')) {
        toast.error('This group buy campaign has expired.');
        setIsExpired(true);
      } else if (error.message?.includes('Campaign is not active')) {
        toast.error('This group buy is no longer active.');
      } else {
        toast.error('Unable to join group buy. Please try again later.');
      }
    } finally {
      setCommitting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Join me in this group buy for ${campaign.products?.name} at ₦${campaign.discount_price?.toLocaleString()}!`;

    if (navigator.share) {
      try {
        await navigator.share({ 
          title: campaign.products?.name, 
          text: shareText, 
          url: shareUrl 
        });
        toast.success('Shared successfully!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          try {
            await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
            toast.success('Link copied to clipboard!');
          } catch (clipboardError) {
            toast.error('Unable to share. Please copy the URL manually.');
          }
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        toast.success('Link copied to clipboard!');
      } catch (error) {
        toast.error('Unable to copy link. Please copy the URL manually.');
      }
    }
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  if (!campaign) return null;

  const progress = Math.min((campaign.current_quantity / campaign.goal_quantity) * 100, 100);
  const savingsPercent = campaign.products?.price 
    ? Math.round(((campaign.products.price - campaign.discount_price) / campaign.products.price) * 100)
    : 0;

  const status = campaign.status as CampaignStatus;
  const isInactive = isExpired || ['expired', 'failed_expired', 'cancelled', 'completed', 'goal_met_paid_finalized'].includes(status);

  const getStatusBadge = () => {
    if (status === 'goal_met_pending_payment' || status === 'goal_reached') {
      return (
        <Badge variant="default" className="text-sm bg-green-600">
          <Tag className="w-3 h-3 mr-1" />
          Goal Reached!
        </Badge>
      );
    }
    if (isInactive) {
      return (
        <Badge variant="secondary" className="text-sm">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Campaign Ended
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="text-sm">
        <Tag className="w-3 h-3 mr-1" />
        Group Buy Active
      </Badge>
    );
  };

  return (
    <Card className={`p-6 border-2 ${isInactive ? 'bg-muted/50 border-muted' : 'bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20'}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {getStatusBadge()}
          {!isInactive && (
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${isInactive ? 'text-muted-foreground' : 'text-primary'}`}>
              ₦{campaign.discount_price?.toLocaleString()}
            </span>
            {campaign.products?.price && (
              <span className="text-lg text-muted-foreground line-through">
                ₦{campaign.products.price?.toLocaleString()}
              </span>
            )}
            {savingsPercent > 0 && (
              <Badge variant="secondary" className="ml-2">Save {savingsPercent}%</Badge>
            )}
          </div>
          {!isInactive && (
            <p className="text-sm text-muted-foreground">
              {campaign.payment_mode === 'pay_on_success' 
                ? 'Pay only when the goal is reached' 
                : 'Pay now to secure your spot'}
            </p>
          )}
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

        {!isInactive && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Time left
            </span>
            <span className={`font-medium ${timeLeft === 'Expired' ? 'text-destructive' : ''}`}>
              {timeLeft}
            </span>
          </div>
        )}

        {isInactive ? (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              This group buy campaign has ended.
            </p>
          </div>
        ) : userCommitment ? (
          <Button 
            onClick={() => navigate('/profile/groupbuys')} 
            className="w-full" 
            size="lg"
            variant="secondary"
          >
            View Your Commitment
          </Button>
        ) : (
          <Button 
            onClick={handleCommit} 
            className="w-full" 
            size="lg"
            disabled={committing}
          >
            {committing ? 'Processing...' : 'Commit to Buy'}
          </Button>
        )}

        {!isInactive && !userCommitment && (
          <p className="text-xs text-center text-muted-foreground">
            Join others in this group buy to unlock the special price!
          </p>
        )}
      </div>
    </Card>
  );
};
