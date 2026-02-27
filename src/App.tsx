import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PasscodeProvider } from "@/contexts/PasscodeContext";
import { CollectionProvider } from "@/contexts/CollectionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/AppLayout";
import { SplashScreen } from "@/components/SplashScreen";
import { OfflineBanner } from "@/components/OfflineBanner";

// Lazy-loaded pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Log = lazy(() => import("./pages/Log"));
const Feed = lazy(() => import("./pages/Feed"));
const Profile = lazy(() => import("./pages/Profile"));
const WatchDetail = lazy(() => import("./pages/WatchDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const WearLogsAdmin = lazy(() => import("./pages/WearLogsAdmin"));
const Auth = lazy(() => import("./pages/Auth"));
const Settings = lazy(() => import("./pages/Settings"));
const FAQ = lazy(() => import("./pages/FAQ"));
const About = lazy(() => import("./pages/About"));
const VaultPal = lazy(() => import("./pages/VaultPal"));
const TradeRules = lazy(() => import("./pages/TradeRules"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <OfflineBanner />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            {/* Core 4 tabs */}
            <Route path="/" element={<ProtectedRoute><AppLayout><Home /></AppLayout></ProtectedRoute>} />
            <Route path="/log" element={<ProtectedRoute><AppLayout><Log /></AppLayout></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><AppLayout><Feed /></AppLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
            
            {/* Utility pages */}
            <Route path="/vault-pal" element={<ProtectedRoute><AppLayout><VaultPal /></AppLayout></ProtectedRoute>} />
            <Route path="/watch/:id" element={<ProtectedRoute><WatchDetail /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/admin/wear-logs" element={<ProtectedRoute><WearLogsAdmin /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/faq" element={<ProtectedRoute><FAQ /></ProtectedRoute>} />
            <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
            <Route path="/trade-rules" element={<ProtectedRoute><AppLayout><TradeRules /></AppLayout></ProtectedRoute>} />
            
            {/* Legacy redirects */}
            <Route path="/collection" element={<Navigate to="/profile" replace />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/social" element={<Navigate to="/feed" replace />} />
            <Route path="/messages" element={<Navigate to="/feed?tab=messages" replace />} />
            <Route path="/forum" element={<Navigate to="/feed?tab=forum" replace />} />
            <Route path="/usage-details" element={<Navigate to="/log" replace />} />
            <Route path="/personal-notes" element={<Navigate to="/profile" replace />} />
            <Route path="/wishlist" element={<Navigate to="/profile?tab=wishlist" replace />} />
            <Route path="/trips" element={<Navigate to="/log" replace />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <PasscodeProvider>
          <CollectionProvider>
            <TooltipProvider>
              <AppContent />
            </TooltipProvider>
          </CollectionProvider>
        </PasscodeProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
