import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ConversationProvider } from "./contexts/ConversationContext";
import { CartProvider } from "./contexts/CartContext";
import { BrandingProvider } from "./hooks/useBranding";
import { LaunchOverlay } from "./components/layout/LaunchOverlay";
import { MembershipGuard } from "./components/layout/MembershipGuard";
import { WhatsAppButton } from "./components/layout/WhatsAppButton";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import OrderTracking from "./pages/OrderTracking";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/Dashboard";
import MembershipTopUp from "./pages/membership/TopUp";
import ArticleDetail from "./pages/articles/ArticleDetail";
import ConsultantChat from "./pages/consultant/Chat";
import ConsultantPlans from "./pages/consultant/Plans";
import NotFound from "./pages/NotFound";
import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";

const queryClient = new QueryClient();

const AgentButton = () => {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) return null;
  if (location.pathname.startsWith("/consultant")) return null;
  const isProductDetail = location.pathname.startsWith("/products/") && location.pathname.length > 10;
  if (isProductDetail) return null;
  const bottomClass = "bottom-6 md:bottom-8";
  return (
    <Link
      to="/consultant"
      aria-label="Open AI Consultant"
      className={`fixed ${bottomClass} left-6 md:left-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform duration-300 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2`}
    >
      <Sparkles className="h-7 w-7" />
    </Link>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ConversationProvider>
          <BrandingProvider>
            <CartProvider>
              <LaunchOverlay>
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/products" element={<MembershipGuard><Products /></MembershipGuard>} />
                <Route path="/products/:id" element={<MembershipGuard><ProductDetail /></MembershipGuard>} />
                <Route path="/cart" element={<MembershipGuard><Cart /></MembershipGuard>} />
                <Route path="/checkout" element={<MembershipGuard><Checkout /></MembershipGuard>} />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />
                <Route path="/orders/:orderId/track" element={<OrderTracking />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile/*" element={<Profile />} />
                <Route path="/admin/*" element={<AdminDashboard />} />
                <Route path="/membership/topup" element={<MembershipTopUp />} />
                <Route path="/articles/:slug" element={<ArticleDetail />} />
                <Route path="/consultant" element={<ConsultantChat />} />
                <Route path="/consultant/plans" element={<ConsultantPlans />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </LaunchOverlay>
              <AgentButton />
              <WhatsAppButton />
            </CartProvider>
          </BrandingProvider>
          </ConversationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
