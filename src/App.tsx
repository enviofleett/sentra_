import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { BrandingProvider } from "./hooks/useBranding";
import { LaunchOverlay } from "./components/layout/LaunchOverlay";
import { MembershipGuard } from "./components/layout/MembershipGuard";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrandingProvider>
            <CartProvider>
              <LaunchOverlay>
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/products" element={<MembershipGuard><Products /></MembershipGuard>} />
                <Route path="/products/:id" element={<MembershipGuard><ProductDetail /></MembershipGuard>} />
                <Route path="/cart" element={<MembershipGuard><Cart /></MembershipGuard>} />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />
                <Route path="/orders/:orderId/track" element={<OrderTracking />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile/*" element={<Profile />} />
                <Route path="/admin/*" element={<AdminDashboard />} />
                <Route path="/membership/topup" element={<MembershipTopUp />} />
                <Route path="/articles/:slug" element={<ArticleDetail />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </LaunchOverlay>
            </CartProvider>
          </BrandingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
