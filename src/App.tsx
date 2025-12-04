import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Spaces from "./pages/Spaces";
import SpaceDetail from "./pages/SpaceDetail";
import ReportDetail from "./pages/ReportDetail";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import MainLayout from "./components/MainLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/spaces" element={<MainLayout><Spaces /></MainLayout>} />
          <Route path="/spaces/:spaceId" element={<MainLayout><SpaceDetail /></MainLayout>} />
          <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
          <Route path="/reports/:reportId" element={<MainLayout><ReportDetail /></MainLayout>} />
          <Route path="/admin" element={<MainLayout><Admin /></MainLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
