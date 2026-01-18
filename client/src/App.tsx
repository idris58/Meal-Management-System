import { Switch, Route } from "wouter";
import { MealProvider, useMeal } from "@/lib/meal-context";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import Expenses from "@/pages/expenses";
import Meals from "@/pages/meals";
import HistoryPage from "@/pages/history";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";
import { Spinner } from "@/components/ui/spinner";

function Router() {
  const { loading } = useMeal();

  // Show loading screen while fetching data from Supabase
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto text-primary" />
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

function App() {
  return (
    <MealProvider>
      <Router />
      <Toaster />
    </MealProvider>
  );
}

export default App;