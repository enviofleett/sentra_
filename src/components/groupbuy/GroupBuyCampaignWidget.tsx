import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Users, Clock, Minus, Plus, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
  const [quantity, setQuantity] = useState(1);
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
        setTimeLeft("Closed");
        setIsExpired(true);
        return;
      }

      setIsExpired(false);
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
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
        .select('*, products!group_buy_campaigns_product_id_fkey(name, price, image_url)')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      
      const now = new Date();
      const expiry = new Date(data.expiry_at);
      const status = data.status as CampaignStatus;
      
      if (expiry < now || !['active', 'goal_reached', 'goal_met_pending_payment'].includes(status)) {
        setIsExpired(true);
      }
      
      setCampaign(data);
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load circle details');
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
      toast.error('Please sign in to join this circle');
      navigate('/auth');
      return;
    }

    if (isExpired) {
      toast.error('This circle has closed');
      return;
    }

    const remainingSpots = campaign.goal_quantity - campaign.current_quantity;
    if (quantity > remainingSpots) {
      toast.error(`Only ${remainingSpots} spots remaining`);
      return;
    }

    setCommitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('commit-to-group-buy', {
        body: { campaignId, quantity }
      });

      if (error) {
        if (error.message?.includes('already have a commitment')) {
          toast.error('You have already joined this circle.');
          navigate('/profile/groupbuys');
          return;
        }
        throw error;
      }

      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast.success('Welcome to the Circle! You will be notified when the goal is reached.');
        fetchCampaign();
        checkUserCommitment();
      }
    } catch (error: any) {
      console.error('Commit error:', error);
      
      if (error.message?.includes('already have a commitment')) {
        toast.error('You have already joined this circle.');
      } else if (error.message?.includes('Campaign has expired')) {
        toast.error('This circle has closed.');
        setIsExpired(true);
      } else if (error.message?.includes('Campaign is not active')) {
        toast.error('This circle is no longer active.');
      } else {
        toast.error('Unable to join circle. Please try again.');
      }
    } finally {
      setCommitting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Join me in this exclusive Sentra Circle for ${campaign.products?.name} at ₦${campaign.discount_price?.toLocaleString()}!`;

    if (navigator.share) {
      try {
        await navigator.share({ 
          title: `Sentra Circle: ${campaign.products?.name}`, 
          text: shareText, 
          url: shareUrl 
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          toast.success('Link copied!');
        }
      }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success('Link copied!');
    }
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted/30 rounded-lg" />;
  }

  if (!campaign) return null;

  const hasValidData = campaign.discount_price > 0 && campaign.goal_quantity > 0;
  const progress = campaign.goal_quantity > 0 
    ? Math.min((campaign.current_quantity / campaign.goal_quantity) * 100, 100) 
    : 0;
  const savingsPercent = campaign.products?.price 
    ? Math.round(((campaign.products.price - campaign.discount_price) / campaign.products.price) * 100)
    : 0;

  const status = campaign.status as CampaignStatus;
  const isInactive = isExpired || ['expired', 'failed_expired', 'cancelled', 'completed', 'goal_met_paid_finalized'].includes(status);
  const spotsRemaining = campaign.goal_quantity - campaign.current_quantity;

  if (!hasValidData) {
    return (
      <Card className="p-6 bg-muted/20 border border-border/50">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Circle details unavailable.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className={`overflow-hidden border ${isInactive ? 'bg-muted/20 border-border/50' : 'glass-gold'}`}>
        {/* Header */}
        <div className={`px-6 py-4 ${isInactive ? 'bg-muted/30' : 'bg-secondary/5'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className={`w-4 h-4 ${isInactive ? 'text-muted-foreground' : 'text-secondary'}`} />
              <span className={`text-xs uppercase tracking-[0.2em] font-medium ${isInactive ? 'text-muted-foreground' : 'text-secondary'}`}>
                {isInactive ? 'Circle Closed' : status === 'goal_reached' || status === 'goal_met_pending_payment' ? 'Goal Reached' : 'Sentra Circle'}
              </span>
            </div>
            {!isInactive && (
              <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 px-2">
                <Share2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Price */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <span className={`text-3xl font-serif ${isInactive ? 'text-muted-foreground' : 'text-foreground'}`}>
                ₦{campaign.discount_price?.toLocaleString()}
              </span>
              {campaign.products?.price && (
                <span className="text-base text-muted-foreground line-through">
                  ₦{campaign.products.price?.toLocaleString()}
                </span>
              )}
            </div>
            {savingsPercent > 0 && !isInactive && (
              <p className="text-sm text-secondary font-medium">
                Save {savingsPercent}% when you join
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                Member Slots
              </span>
              <span className="font-medium">{campaign.current_quantity} / {campaign.goal_quantity}</span>
            </div>
            
            {/* Elegant thin progress line */}
            <div className="relative h-1 bg-muted/50 rounded-full overflow-hidden">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-secondary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            
            {!isInactive && spotsRemaining > 0 && (
              <p className="text-xs text-muted-foreground">
                {spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'} remaining
              </p>
            )}
          </div>

          {/* Timer */}
          {!isInactive && (
            <div className="flex items-center justify-between text-sm py-2 border-t border-border/50">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                Circle closes in
              </span>
              <span className="font-medium text-amber">{timeLeft}</span>
            </div>
          )}

          {/* Action Area */}
          {isInactive ? (
            <p className="text-center text-sm text-muted-foreground py-2">
              This circle has ended.
            </p>
          ) : userCommitment ? (
            <Button 
              onClick={() => navigate('/profile/groupbuys')} 
              variant="outline"
              className="w-full h-12 border-secondary/30 text-secondary hover:bg-secondary/5"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              View Your Membership
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Quantity Selector */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full border-border/50"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full border-border/50"
                    onClick={() => setQuantity(q => Math.min(10, spotsRemaining, q + 1))}
                    disabled={quantity >= Math.min(10, spotsRemaining)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Total */}
              <div className="flex items-center justify-between py-3 border-t border-border/50">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-serif text-foreground">
                  ₦{(campaign.discount_price * quantity)?.toLocaleString()}
                </span>
              </div>

              <Button 
                onClick={handleCommit} 
                className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium"
                disabled={committing}
              >
                {committing ? 'Processing...' : 'Join This Circle'}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                {campaign.payment_mode === 'pay_on_success' 
                  ? 'You\'ll only be charged when the goal is reached' 
                  : 'Secure your spot with payment now'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
