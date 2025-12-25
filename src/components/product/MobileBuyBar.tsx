import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface MobileBuyBarProps {
  price: number;
  originalPrice?: number | null;
  onAddToCart: () => void;
  onJoinCircle?: () => void;
  hasGroupBuy?: boolean;
  groupBuyPrice?: number;
  disabled?: boolean;
  isVisible?: boolean;
}

export const MobileBuyBar = ({
  price,
  originalPrice,
  onAddToCart,
  onJoinCircle,
  hasGroupBuy = false,
  groupBuyPrice,
  disabled = false,
  isVisible = true,
}: MobileBuyBarProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        >
          <div className="glass border-t border-border/50 px-4 py-3 safe-area-pb">
            <div className="flex items-center justify-between gap-4">
              {/* Price Display */}
              <div className="flex flex-col">
                {hasGroupBuy && groupBuyPrice ? (
                  <>
                    <span className="text-lg font-bold text-secondary">
                      ₦{groupBuyPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      ₦{price.toLocaleString()}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg font-bold text-foreground">
                      ₦{price.toLocaleString()}
                    </span>
                    {originalPrice && originalPrice > price && (
                      <span className="text-xs text-muted-foreground line-through">
                        ₦{originalPrice.toLocaleString()}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Action Button */}
              <div className="flex-1 max-w-[200px]">
                {hasGroupBuy && onJoinCircle ? (
                  <Button
                    onClick={onJoinCircle}
                    disabled={disabled}
                    className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium text-sm"
                  >
                    Join Circle
                  </Button>
                ) : (
                  <Button
                    onClick={onAddToCart}
                    disabled={disabled}
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm"
                  >
                    Secure Your Bottle
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
