import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import ConsultantChatPanel from "@/components/consultant/ConsultantChatPanel";

export default function ConsultantChat() {
  const [searchParams] = useSearchParams();

  const initialMessage = useMemo(() => {
    const init = searchParams.get("init");
    if (!init) return undefined;
    try {
      return decodeURIComponent(init);
    } catch {
      return init;
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col h-[calc(100vh-80px)]">
        <ConsultantChatPanel embedded={false} initialMessage={initialMessage} sessionKey={initialMessage} />
      </main>
      <Footer />
    </div>
  );
}

