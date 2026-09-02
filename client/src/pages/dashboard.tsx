import { useMeal } from '@/lib/meal-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RefreshCcw,
  ShoppingBag,
  Sparkles,
  Utensils,
  Wallet,
  X,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useRef } from 'react';
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
import { DashboardFab } from '@/components/dashboard-fab';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { Link } from 'wouter';

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
                <CalendarDays className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[18rem] rounded-xl border bg-card p-0 shadow-2xl" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => { if (d) { setDate(d); } }}
                initialFocus
                className="p-3"
              />
            </PopoverContent>
          </Popover>
        </div>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (৳)</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
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
              <CalendarDays className="mr-2 h-4 w-4" />
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

// ── Active Cycle Banner ──────────────────────────────────────────────────────

function ActiveCycleBanner() {
  const { activeCycle, pendingCycle, stats, members, closeActiveCycle, renameActiveCycle } = useMeal();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [closeStep, setCloseStep] = useState<0 | 1 | 2>(0); // 0=closed, 1=review, 2=confirm
  const [isClosing, setIsClosing] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRename = () => {
    setRenameValue(activeCycle?.name ?? '');
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const saveRename = async () => {
    if (!renameValue.trim() || renameValue.trim() === activeCycle?.name) {
      cancelRename();
      return;
    }
    setIsSavingName(true);
    try {
      await renameActiveCycle(renameValue.trim());
      setIsRenaming(false);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCloseConfirm = async () => {
    setIsClosing(true);
    try {
      await closeActiveCycle();
      setCloseDialogOpen(false);
      setCloseStep(0);
    } finally {
      setIsClosing(false);
    }
  };

  if (!activeCycle) return null;

  const startedAt = new Date(activeCycle.startedAt);
  const durationLabel = formatDistanceToNow(startedAt, { addSuffix: false });

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b bg-emerald-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Active Cycle
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {durationLabel} · Started {format(startedAt, 'MMM d')}
        </div>
      </div>

      {/* Cycle name + inline rename */}
      <div className="flex items-center gap-3 px-4 py-3">
        {isRenaming ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveRename();
                if (e.key === 'Escape') cancelRename();
              }}
              className="h-8 text-base font-semibold"
              disabled={isSavingName}
            />
            <Button size="sm" className="h-8 shrink-0" onClick={() => void saveRename()} disabled={isSavingName}>
              {isSavingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={cancelRename} disabled={isSavingName}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <h2 className="truncate text-lg font-bold">{activeCycle.name}</h2>
            <button
              type="button"
              onClick={startRename}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Rename cycle"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-px border-t bg-border">
        <div className="flex flex-col items-center gap-0.5 bg-card px-3 py-2.5 text-center">
          <span className="text-lg font-bold">{members.length}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Members</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 bg-card px-3 py-2.5 text-center">
          <span className="text-lg font-bold">{formatCurrency(stats.totalMealExpenses + stats.totalFixedExpenses)}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Expenses</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 bg-card px-3 py-2.5 text-center">
          <span className="text-lg font-bold">{formatMealCount(stats.totalMealsConsumed)}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Meals</span>
        </div>
      </div>

      {/* Pending cycle warning */}
      {pendingCycle && (
        <div className="flex items-center gap-2.5 border-t bg-amber-500/5 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Pending settlement in progress —{' '}
            <Link href="/app/history" className="font-semibold underline underline-offset-2">
              go to History to finalize
            </Link>
          </span>
        </div>
      )}

      {/* Close action */}
      <div className="border-t px-4 py-3">
        <Dialog open={closeDialogOpen} onOpenChange={(open) => { setCloseDialogOpen(open); if (!open) setCloseStep(0); }}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-amber-300 text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
              disabled={!!pendingCycle}
              title={pendingCycle ? 'Finish the pending settlement before closing this cycle' : undefined}
            >
              <Archive className="h-4 w-4" />
              Close Cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md w-[95%]">
            {closeStep === 0 || closeStep === 1 ? (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-amber-500" />
                    Close Current Cycle
                  </DialogTitle>
                  <DialogDescription>
                    Review the cycle summary before closing.
                  </DialogDescription>
                </DialogHeader>

                {/* Summary */}
                <div className="space-y-4 py-2">
                  <div className="rounded-xl border bg-secondary/30 p-4 space-y-3">
                    <p className="text-sm font-semibold">{activeCycle.name}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-card p-2.5 border">
                        <p className="text-xs text-muted-foreground">Members</p>
                        <p className="text-lg font-bold">{members.length}</p>
                      </div>
                      <div className="rounded-lg bg-card p-2.5 border">
                        <p className="text-xs text-muted-foreground">Total Meals</p>
                        <p className="text-lg font-bold">{formatMealCount(stats.totalMealsConsumed)}</p>
                      </div>
                      <div className="rounded-lg bg-card p-2.5 border">
                        <p className="text-xs text-muted-foreground">Total Expenses</p>
                        <p className="text-lg font-bold">{formatCurrency(stats.totalMealExpenses + stats.totalFixedExpenses)}</p>
                      </div>
                      <div className="rounded-lg bg-card p-2.5 border">
                        <p className="text-xs text-muted-foreground">Remaining Cash</p>
                        <p className="text-lg font-bold">{formatCurrency(stats.remainingCash)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    <p className="font-semibold">What happens when you close?</p>
                    <ul className="mt-1.5 list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-400">
                      <li>This cycle moves to <strong>Pending Settlement</strong> in History</li>
                      <li>No new cycle starts automatically — you start one when ready</li>
                      <li>You can still add settlement corrections in History</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40"
                    onClick={() => setCloseStep(2)}
                  >
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Close Cycle
                  </DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. The cycle will enter pending settlement.
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-muted-foreground py-2">
                  Are you sure you want to close <strong>"{activeCycle.name}"</strong>? No new cycle will start automatically. You'll start the next cycle from the Dashboard when you're ready.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setCloseStep(1)} disabled={isClosing}>
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => void handleCloseConfirm()}
                    disabled={isClosing}
                  >
                    {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                    {isClosing ? 'Closing…' : 'Yes, Close Cycle'}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ── No Active Cycle state card ───────────────────────────────────────────────

function NoActiveCycleCard() {
  const { startNewCycle, suggestCycleName, pendingCycle } = useMeal();
  const [open, setOpen] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setCycleName(suggestCycleName(new Date()));
    setStartDate(new Date());
    setError(null);
    setOpen(true);
  };

  const handleStart = async () => {
    if (!cycleName.trim()) {
      setError('Cycle name is required.');
      return;
    }
    setIsStarting(true);
    setError(null);
    try {
      await startNewCycle(cycleName.trim(), startDate.toISOString());
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start cycle.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-dashed bg-card shadow-sm">
      <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">No Active Cycle</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingCycle
              ? 'A cycle is pending settlement. Start a new cycle whenever you\'re ready.'
              : 'Start your first cycle to begin tracking meals, expenses, and deposits.'}
          </p>
        </div>

        {pendingCycle && (
          <div className="flex w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-left text-xs">
              Pending settlement in History — finalize it before starting a new cycle to keep accounts clean.
            </span>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={handleOpen}>
              <Play className="h-4 w-4" />
              Start New Cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md w-[95%]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-emerald-500" />
                Start New Cycle
              </DialogTitle>
              <DialogDescription>
                Name your new cycle and choose a start date.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cycle Name</label>
                <Input
                  id="new-cycle-name"
                  value={cycleName}
                  onChange={(e) => { setCycleName(e.target.value); setError(null); }}
                  placeholder="e.g. Meal_Aug-26"
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleStart(); }}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  A descriptive name helps identify this cycle in history later.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {format(startDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-xl p-0 shadow-xl" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus className="p-3" />
                  </PopoverContent>
                </Popover>
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={isStarting}>Cancel</Button>
              <Button className="gap-2" onClick={() => void handleStart()} disabled={isStarting}>
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {isStarting ? 'Starting…' : 'Start Cycle'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { stats, getMemberStats, members, activeCycle, pendingCycle } = useMeal();
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

      {/* Main stats cards */}
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

      {/* Floating Action Button for Quick Actions */}
      <DashboardFab
        onOpenExpense={() => setOpenExpense(true)}
        onOpenMeal={() => setOpenMeal(true)}
      />

      {/* Add Expense Dialog */}
      <Dialog open={openExpense} onOpenChange={setOpenExpense}>
        <DialogContent className="max-w-md w-[95%]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>Enter the details of the new expense below.</DialogDescription>
          </DialogHeader>
          <QuickAddExpense onClose={() => setOpenExpense(false)} />
        </DialogContent>
      </Dialog>

      {/* Log Meals Dialog */}
      <Dialog open={openMeal} onOpenChange={setOpenMeal}>
        <DialogContent className="max-w-md w-[95%]">
          <DialogHeader>
            <DialogTitle>Log Meals by Date</DialogTitle>
            <DialogDescription>Update meal counts for each member for the selected date.</DialogDescription>
          </DialogHeader>
          <QuickLogMeal onClose={() => setOpenMeal(false)} />
        </DialogContent>
      </Dialog>

      {/* Member summary table */}
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
            <div className="text-right text-sm font-bold text-red-600">{formatCurrency(totalManagerWillGet)}</div>
            <div className="text-right text-sm font-bold text-emerald-600">{formatCurrency(totalManagerWillGive)}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
