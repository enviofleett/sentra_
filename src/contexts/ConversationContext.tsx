import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface ProductConversationContext {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  price?: number | null;
  attributes?: Record<string, any> | null;
  image_url?: string | null;
  url?: string;
}

export interface ConversationState {
  lastSessionByKey: Record<string, string>;
  lastProduct: ProductConversationContext | null;
  browsingHistory: ProductConversationContext[];
}

interface ConversationContextValue {
  state: ConversationState;
  setCurrentProduct: (product: ProductConversationContext) => void;
  getSessionIdForKey: (key: string) => string | undefined;
  setSessionIdForKey: (key: string, id: string) => void;
}

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

const STORAGE_KEY = "sentra_conversation_state_v1";

export function loadConversationState(raw: string | null): ConversationState {
  if (!raw) {
    return {
      lastSessionByKey: {},
      lastProduct: null,
      browsingHistory: [],
    };
  }
  try {
    const parsed = JSON.parse(raw) as ConversationState;
    return {
      lastSessionByKey: parsed.lastSessionByKey || {},
      lastProduct: parsed.lastProduct || null,
      browsingHistory: Array.isArray(parsed.browsingHistory) ? parsed.browsingHistory : [],
    };
  } catch {
    return {
      lastSessionByKey: {},
      lastProduct: null,
      browsingHistory: [],
    };
  }
}

export function applyCurrentProduct(prev: ConversationState, product: ProductConversationContext): ConversationState {
  const existing = prev.browsingHistory.filter((p) => p.id !== product.id);
  const nextHistory = [product, ...existing].slice(0, 20);
  return {
    ...prev,
    lastProduct: product,
    browsingHistory: nextHistory,
  };
}

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConversationState>(() => {
    if (typeof window === "undefined") {
      return loadConversationState(null);
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return loadConversationState(raw);
    } catch {
      return loadConversationState(null);
    }
  });

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
    }
  }, [state]);

  const value = useMemo<ConversationContextValue>(
    () => ({
      state,
      setCurrentProduct: (product) => {
        setState((prev) => applyCurrentProduct(prev, product));
      },
      getSessionIdForKey: (key) => state.lastSessionByKey[key],
      setSessionIdForKey: (key, id) => {
        setState((prev) => ({
          ...prev,
          lastSessionByKey: {
            ...prev.lastSessionByKey,
            [key]: id,
          },
        }));
      },
    }),
    [state],
  );

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

export function useConversationContext() {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error("useConversationContext must be used within a ConversationProvider");
  }
  return ctx;
}
