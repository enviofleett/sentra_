import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";

interface ConsultantSessionRecord {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export default function ConsultantArchiveProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ConsultantSessionRecord[]>([]);

  useEffect(() => {
    void loadArchive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadArchive = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("consultant_sessions")
      .select("id,title,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error loading consultant archive from profile:", error);
      setLoading(false);
      return;
    }

    setSessions((data || []) as ConsultantSessionRecord[]);
    setLoading(false);
  };

  const groupedByDate = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" });
    const groups = new Map<string, ConsultantSessionRecord[]>();
    for (const session of sessions) {
      const label = formatter.format(new Date(session.updated_at || session.created_at));
      const prev = groups.get(label) || [];
      prev.push(session);
      groups.set(label, prev);
    }
    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }, [sessions]);

  const formatTime = (value: string) =>
    new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Consultant Archive
          </h2>
          <p className="text-sm text-muted-foreground">Browse your previous chats by date and subject.</p>
        </div>
        <Button asChild>
          <Link to="/consultant">Open Iris</Link>
        </Button>
      </div>

      {groupedByDate.length === 0 ? (
        <p className="text-sm text-muted-foreground">No archived chats yet.</p>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{group.label}</p>
              <div className="space-y-2">
                {group.items.map((session) => (
                  <Link
                    key={session.id}
                    to={`/consultant?session=${encodeURIComponent(session.id)}`}
                    className="block rounded-lg border px-3 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <p className="font-medium text-sm truncate">{session.title?.trim() || "New Conversation"}</p>
                    <p className="text-xs text-muted-foreground">
                      Last active {formatTime(session.updated_at || session.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
