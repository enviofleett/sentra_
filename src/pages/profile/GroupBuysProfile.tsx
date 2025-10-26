import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Clock, Package } from "lucide-react";

export default function GroupBuysProfile() {
  const [commitments, setCommitments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    fetchCommitments();
  }, []);

  const fetchCommitments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('group_buy_commitments')
        .select('*, group_buy_campaigns!inner(*, products!group_buy_campaigns_product_id_fkey(name, image_url))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommitments(data || []);
    } catch (error: any) {
      console.error('Error fetching commitments:', error);
      toast.error('Failed to load your group buys');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (commitmentId: string) => {
    setPaying(commitmentId);
    try {
      const { data, error } = await supabase.functions.invoke('finalize-group-buy-payment', {
        body: { commitmentId }
      });

      if (error) throw error;

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast.error(error.message || 'Failed to initiate payment');
    } finally {
      setPaying(null);
    }
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date().getTime();
    const deadlineTime = new Date(deadline).getTime();
    const distance = deadlineTime - now;

    if (distance < 0) return "Expired";

    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const pendingPayments = commitments.filter(c => c.status === 'committed_unpaid' && c.payment_deadline);
  const paidCommitments = commitments.filter(c => c.status === 'committed_paid');
  const expiredCommitments = commitments.filter(c => ['payment_window_expired', 'refunded'].includes(c.status));

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Group Buys</h1>
        <p className="text-muted-foreground">Track your group buy commitments and payments</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Payment ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({paidCommitments.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expired ({expiredCommitments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingPayments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No pending payments
              </CardContent>
            </Card>
          ) : (
            pendingPayments.map((commitment) => {
              const timeLeft = getTimeRemaining(commitment.payment_deadline);
              const isUrgent = timeLeft.includes('h') && parseInt(timeLeft) < 1;

              return (
                <Card key={commitment.id} className={isUrgent ? 'border-destructive' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{commitment.group_buy_campaigns.products.name}</CardTitle>
                        <CardDescription>
                          Quantity: {commitment.quantity} × ₦{commitment.committed_price}
                        </CardDescription>
                      </div>
                      <Badge variant={isUrgent ? 'destructive' : 'default'}>
                        <Clock className="w-3 h-3 mr-1" />
                        {timeLeft}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">
                          Total: ₦{(Number(commitment.committed_price) * commitment.quantity).toFixed(2)}
                        </span>
                        <Button 
                          onClick={() => handlePayNow(commitment.id)}
                          disabled={paying === commitment.id || timeLeft === "Expired"}
                        >
                          {paying === commitment.id ? 'Processing...' : 'Pay Now'}
                        </Button>
                      </div>
                      {isUrgent && (
                        <p className="text-sm text-destructive">
                          ⚠️ Payment deadline approaching! Complete payment soon to secure your order.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          {paidCommitments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No paid commitments yet
              </CardContent>
            </Card>
          ) : (
            paidCommitments.map((commitment) => (
              <Card key={commitment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{commitment.group_buy_campaigns.products.name}</CardTitle>
                      <CardDescription>
                        Quantity: {commitment.quantity} × ₦{commitment.committed_price}
                      </CardDescription>
                    </div>
                    <Badge variant="default">
                      <Package className="w-3 h-3 mr-1" />
                      Paid
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">
                    Total: ₦{(Number(commitment.committed_price) * commitment.quantity).toFixed(2)}
                  </div>
                  {commitment.order_id && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Order ID: {commitment.order_id}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expiredCommitments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No expired commitments
              </CardContent>
            </Card>
          ) : (
            expiredCommitments.map((commitment) => (
              <Card key={commitment.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-muted-foreground">
                        {commitment.group_buy_campaigns.products.name}
                      </CardTitle>
                      <CardDescription>
                        Quantity: {commitment.quantity} × ₦{commitment.committed_price}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {commitment.status === 'refunded' ? 'Refunded' : 'Expired'}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
