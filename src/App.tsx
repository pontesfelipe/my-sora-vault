import { useState, lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PasscodeProvider } from "@/contexts/PasscodeContext";
import { CollectionProvider } from "@/contexts/CollectionContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/AppLayout";
import { SplashScreen } from "@/components/SplashScreen";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AnimatePresence, motion } from "framer-motion";
import { initNativeApp, configureBackButton } from "@/utils/nativeApp";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

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

const useReducedMotion = () => {
  const [prefersReduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  return prefersReduced;
};

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

function AnimatedRoutes() {
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={prefersReduced ? undefined : pageVariants}
        initial={prefersReduced ? false : "initial"}
        animate="animate"
        exit={prefersReduced ? undefined : "exit"}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
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
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initNativeApp();
    configureBackButton(() => {
      // On Android back at root — minimize app
      // The App plugin handles this natively when canGoBack is false
    });
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <OfflineBanner />
      <Toaster />
      <Sonner />
      <AnimatedRoutes />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <PasscodeProvider>
            <CollectionProvider>
              <TooltipProvider>
                <AppContent />
              </TooltipProvider>
            </CollectionProvider>
          </PasscodeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
