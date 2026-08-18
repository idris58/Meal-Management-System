import { useEffect, useRef, useState } from "react";
import { Route, Switch, useLocation, useRoute } from "wouter";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toaster";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import { Toaster as SonnerToaster } from "sonner";
import { toast } from "@/hooks/use-toast";
import { MealProvider, useMeal } from "@/lib/meal-context";
import { useNetworkStatus } from "@/lib/pwa";
import { OfflineToastManager } from "@/components/offline-toast";
import { supabase } from "@/lib/supabase";
import { ErrorBoundary } from "@/components/error-boundary";
import AuthPage from "@/pages/auth";
import ChangelogPage from "@/pages/changelog";
import Dashboard from "@/pages/dashboard";
import Expenses from "@/pages/expenses";
import HistoryPage from "@/pages/history";
import ReportsPage from "@/pages/reports";
import Meals from "@/pages/meals";
import Members from "@/pages/members";
import OnboardingPage from "@/pages/onboarding";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import SharedPage, { SharedAccessPage } from "@/pages/shared";

function AppLoadingSkeleton({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r bg-card p-6 md:block">
          <div className="mb-8 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-2xl" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        </aside>
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-36 rounded-lg xl:col-span-2" />
              <Skeleton className="h-36 rounded-lg" />
              <Skeleton className="h-36 rounded-lg" />
            </div>
            <Skeleton className="h-72 rounded-lg" />
            <p className="text-center text-sm text-muted-foreground">{message}</p>
          </div>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { loading, dataError, retryLoadData } = useMeal();
  const [location] = useLocation();

  if (loading && !dataError) {
    return <AppLoadingSkeleton message="Loading your meal data..." />;
  }

  if (dataError) {
    return (
      <Layout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
          <div className="mx-auto max-w-md text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Failed to load data</h2>
            <p className="text-sm text-muted-foreground">{dataError}</p>
            <Button onClick={retryLoadData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ErrorBoundary key={location}>
        <Switch>
          <Route path="/app" component={Dashboard} />
          <Route path="/app/members" component={Members} />
          <Route path="/app/expenses" component={Expenses} />
          <Route path="/app/meals" component={Meals} />
          <Route path="/app/reports" component={ReportsPage} />
          <Route path="/app/history" component={HistoryPage} />
          <Route path="/app/changelog" component={ChangelogPage} />
          <Route path="/app/settings" component={Settings} />
          <Route path="/app/profile" component={ProfilePage} />
          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </Layout>
  );
}

const legacyMainRouteMap: Record<string, string> = {
  "/": "/app",
  "/members": "/app/members",
  "/expenses": "/app/expenses",
  "/meals": "/app/meals",
  "/reports": "/app/reports",
  "/history": "/app/history",
  "/changelog": "/app/changelog",
  "/settings": "/app/settings",
};

function AppShell() {
  const [profile, setProfile] = useState<{ mess_id: string | null } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const { session, loading, lastAuthEvent } = useAuth();
  const [location, setLocation] = useLocation();
  const [isSharedLandingRoute] = useRoute("/shared");
  const [isSharedRoute, sharedParams] = useRoute("/shared/:token");
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const authCode = searchParams.get("code");
  const recoveryType =
    searchParams.get("type")?.toLowerCase() ??
    hashParams.get("type")?.toLowerCase() ??
    "";
  const recoveryTokenHash = searchParams.get("token_hash");
  const recoveryTokenInUrl =
    recoveryType === "recovery" ||
    hashParams.has("access_token") ||
    (Boolean(recoveryTokenHash) && recoveryType === "recovery");

  useEffect(() => {
    let active = true;
    if (!session?.user) { setProfile(null); setProfileLoading(false); return; }
    
    const cachedProfile = localStorage.getItem(`profile-${session.user.id}`);
    if (cachedProfile) {
      try {
        setProfile(JSON.parse(cachedProfile));
      } catch { /* ignore */ }
    } else {
      setProfileLoading(true);
    }
    
    void supabase.from("profiles").select("mess_id").eq("id", session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load profile:", error);
          if (!cachedProfile) {
            setProfile({ mess_id: null });
          }
        } else {
          setProfile(data ?? { mess_id: null });
          if (data) {
            localStorage.setItem(`profile-${session.user.id}`, JSON.stringify(data));
          }
        }
        setProfileLoading(false);
      });
    return () => { active = false; };
  }, [session?.user?.id]);
  const [authLinkResolved, setAuthLinkResolved] = useState(
    !authCode && !(recoveryTokenHash && recoveryType === "recovery"),
  );
  const [recoveryLinkVerified, setRecoveryLinkVerified] = useState(recoveryTokenInUrl);

  useEffect(() => {
    const needsCodeExchange = Boolean(authCode);
    const needsRecoveryVerification =
      Boolean(recoveryTokenHash) && recoveryType === "recovery" && !authCode;

    if (!needsCodeExchange && !needsRecoveryVerification) {
      setAuthLinkResolved(true);
      return;
    }

    let cancelled = false;
    setAuthLinkResolved(false);

    const resolveAuthLink = async () => {
      let error: Error | null = null;

      if (needsCodeExchange && authCode) {
        const result = await supabase.auth.exchangeCodeForSession(authCode);
        error = result.error;
      } else if (needsRecoveryVerification && recoveryTokenHash) {
        const result = await supabase.auth.verifyOtp({
          token_hash: recoveryTokenHash,
          type: "recovery",
        });
        error = result.error;
      }

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("Error resolving auth recovery link:", error);
      } else {
        setRecoveryLinkVerified(true);
      }

      setAuthLinkResolved(true);
    };

    void resolveAuthLink();

    return () => {
      cancelled = true;
    };
  }, [authCode, recoveryTokenHash, recoveryType]);

  const hasRecoveryContext =
    recoveryLinkVerified || recoveryTokenInUrl || lastAuthEvent === "PASSWORD_RECOVERY";
  const isRecoveryFlow = location === "/auth" && hasRecoveryContext;

  useEffect(() => {
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    const isSharedExperience = isSharedLandingRoute || isSharedRoute;

    manifestLink?.setAttribute(
      "href",
      isSharedExperience ? "/shared-manifest.webmanifest" : "/manifest.webmanifest",
    );
    appleTitle?.setAttribute("content", isSharedExperience ? "MealTrack Shared" : "MealTrack");
  }, [isSharedLandingRoute, isSharedRoute]);

  useEffect(() => {
    if (isSharedLandingRoute) {
      document.title = "Meal Code - MealTrack";
      return;
    }

    if (isSharedRoute) {
      document.title = "Shared View - MealTrack";
      return;
    }

    const pageTitleMap: Record<string, string> = {
      "/": "Dashboard - MealTrack",
      "/app": "Dashboard - MealTrack",
      "/members": "Members - MealTrack",
      "/app/members": "Members - MealTrack",
      "/expenses": "Expenses - MealTrack",
      "/app/expenses": "Expenses - MealTrack",
      "/meals": "Meals - MealTrack",
      "/app/meals": "Meals - MealTrack",
      "/history": "History - MealTrack",
      "/reports": "Reports - MealTrack",
      "/app/reports": "Reports - MealTrack",
      "/app/history": "History - MealTrack",
      "/changelog": "Changelog - MealTrack",
      "/app/changelog": "Changelog - MealTrack",
      "/settings": "Settings - MealTrack",
      "/app/settings": "Settings - MealTrack",
      "/auth": `${isRecoveryFlow ? "Reset Password" : "Authentication"} - MealTrack`,
    };

    document.title = pageTitleMap[location] ?? "MealTrack";
  }, [isRecoveryFlow, isSharedLandingRoute, isSharedRoute, location]);

  useEffect(() => {
    if (isSharedLandingRoute || isSharedRoute || !authLinkResolved) return;

    if (hasRecoveryContext && location !== "/auth") {
      window.history.replaceState(null, document.title, `/auth${window.location.search}${window.location.hash}`);
      setLocation("/auth");
      return;
    }

    if (loading) return;
    if (!session && location !== "/auth") {
      setLocation("/auth");
      return;
    }
    if (!session || isRecoveryFlow || profileLoading || !profile) return;

    if (!profile.mess_id && location !== "/onboarding") {
      setLocation("/onboarding");
      return;
    }
    if (profile.mess_id && (location === "/auth" || location === "/onboarding")) {
      setLocation("/app");
      return;
    }
    if (profile.mess_id && legacyMainRouteMap[location]) {
      setLocation(legacyMainRouteMap[location]);
    }
  }, [authLinkResolved, hasRecoveryContext, isRecoveryFlow, isSharedLandingRoute, isSharedRoute, loading, location, profile, profileLoading, session, setLocation]);

  if (isSharedLandingRoute) {
    return <SharedAccessPage />;
  }

  if (isSharedRoute && sharedParams?.token) {
    return <SharedPage token={sharedParams.token} />;
  }

  if (loading || !authLinkResolved || (session && profileLoading)) {
    return (
      <AppLoadingSkeleton
        message={authLinkResolved ? "Checking your session..." : "Preparing your reset link..."}
      />
    );
  }

  if (!session || isRecoveryFlow) {
    return <AuthPage />;
  }

  if (!profile?.mess_id) {
    return <OnboardingPage />;
  }

  return (
    <MealProvider>
      <OfflineToastManager />
      <Router />
    </MealProvider>
  );
}

function PwaUpdateNotifier() {
  const hasShownUpdateToast = useRef(false);
  const waitingRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
      return;
    }

    const activateWaitingServiceWorker = () => {
      const waitingWorker = waitingRegistrationRef.current?.waiting;

      if (!waitingWorker) {
        window.location.reload();
        return;
      }

      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) {
          return;
        }

        reloading = true;
        window.location.reload();
      });

      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    };

    const showUpdateToast = (registration: ServiceWorkerRegistration) => {
      if (hasShownUpdateToast.current) {
        return;
      }

      waitingRegistrationRef.current = registration;
      hasShownUpdateToast.current = true;
      toast({
        title: "New version available",
        description: "Refresh to load the latest version.",
        action: (
          <ToastAction altText="Update app" onClick={activateWaitingServiceWorker}>
            Update
          </ToastAction>
        ),
      });
    };

    const attachRegistrationListeners = (
      registration: ServiceWorkerRegistration | null | undefined,
    ) => {
      if (!registration) {
        return;
      }

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(registration);
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener("statechange", () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateToast(registration);
          }
        });
      });
    };

    void navigator.serviceWorker.getRegistration().then(attachRegistrationListeners);
  }, []);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PwaUpdateNotifier />
        <AppShell />
        <Toaster />
        <SonnerToaster position="bottom-right" className="hidden md:block" />
        <SonnerToaster position="bottom-center" className="md:hidden" style={{ marginBottom: "64px" }} />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
