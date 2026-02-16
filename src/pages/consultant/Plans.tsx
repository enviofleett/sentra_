
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CONSULTANT_FREE_ACCESS_END_LABEL, isConsultantFreeAccessActive } from "@/utils/consultantAccess";

interface AgentPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  features: string[];
}

export default function ConsultantPlans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const freeAccessActive = isConsultantFreeAccessActive();

  const returnTo = useMemo(() => {
    const rt = searchParams.get("return_to");
    return rt ? rt : null;
  }, [searchParams]);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["active-agent-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      
      return data.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : []
      })) as AgentPlan[];
    },
  });

  const handleSubscribe = async (plan: AgentPlan) => {
    if (freeAccessActive) {
      navigate(returnTo || "/consultant");
      return;
    }

    if (!user) {
      toast.error("Please login to subscribe");
      const redirect = returnTo ? `/consultant/plans?return_to=${encodeURIComponent(returnTo)}` : "/consultant/plans";
      navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    setProcessingId(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("initialize-subscription-payment", {
        body: {
          plan_id: plan.id,
          user_id: user.id,
          user_email: user.email,
          return_to: returnTo,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (!data.paymentUrl) throw new Error("No payment URL returned");

      window.location.href = data.paymentUrl;
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error.message || "Failed to initialize payment");
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            AI Business Consultant
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Unlock Your Personal Strategy Expert</h1>
          <p className="text-xl text-muted-foreground">
            {freeAccessActive
              ? `Free for everyone until ${CONSULTANT_FREE_ACCESS_END_LABEL}.`
              : "Get instant advice on pricing, market trends, and sales strategies. Choose a pass that fits your needs."}
          </p>
          {freeAccessActive && (
            <div className="mt-6">
              <Button size="lg" onClick={() => navigate(returnTo || "/consultant")}>
                Start Free Consultant Access
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans?.map((plan) => (
              <Card key={plan.id} className="flex flex-col relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">₦{plan.price.toLocaleString()}</span>
                    <span className="text-muted-foreground"> / {plan.duration_days} days</span>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => handleSubscribe(plan)}
                    disabled={freeAccessActive || !!processingId}
                  >
                    {processingId === plan.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      freeAccessActive ? "Included (Free)" : "Get Access"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
