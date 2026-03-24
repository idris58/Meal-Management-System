import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";

import { Layout } from "@/components/layout";
import { Spinner } from "@/components/ui/spinner";
import { Toaster } from "@/components/ui/toaster";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import { MealProvider, useMeal } from "@/lib/meal-context";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Expenses from "@/pages/expenses";
import HistoryPage from "@/pages/history";
import Meals from "@/pages/meals";
import Members from "@/pages/members";
import NotFound from "@/pages/not-found";

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
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppShell() {
  const { session, loading, lastAuthEvent } = useAuth();
  const [location, setLocation] = useLocation();
  const recoveryTokenInUrl =
    window.location.hash.toLowerCase().includes("type=recovery") ||
    window.location.hash.toLowerCase().includes("access_token") ||
    window.location.search.toLowerCase().includes("type=recovery");
  const isRecoveryFlow =
    location === "/auth" &&
    (recoveryTokenInUrl || lastAuthEvent === "PASSWORD_RECOVERY");

  useEffect(() => {
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
  }, [isRecoveryFlow, loading, location, session, setLocation]);

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

function App() {
  return (
    <AuthProvider>
      <AppShell />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
