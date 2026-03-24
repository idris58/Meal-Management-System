import { useEffect, useMemo, useState } from "react";
import {
  ChefHat,
  Share2,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { eachDayOfInterval, format, isSameDay, max, min, parseISO, startOfDay } from "date-fns";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type SharedMember = {
  id: string;
  name: string;
  deposit: number;
  isActive: boolean;
  avatar: string;
  mealsEaten: number;
  mealCost: number;
  fixedCost: number;
  totalCost: number;
  balance: number;
};

type SharedExpense = {
  id: string;
  amount: number;
  description: string;
  type: "meal" | "fixed";
  date: string;
  paidBy: string;
};

type SharedMealLog = {
  id: string;
  date: string;
  memberId: string;
  count: number;
};

type SharedPayload = {
  stats: {
    totalDeposits: number;
    totalMealExpenses: number;
    totalFixedExpenses: number;
    totalMealsConsumed: number;
    currentMealRate: number;
    fixedCostPerMember: number;
    remainingCash: number;
  };
  members: SharedMember[];
  expenses: SharedExpense[];
  mealLogs: SharedMealLog[];
};

function formatCurrency(amount: number) {
  return `৳${amount.toFixed(2)}`;
}

function formatBalance(amount: number) {
  return `৳${Math.ceil(Math.abs(amount))}`;
}

export default function SharedPage({ token }: { token: string }) {
  const [data, setData] = useState<SharedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSharedData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/share/${token}`);
        const body = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(body?.message || "Unable to load shared dashboard.");
        }

        if (active) {
          setData(body as SharedPayload);
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const nextError =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load shared dashboard.";
        setError(nextError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSharedData();

    return () => {
      active = false;
    };
  }, [token]);

  const days = useMemo(() => {
    if (!data || data.mealLogs.length === 0) {
      return [startOfDay(new Date())];
    }

    const today = startOfDay(new Date());
    const logDates = data.mealLogs.map((log) => startOfDay(parseISO(log.date)));
    const startDate = min(logDates);
    const endDate = max([...logDates, today]);
    return eachDayOfInterval({ start: startDate, end: endDate }).reverse();
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">Loading shared dashboard...</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Fetching the latest current-cycle meal data.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-emerald-600" />
              Shared Dashboard Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {error || "This shared link is invalid or disabled."}
            </p>
            <p className="text-sm text-muted-foreground">
              Ask the owner for a fresh share link if you still need access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
                Shared View
              </p>
              <h1 className="font-heading text-xl font-bold text-slate-900">
                Current Meal Cycle
              </h1>
            </div>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Read only
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-none bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-emerald-100">
                Remaining Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-heading font-bold">
                {formatCurrency(data.stats.remainingCash)}
              </div>
              <p className="mt-2 text-sm text-emerald-100">
                {formatCurrency(data.stats.totalDeposits)} collected in total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm uppercase text-muted-foreground">
                <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
                Meal Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold">
                {formatCurrency(data.stats.currentMealRate)}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Fixed cost/person: {formatCurrency(data.stats.fixedCostPerMember)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase text-muted-foreground">
                Totals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meals</span>
                <span className="font-medium">{data.stats.totalMealsConsumed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meal Cost</span>
                <span className="font-medium">
                  {formatCurrency(data.stats.totalMealExpenses)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fixed Cost</span>
                <span className="font-medium">
                  {formatCurrency(data.stats.totalFixedExpenses)}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-heading font-bold">Meal Logs</h2>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-30 bg-card">
                  <tr className="border-b shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                    <th className="sticky left-0 z-40 min-w-[120px] border-r bg-card p-4 text-left font-bold">
                      Date
                    </th>
                    {data.members.map((member) => (
                      <th
                        key={member.id}
                        className="min-w-[100px] border-r bg-card p-2 text-center"
                      >
                        <div className="flex flex-col items-center gap-1 py-1">
                          <Avatar className="h-6 w-6 text-[10px]">
                            <AvatarFallback>{member.avatar}</AvatarFallback>
                          </Avatar>
                          <span className="w-20 truncate text-[10px] font-bold uppercase">
                            {member.name.split(" ")[0]}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="sticky right-0 z-30 min-w-[80px] bg-card p-4 text-right font-bold">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {days.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const dayLogs = data.mealLogs.filter((log) => log.date === dateStr);
                    const dayTotal = dayLogs.reduce((sum, log) => sum + log.count, 0);

                    return (
                      <tr key={dateStr} className="hover:bg-muted/50">
                        <td className="sticky left-0 z-10 border-r bg-card p-4 font-medium">
                          <div className="flex flex-col">
                            <span className={cn(isSameDay(day, new Date()) && "font-bold text-primary")}>
                              {format(day, "dd MMM")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(day, "EEEE")}
                            </span>
                          </div>
                        </td>
                        {data.members.map((member) => {
                          const log = dayLogs.find((entry) => entry.memberId === member.id);
                          return (
                            <td
                              key={member.id}
                              className="border-r p-4 text-center font-mono"
                            >
                              {log ? log.count : "-"}
                            </td>
                          );
                        })}
                        <td className="sticky right-0 z-10 bg-card p-4 text-right font-bold text-emerald-600">
                          {dayTotal > 0 ? dayTotal : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-heading font-bold">Expenses</h2>
          </div>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="meal">Meals</TabsTrigger>
              <TabsTrigger value="fixed">Fixed</TabsTrigger>
            </TabsList>

            {(["all", "meal", "fixed"] as const).map((tab) => {
              const expenses =
                tab === "all"
                  ? [...data.expenses]
                  : data.expenses.filter((expense) => expense.type === tab);
              const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

              return (
                <TabsContent key={tab} value={tab} className="m-0">
                  <ScrollArea className="max-h-[420px]">
                    <div className="space-y-3">
                      {expenses.length === 0 ? (
                        <Card>
                          <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No expenses found.
                          </CardContent>
                        </Card>
                      ) : (
                        <>
                          {expenses.map((expense) => (
                            <div
                              key={expense.id}
                              className="flex items-center justify-between rounded-lg border bg-card p-4"
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "rounded-full p-2",
                                    expense.type === "meal"
                                      ? "bg-emerald-100 text-emerald-600"
                                      : "bg-slate-100 text-slate-600",
                                  )}
                                >
                                  {expense.type === "meal" ? (
                                    <ShoppingBag className="h-5 w-5" />
                                  ) : (
                                    <Zap className="h-5 w-5" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{expense.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(expense.date), "MMM d, yyyy")} • Paid by {expense.paidBy}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-heading font-bold">
                                  {formatCurrency(expense.amount)}
                                </p>
                                <Badge variant="secondary" className="text-[10px] uppercase">
                                  {expense.type}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          <Card className="border-dashed">
                            <CardContent className="flex items-center justify-between py-4">
                              <span className="text-sm font-medium text-muted-foreground">Total</span>
                              <span className="font-heading text-xl font-bold">
                                {formatCurrency(total)}
                              </span>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              );
            })}
          </Tabs>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-heading font-bold">Members Summary</h2>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="bg-card">
                  <tr className="border-b">
                    <th className="p-4 text-left font-bold">Member</th>
                    <th className="p-4 text-right font-bold">Deposit</th>
                    <th className="p-4 text-right font-bold">Deposit - Fixed</th>
                    <th className="p-4 text-right font-bold">Total Meals</th>
                    <th className="p-4 text-right font-bold">Meal Cost</th>
                    <th className="p-4 text-right font-bold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.members.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 text-xs">
                            <AvatarFallback>{member.avatar}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(member.deposit)}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(member.deposit - member.fixedCost)}
                      </td>
                      <td className="p-4 text-right font-medium">{member.mealsEaten}</td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(member.mealCost)}
                      </td>
                      <td
                        className={cn(
                          "p-4 text-right font-bold",
                          member.balance >= 0 ? "text-emerald-600" : "text-red-600",
                        )}
                      >
                        {member.balance >= 0 ? "+" : "-"}
                        {formatBalance(member.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
