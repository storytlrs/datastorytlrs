import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TranslationProvider } from "@/contexts/TranslationContext";
import Auth from "./pages/Auth";
import DashboardRedirect from "./pages/DashboardRedirect";
import BrandDetail from "./pages/BrandDetail";
import ReportDetail from "./pages/ReportDetail";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/MainLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AIChatProvider } from "./components/chat/AIChatProvider";
import AIChatButton from "./components/chat/AIChatButton";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TranslationProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AIChatProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<MainLayout><DashboardRedirect /></MainLayout>} />
          <Route path="/brands/:brandId" element={<MainLayout><BrandDetail /></MainLayout>} />
          <Route path="/reports/:reportId" element={<MainLayout><ReportDetail /></MainLayout>} />
          <Route 
            path="/admin" 
            element={
              <MainLayout>
                <ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              </MainLayout>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AIChatButton />
        </AIChatProvider>
      </BrowserRouter>
    </TooltipProvider>
    </TranslationProvider>
  </QueryClientProvider>
);

export default App;
