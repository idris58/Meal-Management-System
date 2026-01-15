import { Switch, Route } from "wouter";
import { MealProvider } from "@/lib/meal-context";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import Expenses from "@/pages/expenses";
import Meals from "@/pages/meals";
import HistoryPage from "@/pages/history";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";

function Router() {
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
