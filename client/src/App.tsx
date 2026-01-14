import { Switch, Route } from "wouter";
import { MealProvider } from "@/lib/meal-context";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import Expenses from "@/pages/expenses";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/members" component={Members} />
        <Route path="/expenses" component={Expenses} />
         <Route path="/history">
          <div className="text-center py-10 text-muted-foreground">Cycle History (Coming Soon)</div>
        </Route>
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
