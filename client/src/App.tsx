import { useEffect, useRef } from "react";
import { Route, Switch, useLocation, useRoute } from "wouter";

import { Layout } from "@/components/layout";
import { ToastAction } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Toaster } from "@/components/ui/toaster";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import { toast } from "@/hooks/use-toast";
import { MealProvider, useMeal } from "@/lib/meal-context";
import { useNetworkStatus } from "@/lib/pwa";
import AuthPage from "@/pages/auth";
import ChangelogPage from "@/pages/changelog";
import Dashboard from "@/pages/dashboard";
import Expenses from "@/pages/expenses";
import HistoryPage from "@/pages/history";
import Meals from "@/pages/meals";
import Members from "@/pages/members";
import NotFound from "@/pages/not-found";
import SharedPage from "@/pages/shared";

function Router() {
  const { loading } = useMeal();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Spinner className="mx-auto h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Loading your meal data...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/members" component={Members} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/meals" component={Meals} />
        <Route path="/history" component={HistoryPage} />
        <Route path="/changelog" component={ChangelogPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppShell() {
  const { session, loading, lastAuthEvent } = useAuth();
  const [location, setLocation] = useLocation();
  const [isSharedRoute, sharedParams] = useRoute("/shared/:token");
  const recoveryTokenInUrl =
    window.location.hash.toLowerCase().includes("type=recovery") ||
    window.location.hash.toLowerCase().includes("access_token") ||
    window.location.search.toLowerCase().includes("type=recovery");
  const isRecoveryFlow =
    location === "/auth" &&
    (recoveryTokenInUrl || lastAuthEvent === "PASSWORD_RECOVERY");

  useEffect(() => {
    if (isSharedRoute) {
      document.title = "Shared View - MealManager";
      return;
    }

    const pageTitleMap: Record<string, string> = {
      "/": "Dashboard - MealManager",
      "/members": "Members - MealManager",
      "/expenses": "Expenses - MealManager",
      "/meals": "Meals - MealManager",
      "/history": "History - MealManager",
      "/changelog": "Changelog - MealManager",
      "/auth": isRecoveryFlow ? "Reset Password - MealManager" : "Authentication - MealManager",
    };

    document.title = pageTitleMap[location] ?? "MealManager";
  }, [isRecoveryFlow, isSharedRoute, location]);

  useEffect(() => {
    if (isSharedRoute) {
      return;
    }

    if (loading) {
      return;
    }

    if (!session && location !== "/auth") {
      setLocation("/auth");
      return;
    }

    if (session && location === "/auth" && !isRecoveryFlow) {
      setLocation("/");
    }
  }, [isRecoveryFlow, isSharedRoute, loading, location, session, setLocation]);

  if (isSharedRoute && sharedParams?.token) {
    return <SharedPage token={sharedParams.token} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Spinner className="mx-auto h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!session || isRecoveryFlow) {
    return <AuthPage />;
  }

  return (
    <MealProvider>
      <Router />
    </MealProvider>
  );
}

function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
      You are offline. The app shell is available, but live meal data and edits require an internet connection.
    </div>
  );
}

function PwaUpdateNotifier() {
  const hasShownUpdateToast = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
      return;
    }

    const showUpdateToast = () => {
      if (hasShownUpdateToast.current) {
        return;
      }

      hasShownUpdateToast.current = true;
      toast({
        title: "New version available",
        description: "Refresh to load the latest app changes.",
        action: (
          <ToastAction altText="Refresh app" onClick={() => window.location.reload()}>
            Refresh
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
        showUpdateToast();
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
            showUpdateToast();
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
    <AuthProvider>
      <OfflineBanner />
      <PwaUpdateNotifier />
      <AppShell />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
