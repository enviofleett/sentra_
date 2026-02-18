import ConsultantChatPanel from "@/components/consultant/ConsultantChatPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";

export interface ProductConsultantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  productBrand?: string | null;
  initialMessage?: string;
  sessionKey?: string;
  onRequireAccess?: () => void;
}

export default function ProductConsultantDrawer({
  open,
  onOpenChange,
  productName,
  productBrand,
  initialMessage,
  sessionKey,
  onRequireAccess,
}: ProductConsultantDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0"
        aria-label="Business advice"
      >
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">Iris</div>
                <div className="text-xs text-muted-foreground truncate">
                  {(productBrand ? `${productBrand} ` : "") + (productName || "Product")}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 p-4">
            <ConsultantChatPanel
              embedded
              className="h-full"
              initialMessage={initialMessage}
              sessionKey={sessionKey}
              onRequireAccess={onRequireAccess}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
