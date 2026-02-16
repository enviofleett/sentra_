
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Bot, Settings, Users } from "lucide-react";

interface AgentPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
}

export default function AgentPlansManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AgentPlan | null>(null);
  
  // Trial Settings State
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialDays, setTrialDays] = useState(7);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isGrantingTrial, setIsGrantingTrial] = useState(false);

  // Fetch Trial Settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "agent_trial_config")
        .single();
      
      if (data?.value) {
        // Safe casting from JSON
        const config = data.value as any;
        setTrialEnabled(config.enabled || false);
        setTrialDays(config.days || 7);
      }
    };
    fetchSettings();
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "",
    features: "",
    is_active: true,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["agent-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_plans" as any)
        .select("*")
        .order("price", { ascending: true });

      if (error) throw error;
      
      // Parse features JSONB to string array if needed, handled automatically by Supabase client usually
      return (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : []
      })) as AgentPlan[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newPlan: any) => {
      const { error } = await supabase.from("agent_plans" as any).insert([newPlan]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-plans"] });
      setIsDialogOpen(false);
      toast.success("Plan created successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error creating plan: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (plan: any) => {
      const { id, ...updates } = plan;
      const { error } = await supabase
        .from("agent_plans" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-plans"] });
      setIsDialogOpen(false);
      toast.success("Plan updated successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error updating plan: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agent_plans" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-plans"] });
      toast.success("Plan deleted successfully");
    },
    onError: (error) => {
      toast.error(`Error deleting plan: ${error.message}`);
    },
  });

  const handleSaveTrialSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from("app_config")
        .upsert(
          {
            key: "agent_trial_config",
            value: { enabled: trialEnabled, days: trialDays },
            description: "Configuration for new user AI Agent trial",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;
      toast.success("Trial settings saved successfully");
    } catch (error: any) {
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleGrantTrialToAll = async () => {
    if (!confirm(`Are you sure you want to grant a ${trialDays}-day free trial to ALL existing users who don't have a subscription? This cannot be undone.`)) {
      return;
    }

    setIsGrantingTrial(true);
    try {
      const { data, error } = await supabase.rpc("admin_grant_trial_to_all" as any, {
        p_days: trialDays
      });

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("schema cache") || msg.includes("not found") || (error as any).code === "404") {
          const { data: fnData, error: fnError } = await supabase.functions.invoke("admin-grant-trial", {
            body: { days: trialDays }
          });
          if (fnError) throw fnError;
          const granted = fnData?.granted ?? 0;
          toast.success(`Successfully granted trial to ${granted} users.`);
        } else {
          throw error;
        }
      } else {
        toast.success(`Successfully granted trial to ${data} users.`);
      }
    } catch (error: any) {
      toast.error(`Failed to grant trials: ${error.message}`);
    } finally {
      setIsGrantingTrial(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse features from comma-separated string
    const featuresList = formData.features
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const payload = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      duration_days: parseInt(formData.duration_days),
      features: featuresList, // Supabase handles array -> jsonb
      is_active: formData.is_active,
    };

    if (editingPlan) {
      updateMutation.mutate({ ...payload, id: editingPlan.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (plan: AgentPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      features: plan.features.join("\n"),
      is_active: plan.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      duration_days: "",
      features: "",
      is_active: true,
    });
  };

  return (
    <div className="space-y-8">
      {/* Trial Settings Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Trial Settings</CardTitle>
          </div>
          <CardDescription>Configure free trials for the AI Consultant.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">New Users (Automatic)</h3>
              <div className="flex items-center justify-between border p-3 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="trial-enabled">Enable Trial on Sign-up</Label>
                  <p className="text-xs text-muted-foreground">Automatically grant trial to new registrations</p>
                </div>
                <Switch
                  id="trial-enabled"
                  checked={trialEnabled}
                  onCheckedChange={setTrialEnabled}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trial-days">Trial Duration (Days)</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min="1"
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                />
              </div>
              <Button onClick={handleSaveTrialSettings} disabled={isSavingSettings}>
                {isSavingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </div>

            <div className="space-y-4 border-l pl-0 md:pl-8">
              <h3 className="font-medium text-sm text-muted-foreground">Existing Users (Manual)</h3>
              <div className="p-4 bg-secondary/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Bulk Action</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Grant a <strong>{trialDays}-day free trial</strong> to all existing users who do not have an active or past subscription.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-amber-200 hover:bg-amber-50 dark:border-amber-900/50 dark:hover:bg-amber-900/20"
                  onClick={handleGrantTrialToAll}
                  disabled={isGrantingTrial || trialDays < 1}
                >
                  {isGrantingTrial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Grant Trial to All Eligible Users
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Consultant Plans</h1>
            <p className="text-muted-foreground">
              Manage subscription tiers for the AI business consultant.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Weekly Pass"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short marketing description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price (₦)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration (Days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="features">Features (One per line)</Label>
                  <Textarea
                    id="features"
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    placeholder="Unlimited Chat&#10;Market Analysis&#10;Priority Support"
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active (Visible to users)</Label>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (plans || [])?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No plans found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                (plans || [])?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        {plan.name}
                      </div>
                    </TableCell>
                    <TableCell>₦{plan.price.toLocaleString()}</TableCell>
                    <TableCell>{plan.duration_days} Days</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {plan.features.slice(0, 2).map((f, i) => (
                          <span key={i} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            {f}
                          </span>
                        ))}
                        {plan.features.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{plan.features.length - 2} more</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        plan.is_active 
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" 
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm("Are you sure? This will delete the plan.")) {
                              deleteMutation.mutate(plan.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
