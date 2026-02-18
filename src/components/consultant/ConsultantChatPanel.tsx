import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversationContext } from "@/contexts/ConversationContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, ChevronDown, ChevronUp, Loader2, Lock, Paperclip, Send, Sparkles, User, X } from "lucide-react";
import { toast } from "sonner";
import { isConsultantFreeAccessActive } from "@/utils/consultantAccess";
import { capturePageContext, type PageContext } from "@/utils/pageContext";
import { resolveStartupMode } from "@/components/consultant/startupMode";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image_url?: string | null;
}

interface ConsultantMessageRecord {
  role: "user" | "assistant" | "system";
  content: string;
  image_url?: string | null;
}

interface ConsultantSessionRecord {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

const CONSULTANT_SESSIONS_TABLE = "consultant_sessions" as never;
const CONSULTANT_MESSAGES_TABLE = "consultant_messages" as never;
const CONSULTANT_ENGAGEMENTS_TABLE = "consultant_engagements" as never;

const createMessageId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
};

export interface ConsultantChatPanelProps {
  embedded?: boolean;
  className?: string;
  initialMessage?: string;
  sessionKey?: string;
  forcedSessionId?: string;
  onRequireAccess?: () => void;
  cartContextSummary?: string;
  proactiveStarter?: boolean;
}

export default function ConsultantChatPanel({
  embedded = false,
  className,
  initialMessage,
  sessionKey,
  forcedSessionId,
  onRequireAccess,
  cartContextSummary,
  proactiveStarter = true,
}: ConsultantChatPanelProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const conversation = useConversationContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [sessionArchive, setSessionArchive] = useState<ConsultantSessionRecord[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Prevent repeated auto-start sends on state churn.
  const startupTriggeredRef = useRef(false);
  const initialKey = useMemo(() => {
    const raw = sessionKey || initialMessage || "";
    return raw ? `init:${raw}` : null;
  }, [sessionKey, initialMessage]);

  useEffect(() => {
    if (!loading && !user) {
      // Most embedded usages are already behind guards; keep a safe fallback.
      const redirectPath = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth?redirect=${redirectPath}`);
    }
  }, [user, loading, navigate, location.pathname, location.search]);

  const persistentKey = useMemo(() => sessionKey || "global", [sessionKey]);

  useEffect(() => {
    if (user) {
      checkSubscription();
      loadActiveSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, forcedSessionId, persistentKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const checkSubscription = async () => {
    if (!user) return;
    if (isConsultantFreeAccessActive()) {
      setHasAccess(true);
      return;
    }

    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin) {
      setHasAccess(true);
      return;
    }

    const { data: hasSub, error } = await supabase.rpc("has_active_agent_subscription", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error checking subscription:", error);
      setHasAccess(false);
      return;
    }

    setHasAccess(hasSub);
  };

  const loadSessionArchive = async () => {
    if (!user) return;
    setArchiveLoading(true);
    const { data, error } = await supabase
      .from(CONSULTANT_SESSIONS_TABLE)
      .select("id,title,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Error loading session archive:", error);
      setArchiveLoading(false);
      return;
    }
    setSessionArchive((data || []) as ConsultantSessionRecord[]);
    setArchiveLoading(false);
  };

  const loadActiveSession = async () => {
    if (!user) return;
    setSessionHydrated(false);
    void loadSessionArchive();
    if (forcedSessionId) {
      setSessionId(forcedSessionId);
      conversation.setSessionIdForKey(persistentKey, forcedSessionId);
      await loadMessages(forcedSessionId);
      setSessionHydrated(true);
      return;
    }
    const existing = conversation.getSessionIdForKey(persistentKey);
    if (existing) {
      setSessionId(existing);
      await loadMessages(existing);
      setSessionHydrated(true);
      return;
    }

    const { data: newSession, error } = await supabase
      .from(CONSULTANT_SESSIONS_TABLE)
      .insert({ user_id: user.id, title: "New Conversation" })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return;
    }

    if (newSession?.id) {
      setSessionId(newSession.id);
      conversation.setSessionIdForKey(persistentKey, newSession.id);
      await loadMessages(newSession.id);
      setSessionHydrated(true);
    }
  };

  const loadMessages = async (sid: string) => {
    const { data, error } = await supabase
      .from(CONSULTANT_MESSAGES_TABLE)
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    if (data) {
      setMessages(
        (data as ConsultantMessageRecord[]).map((m) => ({
          id: createMessageId(),
          role: m.role,
          content: m.content,
          image_url: m.image_url,
        })),
      );
    }
    if (!data) setMessages([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Max 5MB.");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleNewChat = async () => {
    setMessages([]);
    setIsTyping(false);
    clearImage();
    if (!user) return;

    const { data: newSession, error } = await supabase
      .from(CONSULTANT_SESSIONS_TABLE)
      .insert({ user_id: user.id, title: "New Conversation" })
      .select()
      .single();

    if (error) {
      console.error("Error creating session:", error);
      return;
    }

    if (newSession?.id) {
      setSessionId(newSession.id);
      conversation.setSessionIdForKey(persistentKey, newSession.id);
      setSessionHydrated(true);
      await loadSessionArchive();
    }
  };

  const handleSelectSession = async (targetSessionId: string) => {
    if (!targetSessionId || targetSessionId === sessionId) return;
    setIsTyping(false);
    clearImage();
    setSessionId(targetSessionId);
    conversation.setSessionIdForKey(persistentKey, targetSessionId);
    await loadMessages(targetSessionId);
    setSessionHydrated(true);
  };

  const handleRequireAccess = () => {
    if (onRequireAccess) return onRequireAccess();
    navigate("/consultant/plans");
  };

  const captureSafePageContext = (): PageContext | null => {
    try {
      return capturePageContext({
        path: location.pathname,
        url: location.pathname + location.search,
      });
    } catch {
      return {
        url: location.pathname + location.search,
        path: location.pathname,
        title: typeof document !== "undefined" ? document.title || "Current page" : "Current page",
        headings: [],
        primaryActions: [],
        visibleErrors: [],
        recentRuntimeErrors: [],
        capturedAt: new Date().toISOString(),
      };
    }
  };

  const ensureActiveSession = async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!user) return null;
    const { data: newSession, error } = await supabase
      .from(CONSULTANT_SESSIONS_TABLE)
      .insert({ user_id: user.id, title: "New Conversation" })
      .select()
      .single();
    if (error || !newSession?.id) {
      console.error("Error creating session:", error);
      return null;
    }
    setSessionId(newSession.id);
    conversation.setSessionIdForKey(persistentKey, newSession.id);
    setSessionHydrated(true);
    await loadSessionArchive();
    return newSession.id;
  };

  const executeAssistantRequest = async (params: {
    outgoingMessages: Message[];
    currentSessionId: string | null;
    imageUrl: string | null;
    assistantStarter: boolean;
    pageContext: PageContext | null;
  }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-business-consultant`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        messages: params.outgoingMessages.map((m) => ({ role: m.role, content: m.content, image_url: m.image_url })),
        session_id: params.currentSessionId,
        image_url: params.imageUrl,
        assistant_starter: params.assistantStarter,
        page_context: params.pageContext,
        // Default to reseller-first behavior unless the app sets something more explicit later.
        preferences: { mode: "reseller", require_user_initiation: true },
        cart_context: cartContextSummary ? { summary: cartContextSummary } : null,
        product_context: conversation.state.lastProduct || null,
        page_url: location.pathname + location.search,
        browsing_history: conversation.state.browsingHistory,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        toast.error("Please sign in to continue.");
        navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      if (response.status === 403 && errorText.includes("NO_SUBSCRIPTION")) {
        setHasAccess(false);
        handleRequireAccess();
        return;
      }
      throw new Error(`Failed to send message: ${response.status} ${errorText}`);
    }

    try {
      await supabase.from(CONSULTANT_ENGAGEMENTS_TABLE).insert({
        user_id: user?.id || null,
        session_id: params.currentSessionId || null,
        event_type: params.assistantStarter ? "consultant_starter_sent" : "message_sent",
      });
    } catch {
      // Non-blocking metrics write.
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error("No reader available");

    let aiContent = "";
    const assistantMessageId = createMessageId();
    setMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line) continue;
        if (line.startsWith(":")) continue;
        if (line === "data: [DONE]") continue;
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = json?.choices?.[0]?.delta;
          const text = typeof delta?.content === "string" ? delta.content : "";
          if (!text) continue;
          aiContent += text;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId && message.role === "assistant"
                ? { ...message, content: aiContent }
                : message,
            ),
          );
        } catch {
          // ignore partial lines
        }
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customMessage?: string) => {
    e?.preventDefault();

    const messageToSend = customMessage || input;
    if ((!messageToSend.trim() && !selectedImage) || isTyping) return;

    if (user && !isConsultantFreeAccessActive()) {
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (!isAdmin) {
        const { data: hasSub } = await supabase.rpc("has_active_agent_subscription", { p_user_id: user.id });
        if (!hasSub) {
          toast.error("You need an active pass to chat.");
          setHasAccess(false);
          handleRequireAccess();
          return;
        }
      }
    }

    let imageUrl: string | null = null;
    if (selectedImage) {
      const fileExt = selectedImage.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(filePath, selectedImage);
      if (uploadError) {
        toast.error("Failed to upload image");
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);
      imageUrl = publicUrlData.publicUrl;
    }

    const userMessageContent = messageToSend.trim().replace(/\*/g, "");
    if (!customMessage) {
      setInput("");
      clearImage();
    }

    const newMessage: Message = { id: createMessageId(), role: "user", content: userMessageContent, image_url: imageUrl };
    setMessages((prev) => [...prev, newMessage]);
    setIsTyping(true);

    const currentSessionId = await ensureActiveSession();

    try {
      await executeAssistantRequest({
        outgoingMessages: [...messages, newMessage],
        currentSessionId,
        imageUrl,
        assistantStarter: false,
        pageContext: captureSafePageContext(),
      });
    } catch (error) {
      console.error("Chat execution error:", error);
      toast.error(`Error: ${getErrorMessage(error)}`);
    } finally {
      setIsTyping(false);
      void loadSessionArchive();
    }
  };

  const sendAssistantStarterOnOpen = async () => {
    if (!user || !hasAccess || isTyping) return;
    const currentSessionId = await ensureActiveSession();
    setIsTyping(true);
    try {
      await executeAssistantRequest({
        outgoingMessages: messages,
        currentSessionId,
        imageUrl: null,
        assistantStarter: true,
        pageContext: captureSafePageContext(),
      });
    } catch (error) {
      console.error("Starter execution error:", error);
      toast.error(`Error: ${getErrorMessage(error)}`);
    } finally {
      setIsTyping(false);
      void loadSessionArchive();
    }
  };

  useEffect(() => {
    const mode = resolveStartupMode({
      hasAccess: hasAccess === true,
      hasUser: Boolean(user),
      hasSession: Boolean(sessionId) && sessionHydrated,
      messageCount: messages.length,
      hasInitialMessage: Boolean(initialMessage && initialMessage.trim()),
      proactiveStarter,
      hasTriggered: startupTriggeredRef.current,
    });
    if (mode === "none") return;

    startupTriggeredRef.current = true;
    if (mode === "initial_message") {
      void handleSendMessage(undefined, initialMessage);
      return;
    }
    void sendAssistantStarterOnOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasAccess, sessionId, sessionHydrated, messages.length, initialKey, proactiveStarter]);

  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({});
  const archiveGroups = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" });
    const grouped = new Map<string, ConsultantSessionRecord[]>();
    for (const session of sessionArchive) {
      const label = formatter.format(new Date(session.updated_at || session.created_at));
      const prev = grouped.get(label) || [];
      prev.push(session);
      grouped.set(label, prev);
    }
    return Array.from(grouped.entries()).map(([label, sessions]) => ({ label, sessions }));
  }, [sessionArchive]);

  const formatArchiveTime = (value: string) =>
    new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));

  const normalizeContent = (text: string) => {
    const disallowedStarts = [/^in summary:?/i, /^here'?s a strategy:?/i, /^conclusion:?/i];
    const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim());
    const filtered: string[] = [];
    for (const l of lines) {
      if (!l) continue;
      if (disallowedStarts.some((rx) => rx.test(l))) continue;
      if (filtered.length && filtered[filtered.length - 1].toLowerCase() === l.toLowerCase()) continue;
      filtered.push(l);
    }
    return filtered.join("\n");
  };

  const sanitizeMdInline = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*\*/g, "").replace(/\*/g, "");

  const renderAssistantBlocks = (raw: string, idx: number) => {
    const text = normalizeContent(raw);
    const lines = text.split("\n");
    const blocks: JSX.Element[] = [];
    let blockKey = 0;
    let listItems: string[] = [];
    let listType: "ul" | "ol" | null = null;
    let para: string[] = [];
    let headingCount = 0;
    let cardCount = 0;
    const nextBlockKey = () => `blk-${idx}-${++blockKey}`;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        if (listType === "ul") {
          const listKey = nextBlockKey();
          blocks.push(
            <ul key={listKey} className="list-disc pl-6">
              {listItems.map((it, i) => (
                <li key={`${listKey}-li-${i}`}>{it}</li>
              ))}
            </ul>,
          );
        } else {
          const listKey = nextBlockKey();
          blocks.push(
            <ol key={listKey} className="list-decimal pl-6">
              {listItems.map((it, i) => (
                <li key={`${listKey}-li-${i}`}>{it}</li>
              ))}
            </ol>,
          );
        }
      }
      listItems = [];
      listType = null;
    };

    const flushPara = () => {
      if (para.length > 0) blocks.push(<p key={nextBlockKey()}>{para.join(" ")}</p>);
      para = [];
    };

    const pushProductCard = (cardIndex: number, cardLines: string[]) => {
      const data: Record<string, string> = {};
      for (const line of cardLines) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        const key = line
          .slice(0, idx)
          .trim()
          .toLowerCase();
        const value = line.slice(idx + 1).trim();
        if (!key) continue;
        data[key] = value;
      }
      const id = (data["id"] || "").trim();
      const name = (data["name"] || "").trim();
      const price = (data["price"] || "").trim();
      const image = (data["image"] || "").trim();
      const reason = (data["reason"] || "").trim();

      blocks.push(
        <Card key={`card-${idx}-${cardIndex}-${nextBlockKey()}`} className="border-primary/40 bg-background/80">
          <div className="flex gap-3">
            {image && (
              <img src={image} alt={name || id || "Product"} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
            )}
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Suggested product</div>
              <div className="text-sm font-semibold">{name || "Recommended item"}</div>
              {price && <div className="text-sm text-foreground">{price}</div>}
              {id && <div className="text-[11px] text-muted-foreground">ID: {id}</div>}
              {reason && <p className="text-xs text-muted-foreground mt-1">{reason}</p>}
            </div>
          </div>
        </Card>,
      );
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();
      if (!t) {
        flushList();
        flushPara();
        continue;
      }

      if (t === "[PRODUCT_CARD]") {
        flushList();
        flushPara();
        const cardLines: string[] = [];
        i++;
        while (i < lines.length) {
          const inner = lines[i].trim();
          if (inner === "[/PRODUCT_CARD]") break;
          if (inner) cardLines.push(inner);
          i++;
        }
        if (cardLines.length > 0) {
          cardCount += 1;
          pushProductCard(cardCount, cardLines);
        }
        continue;
      }

      if (/^(\*|-)\s+/.test(t)) {
        flushPara();
        const content = sanitizeMdInline(t.replace(/^(\*|-)\s+/, ""));
        if (listType !== "ul") {
          flushList();
          listType = "ul";
        }
        listItems.push(content);
        continue;
      }

      if (/^\d+\.\s+/.test(t)) {
        flushPara();
        const content = sanitizeMdInline(t.replace(/^\d+\.\s+/, ""));
        if (listType !== "ol") {
          flushList();
          listType = "ol";
        }
        listItems.push(content);
        continue;
      }

      if (/^#{1,3}\s+/.test(t)) {
        flushList();
        flushPara();
        const lvl = t.startsWith("###") ? 3 : t.startsWith("##") ? 2 : 1;
        const content = sanitizeMdInline(t.replace(/^#{1,3}\s+/, ""));
        headingCount++;
        const key = `h-${idx}-${headingCount}`;
        if (lvl === 1) blocks.push(<h3 key={key} className="text-base font-semibold mt-2">{content}</h3>);
        else if (lvl === 2) blocks.push(<h4 key={key} className="text-sm font-semibold mt-2">{content}</h4>);
        else blocks.push(<h5 key={key} className="text-sm font-medium mt-2">{content}</h5>);
        continue;
      }

      if (t.length > 280) {
        flushList();
        flushPara();
        const isExpanded = !!expandedMap[idx];
        blocks.push(
          <div className="space-y-2" key={`p-${idx}-${blocks.length}`}>
            <p>{isExpanded ? t : `${t.slice(0, 280)}...`}</p>
            <button
              type="button"
              onClick={() => setExpandedMap((m) => ({ ...m, [idx]: !m[idx] }))}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  Show less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Read more <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          </div>,
        );
        continue;
      }

      flushList();
      para.push(sanitizeMdInline(t));
    }

    flushList();
    flushPara();
    return <div className="space-y-2">{blocks}</div>;
  };

  if (loading || hasAccess === null) {
    return (
      <div className={className || ""}>
        <div className={`flex items-center justify-center ${embedded ? "h-full" : "min-h-[50vh]"}`}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={className || ""}>
        <Card className={`${embedded ? "p-4" : "max-w-md w-full p-8"} text-center space-y-4`}>
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Access Required</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              You need an active Consultant Access Pass to use the AI Business Advisor.
            </p>
          </div>
          <Button onClick={handleRequireAccess} className="w-full" size="lg">
            View Plans
          </Button>
        </Card>
      </div>
    );
  }

  const archivePanel = (
    <Card className="border md:h-full md:min-h-0">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">Archived Chats</h2>
        <p className="text-xs text-muted-foreground">Grouped by date and subject</p>
      </div>
      <ScrollArea className="max-h-56 md:max-h-none md:h-[calc(100vh-260px)]">
        <div className="p-3 space-y-3">
          {archiveLoading && <p className="text-xs text-muted-foreground">Loading archive...</p>}
          {!archiveLoading && archiveGroups.length === 0 && (
            <p className="text-xs text-muted-foreground">No previous chats yet.</p>
          )}
          {!archiveLoading &&
            archiveGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{group.label}</p>
                {group.sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => void handleSelectSession(session.id)}
                    className={`w-full text-left rounded-md px-2 py-1.5 border text-xs ${
                      session.id === sessionId ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <p className="font-medium truncate">{session.title?.trim() || "New Conversation"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatArchiveTime(session.updated_at || session.created_at)}
                    </p>
                  </button>
                ))}
              </div>
            ))}
        </div>
      </ScrollArea>
    </Card>
  );

  const chatCard = (
    <Card className={`flex-1 flex flex-col overflow-hidden border-2 ${embedded ? "min-h-0" : "min-h-0 h-full"}`}>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground space-y-4">
                <Bot className="h-12 w-12 mx-auto opacity-20" />
                <p>Ask me about pricing, market trends, or sales strategies for your perfumes.</p>
                {!embedded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg mx-auto mt-8">
                    <Button
                      variant="outline"
                      className="text-xs h-auto py-2 whitespace-normal text-left justify-start"
                      onClick={() => {
                        setInput("What are the top selling woody scents?");
                        handleSendMessage();
                      }}
                    >
                      "What are the top selling woody scents?"
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs h-auto py-2 whitespace-normal text-left justify-start"
                      onClick={() => {
                        setInput("How should I price my new stock?");
                        handleSendMessage();
                      }}
                    >
                      "How should I price my new stock?"
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs h-auto py-2 whitespace-normal text-left justify-start"
                      onClick={() => {
                        setInput("Suggest a perfume layering combination.");
                        handleSendMessage();
                      }}
                    >
                      "Suggest a perfume layering combination."
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs h-auto py-2 whitespace-normal text-left justify-start"
                      onClick={() => {
                        setInput("How do I sell to luxury clients?");
                        handleSendMessage();
                      }}
                    >
                      "How do I sell to luxury clients?"
                    </Button>
                  </div>
                )}
              </div>
            )}

            {messages.map((m, messageIndex) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src="/bot-avatar.png" />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted prose prose-base md:prose-lg prose-headings:mt-3 prose-headings:mb-2"
                  }`}
                >
                  {m.image_url && (
                    <img src={m.image_url} alt="Attachment" className="max-w-full h-auto rounded-md mb-2 max-h-60" />
                  )}
                  {m.role === "assistant" ? renderAssistantBlocks(m.content, messageIndex) : sanitizeMdInline(m.content)}
                </div>
                {m.role === "user" && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></span>
                  <span
                    className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></span>
                  <span
                    className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background">
          {imagePreview && (
            <div className="max-w-3xl mx-auto mb-2 relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 w-auto rounded border" />
              <Button
                size="icon"
                variant="destructive"
                className="h-5 w-5 absolute -top-2 -right-2 rounded-full"
                onClick={clearImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question to start..."
              disabled={isTyping}
              className="flex-1"
            />
            <Button type="submit" disabled={(!input.trim() && !selectedImage) || isTyping}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
  );

  if (embedded) {
    return <div className={`${className || ""} flex flex-col h-full`}>{chatCard}</div>;
  }

  return (
    <div className={`${className || ""} flex flex-col h-full`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Iris</h1>
            <p className="text-xs text-muted-foreground">Expert Business Advice</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleNewChat}>
          New Chat
        </Button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-4">
        {archivePanel}
        <div className="min-h-0">{chatCard}</div>
      </div>
    </div>
  );
}
