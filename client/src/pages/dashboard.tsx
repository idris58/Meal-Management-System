import { useMeal } from '@/lib/meal-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, ShoppingBag, Utensils, RefreshCcw, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const expenseSchema = z.object({
  amount: z.coerce.number().min(1, "Amount is required"),
  description: z.string().min(2, "Description is required"),
  type: z.enum(["meal", "fixed"]),
  paidBy: z.string().min(2, "Shopper name is required"),
});

function QuickAddExpense({ onClose }: { onClose: () => void }) {
  const { addExpense } = useMeal();
  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: 0, description: "", type: "meal", paidBy: "" },
  });

  const onSubmit = (data: z.infer<typeof expenseSchema>) => {
    addExpense(data.amount, data.description, data.type, data.paidBy);
    onClose();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="meal">Meal (Grocery/Food)</SelectItem>
                  <SelectItem value="fixed">Fixed (Bills/Utilities)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="e.g., Rice, WiFi Bill" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="paidBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Who Shopped?</FormLabel>
              <FormControl><Input placeholder="Shopper's Name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Add Expense</Button>
      </form>
    </Form>
  );
}

function QuickLogMeal({ onClose }: { onClose: () => void }) {
  const { logMeal, members, mealLogs } = useMeal();
  const [date, setDate] = useState<Date>(new Date());
  const [mealCounts, setMealCounts] = useState<Record<string, string>>(
    Object.fromEntries(members.map(m => [m.id, "0"]))
  );

  useEffect(() => {
    const shortDate = format(date, 'yyyy-MM-dd');
    const existingLogs = Object.fromEntries(
      members.map(m => {
        const log = mealLogs.find(l => l.memberId === m.id && l.date === shortDate);
        return [m.id, log ? log.count.toString() : "0"];
      })
    );
    setMealCounts(existingLogs);
  }, [date, members, mealLogs]);

  const updateCount = (id: string, delta: number) => {
    setMealCounts(prev => {
      const currentVal = parseFloat(prev[id] || "0");
      const newVal = Math.max(0, currentVal + delta);
      return { ...prev, [id]: newVal.toString() };
    });
  };

  const handleInputChange = (id: string, value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setMealCounts(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = format(date, 'yyyy-MM-dd');
    Object.entries(mealCounts).forEach(([memberId, countStr]) => {
      const count = parseFloat(countStr);
      logMeal(memberId, isNaN(count) ? 0 : count, dateStr);
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="space-y-2">
        <Label>Select Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal py-2 text-sm", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card shadow-2xl rounded-xl border" align="center">
            <Calendar 
              mode="single" 
              selected={date} 
              onSelect={(d) => {
                if (d) {
                  setDate(d);
                  // Close popover
                  const event = new KeyboardEvent('keydown', { key: 'Escape' });
                  document.dispatchEvent(event);
                }
              }} 
              initialFocus 
              className="p-4"
              style={{ "--cell-size": "3rem" } as React.CSSProperties}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
        {members.map(member => (
          <div key={member.id} className="flex items-center justify-between p-2 border rounded-lg bg-secondary/10">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 text-xs"><AvatarFallback>{member.avatar}</AvatarFallback></Avatar>
              <span className="font-medium text-sm truncate max-w-[100px]">{member.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCount(member.id, -0.5)}>
                <Minus className="h-3 w-3" />
              </Button>
              <Input 
                className="h-8 w-16 text-center text-sm font-bold px-1" 
                value={mealCounts[member.id]} 
                onChange={(e) => handleInputChange(member.id, e.target.value)}
              />
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCount(member.id, 0.5)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Save Daily Log</Button>
    </form>
  );
}

export default function Dashboard() {
  const { stats, currentUser, getMemberStats, members, resetCycle } = useMeal();
  const [openExpense, setOpenExpense] = useState(false);
  const [openMeal, setOpenMeal] = useState(false);

  const myStats = currentUser ? getMemberStats(currentUser.id) : null;

  return (
    <div className="space-y-6 pb-20">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="glass-card border-none bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald-100 text-sm font-medium tracking-wide uppercase">Remaining Cash in Hand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-heading font-bold">৳{stats.remainingCash.toFixed(2)}</span>
              <span className="text-emerald-100 text-sm">/ ৳{stats.totalDeposits.toFixed(2)} Collected</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 rounded p-2 backdrop-blur-sm">
                <p className="text-emerald-100 text-xs">Total Meal Cost</p>
                <p className="font-bold">৳{stats.totalMealExpenses.toFixed(2)}</p>
              </div>
              <div className="bg-white/10 rounded p-2 backdrop-blur-sm">
                <p className="text-emerald-100 text-xs">Total Fixed Cost</p>
                <p className="font-bold">৳{stats.totalFixedExpenses.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-muted-foreground text-sm font-medium uppercase">Current Meal Rate</CardTitle>
            <Utensils className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <span className="text-3xl md:text-4xl font-heading font-bold text-foreground">৳{stats.currentMealRate.toFixed(2)}</span>
              <p className="text-xs text-muted-foreground mt-1">Per Meal</p>
            </div>
            <div className="mt-4 pt-4 border-t text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Meals:</span>
                <span className="font-medium">{stats.totalMealsConsumed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fixed Cost/Person:</span>
                <span className="font-medium">৳{stats.fixedCostPerMember.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {currentUser && myStats && (
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            My Status 
            <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{currentUser.role}</span>
          </h2>
          <Card className="glass-card overflow-hidden">
            <div className={`h-2 w-full ${myStats.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Meals Eaten</p>
                  <p className="text-2xl font-bold font-heading">{myStats.mealsEaten}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">My Meal Cost</p>
                  <p className="text-2xl font-bold font-heading">৳{myStats.mealCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">My Fixed Share</p>
                  <p className="text-2xl font-bold font-heading">৳{myStats.fixedCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">{myStats.balance >= 0 ? 'To Get (Pabe)' : 'To Pay (Dibe)'}</p>
                  <p className={`text-2xl font-bold font-heading ${myStats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>৳{Math.abs(myStats.balance).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {currentUser?.role === 'admin' && (
        <section className="grid grid-cols-2 gap-4">
          <Dialog open={openExpense} onOpenChange={setOpenExpense}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-20 flex flex-col items-center justify-center gap-2 bg-white border border-dashed border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-600 shadow-sm transition-all">
                <ShoppingBag className="h-6 w-6" />
                <span className="font-semibold">Add Expense</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95%]">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Enter the details of the new expense below.
                </DialogDescription>
              </DialogHeader>
              <QuickAddExpense onClose={() => setOpenExpense(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={openMeal} onOpenChange={setOpenMeal}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-20 flex flex-col items-center justify-center gap-2 bg-white border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-all">
                <Utensils className="h-6 w-6" />
                <span className="font-semibold">Log Meals</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95%]">
              <DialogHeader>
                <DialogTitle>Log Meals by Date</DialogTitle>
                <DialogDescription>
                  Update meal counts for each member for the selected date.
                </DialogDescription>
              </DialogHeader>
              <QuickLogMeal onClose={() => setOpenMeal(false)} />
            </DialogContent>
          </Dialog>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">All Members Summary</h2>
          <Button variant="ghost" size="sm" asChild><a href="/members">View Details</a></Button>
        </div>
        <div className="grid gap-3">
          {members.map(member => {
            const mStats = getMemberStats(member.id);
            return (
              <div key={member.id} className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 text-xs"><AvatarFallback>{member.avatar}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{mStats.mealsEaten} Meals</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${mStats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {mStats.balance >= 0 ? '+' : '-'}{Math.abs(mStats.balance).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Bal</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {currentUser?.role === 'admin' && (
        <section className="mt-8 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Cycle Management</h2>
              <p className="text-sm text-muted-foreground">Manage the current meal cycle.</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Close & Archive Cycle
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all current expenses and meal logs for all users. The data will be stored in History.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetCycle}>Yes, Close Cycle</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      )}
    </div>
  );
}
