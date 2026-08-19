import { useMeal } from '@/lib/meal-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, ShoppingBag, Utensils, RefreshCcw, Calendar as CalendarIcon, Archive, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { OnboardingTour } from '@/components/onboarding-tour';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';

const expenseSchema = z.object({
  amount: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.coerce.number({ invalid_type_error: 'Amount is required' }).positive('Amount must be greater than zero'),
  ),
  description: z.string().min(2, 'Description is required'),
  type: z.enum(['meal', 'fixed']),
  paidBy: z.string().min(2, 'Shopper name is required'),
});

function formatMealCount(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  return rounded.toString();
}

function formatCurrency(amount: number) {
  return `৳${amount.toFixed(0)}`;
}

function QuickAddExpense({ onClose }: { onClose: () => void }) {
  const { addExpense } = useMeal();
  const [date, setDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: undefined, description: '', type: 'meal', paidBy: '' },
  });

  const onSubmit = async (data: z.infer<typeof expenseSchema>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await addExpense(data.amount, data.description, data.type, data.paidBy, undefined, format(date, 'yyyy-MM-dd'));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start py-2 text-left text-sm font-normal', !date && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[18rem] rounded-xl border bg-card p-0 shadow-2xl" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(nextDate) => {
                  if (nextDate) {
                    setDate(nextDate);
                    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
                    document.dispatchEvent(escapeEvent);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="100"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </Button>
      </form>
    </Form>
  );
}

function QuickLogMeal({ onClose }: { onClose: () => void }) {
  const { saveMealLogs, members, mealLogs } = useMeal();
  const [date, setDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mealCounts, setMealCounts] = useState<Record<string, string>>(
    Object.fromEntries(members.map(m => [m.id, '0']))
  );

  useEffect(() => {
    const shortDate = format(date, 'yyyy-MM-dd');
    const existingLogs = Object.fromEntries(
      members.map(m => {
        const log = mealLogs.find(l => l.memberId === m.id && l.date === shortDate);
        return [m.id, log ? log.count.toString() : '0'];
      })
    );
    setMealCounts(existingLogs);
  }, [date, members, mealLogs]);

  const updateCount = (id: string, delta: number) => {
    setMealCounts(prev => {
      const currentVal = parseFloat(prev[id] || '0');
      const newVal = Math.max(0, currentVal + delta);
      return { ...prev, [id]: newVal.toString() };
    });
  };

  const handleInputChange = (id: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMealCounts(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      await saveMealLogs(
        Object.entries(mealCounts).map(([memberId, countStr]) => ({
          memberId,
          count: parseFloat(countStr),
        })),
        dateStr,
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start py-2 text-left text-sm font-normal', !date && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[18rem] rounded-xl border bg-card p-0 shadow-2xl" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                if (d) {
                  setDate(d);
                  const event = new KeyboardEvent('keydown', { key: 'Escape' });
                  document.dispatchEvent(event);
                }
              }}
              initialFocus
              className="p-3"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="max-h-[40vh] space-y-4 overflow-y-auto pr-2">
        {members.map(member => (
          <div key={member.id} className="flex items-center justify-between rounded-lg border bg-secondary/10 p-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 text-xs"><AvatarFallback>{member.avatar}</AvatarFallback></Avatar>
              <span className="max-w-[100px] truncate text-sm font-medium">{member.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCount(member.id, -0.5)}>
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                className="h-8 w-16 px-1 text-center text-sm font-bold"
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
      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Daily Log'}
      </Button>
    </form>
  );
}

function CycleManagementCard({
  onCloseCycle,
  hasPendingCycle,
}: {
  onCloseCycle: () => Promise<void>;
  hasPendingCycle: boolean;
}) {
  const [isClosingCycle, setIsClosingCycle] = useState(false);

  const handleCloseCycle = async () => {
    if (isClosingCycle) return;
    setIsClosingCycle(true);

    try {
      await onCloseCycle();
    } finally {
      setIsClosingCycle(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-emerald-500" />
          Cycle Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Archive the current cycle and clear active expenses and meal logs while keeping the history available.
        </p>

        <div className="rounded-xl border bg-secondary/30 p-4">
          <p className="text-sm font-medium">Close current cycle</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This will move the current cycle to pending settlement and start a new clean active cycle.
          </p>
        </div>

        {hasPendingCycle ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Finish and close the existing pending cycle from History before closing another cycle.
          </p>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full gap-2" disabled={hasPendingCycle || isClosingCycle}>
              <RefreshCcw className="h-4 w-4" />
              {isClosingCycle ? 'Closing...' : 'Close Cycle'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move this cycle into pending settlement and create a new clean active cycle.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCloseCycle} disabled={isClosingCycle}>
                {isClosingCycle ? 'Closing...' : 'Yes, Close Cycle'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { stats, getMemberStats, members, closeActiveCycle, pendingCycle } = useMeal();
  const [openExpense, setOpenExpense] = useState(false);
  const [openMeal, setOpenMeal] = useState(false);
  const { canManageExpenses, canOperateMeals, canManageCycles } = useAuth();
  const memberSettlementRows = members.map((member) => {
    const memberStats = getMemberStats(member.id);
    const roundedBalance = Math.round(memberStats.balance);

    return {
      ...member,
      mealsEaten: memberStats.mealsEaten,
      managerWillGet: roundedBalance < 0 ? Math.abs(roundedBalance) : 0,
      managerWillGive: roundedBalance > 0 ? roundedBalance : 0,
    };
  });
  const totalManagerWillGet = memberSettlementRows.reduce((sum, member) => sum + member.managerWillGet, 0);
  const totalManagerWillGive = memberSettlementRows.reduce((sum, member) => sum + member.managerWillGive, 0);

  return (
    <div className="space-y-6 pb-20">
      <OnboardingTour />
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card border-none bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-lg lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-emerald-50">
              <Wallet className="h-4 w-4" />
              Remaining Cash in Hand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold md:text-5xl">৳{stats.remainingCash.toFixed(2)}</span>
              <span className="text-sm text-emerald-100">/ ৳{stats.totalDeposits.toFixed(2)} Collected</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-sm p-3">
                <p className="text-xs text-emerald-100">Total Meal Cost</p>
                <p className="font-bold text-lg">৳{stats.totalMealExpenses.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-sm p-3">
                <p className="text-xs text-emerald-100">Total Fixed Cost</p>
                <p className="font-bold text-lg">৳{stats.totalFixedExpenses.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-sm border-emerald-100/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Current Meal Rate</CardTitle>
            <Utensils className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <span className="font-heading text-3xl font-extrabold text-foreground md:text-4xl">৳{stats.currentMealRate.toFixed(2)}</span>
              <p className="mt-1 text-xs text-muted-foreground">Per Meal</p>
            </div>
            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Utensils className="h-3.5 w-3.5" /> Total Meals:
                </span>
                <span className="font-semibold text-foreground">{formatMealCount(stats.totalMealsConsumed)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ShoppingBag className="h-3.5 w-3.5" /> Fixed Cost/Person:
                </span>
                <span className="font-semibold text-foreground">৳{stats.fixedCostPerMember.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {(canManageExpenses || canOperateMeals) ? (
        <section className={cn("grid gap-4", canManageExpenses && canOperateMeals ? "grid-cols-2" : "grid-cols-1")}>
          {canManageExpenses ? (
            <Dialog open={openExpense} onOpenChange={setOpenExpense}>
              <DialogTrigger asChild>
                <Button size="lg" className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md dark:border-emerald-900 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40">
                  <ShoppingBag className="h-7 w-7" />
                  <span className="font-semibold tracking-wide">Add Expense</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[95%]">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>Enter the details of the new expense below.</DialogDescription>
                </DialogHeader>
                <QuickAddExpense onClose={() => setOpenExpense(false)} />
              </DialogContent>
            </Dialog>
          ) : null}

          {canOperateMeals ? (
            <Dialog open={openMeal} onOpenChange={setOpenMeal}>
              <DialogTrigger asChild>
                <Button size="lg" className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-md dark:border-blue-900 dark:bg-blue-950/30 dark:hover:bg-blue-900/40">
                  <Utensils className="h-7 w-7" />
                  <span className="font-semibold tracking-wide">Log Meals</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[95%]">
                <DialogHeader>
                  <DialogTitle>Log Meals by Date</DialogTitle>
                  <DialogDescription>Update meal counts for each member for the selected date.</DialogDescription>
                </DialogHeader>
                <QuickLogMeal onClose={() => setOpenMeal(false)} />
              </DialogContent>
            </Dialog>
          ) : null}
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">All Members Summary</h2>
          <Button variant="ghost" size="sm" asChild><a href="/app/members">View Details</a></Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(96px,1fr)_minmax(96px,1fr)] gap-3 border-b bg-secondary/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            <div>Member</div>
            <div className="text-right">Due</div>
            <div className="text-right">Refund</div>
          </div>
          <div className="divide-y">
            {memberSettlementRows.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-[minmax(0,1.6fr)_minmax(96px,1fr)_minmax(96px,1fr)] gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-8 w-8 text-xs">
                    <AvatarFallback>{member.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-semibold', member.managerWillGet > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                    {member.managerWillGet > 0 ? formatCurrency(member.managerWillGet) : '৳0'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-semibold', member.managerWillGive > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                    {member.managerWillGive > 0 ? formatCurrency(member.managerWillGive) : '৳0'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(96px,1fr)_minmax(96px,1fr)] gap-3 border-t bg-secondary/20 px-4 py-3">
            <div className="text-sm font-semibold">Total</div>
            <div className="text-right text-sm font-bold text-red-600">
              {formatCurrency(totalManagerWillGet)}
            </div>
            <div className="text-right text-sm font-bold text-emerald-600">
              {formatCurrency(totalManagerWillGive)}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 pt-2">
        {canManageCycles ? <CycleManagementCard onCloseCycle={closeActiveCycle} hasPendingCycle={!!pendingCycle} /> : null}
      </section>
    </div>
  );
}
