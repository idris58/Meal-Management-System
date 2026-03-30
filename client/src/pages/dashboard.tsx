import { useMeal } from '@/lib/meal-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Minus, ShoppingBag, Utensils, RefreshCcw, Calendar as CalendarIcon, Copy, Link2, Share2, Archive, Download } from 'lucide-react';
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
import { useAuth } from '@/lib/auth-context';
import { usePwaInstall } from '@/lib/pwa';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

type ShareLinkConfig = {
  token: string;
  is_enabled: boolean;
};

const expenseSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount is required'),
  description: z.string().min(2, 'Description is required'),
  type: z.enum(['meal', 'fixed']),
  paidBy: z.string().min(2, 'Shopper name is required'),
});

function formatMealCount(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  return rounded.toString();
}

function QuickAddExpense({ onClose }: { onClose: () => void }) {
  const { addExpense } = useMeal();
  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount: undefined, description: '', type: 'meal', paidBy: '' },
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
              <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl>
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
        <label className="text-sm font-medium">Select Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('w-full justify-start py-2 text-left text-sm font-normal', !date && 'text-muted-foreground')}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[20rem] rounded-xl border bg-card p-0 shadow-2xl" align="center">
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
      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Save Daily Log</Button>
    </form>
  );
}

function createShareToken() {
  return crypto.randomUUID().replace(/-/g, '');
}

function ShareDashboardCard() {
  const { user } = useAuth();
  const [config, setConfig] = useState<ShareLinkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let active = true;

    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('share_links')
          .select('token, is_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (active) {
          setConfig(data ? { token: data.token, is_enabled: data.is_enabled } : null);
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }

        console.error('Error loading share link config:', caughtError);
        setError('Unable to load share settings. Run the share_links SQL setup first if needed.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadConfig();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const shareUrl =
    config?.token ? `${window.location.origin}/shared/${config.token}` : '';

  const upsertConfig = async (nextConfig: ShareLinkConfig) => {
    if (!user?.id) {
      return;
    }

    setWorking(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error: upsertError } = await supabase
        .from('share_links')
        .upsert(
          {
            user_id: user.id,
            token: nextConfig.token,
            is_enabled: nextConfig.is_enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select('token, is_enabled')
        .single();

      if (upsertError) {
        throw upsertError;
      }

      setConfig({ token: data.token, is_enabled: data.is_enabled });
      return data;
    } catch (caughtError) {
      console.error('Error saving share config:', caughtError);
      setError('Unable to update the share link right now.');
      return null;
    } finally {
      setWorking(false);
    }
  };

  const handleEnableSharing = async () => {
    const nextToken = config?.token ?? createShareToken();
    const saved = await upsertConfig({ token: nextToken, is_enabled: true });

    if (saved) {
      setMessage('Sharing is enabled. You can now copy the public view link.');
    }
  };

  const handleDisableSharing = async () => {
    if (!config) {
      return;
    }

    const saved = await upsertConfig({ token: config.token, is_enabled: false });

    if (saved) {
      setMessage('Sharing is disabled. The old link will no longer work.');
    }
  };

  const handleRegenerate = async () => {
    const saved = await upsertConfig({
      token: createShareToken(),
      is_enabled: true,
    });

    if (saved) {
      setMessage('A new share link was generated. The previous link is now invalid.');
    }
  };

  const handleCopy = async () => {
    if (!shareUrl || !config?.is_enabled) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Shared link copied to clipboard.');
      setError(null);
    } catch (caughtError) {
      console.error('Error copying shared link:', caughtError);
      setError('Unable to copy the link. Copy it manually from the field below.');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-emerald-500" />
          Share Current Cycle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Create a read-only public link so other members can view the current meal cycle without logging in.
        </p>

        <div className="rounded-xl border bg-secondary/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Sharing status</p>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? 'Loading share settings...'
                  : config?.is_enabled
                    ? 'Enabled'
                    : 'Disabled'}
              </p>
            </div>
            <Button
              variant={config?.is_enabled ? 'outline' : 'default'}
              onClick={config?.is_enabled ? handleDisableSharing : handleEnableSharing}
              disabled={loading || working}
            >
              {config?.is_enabled ? 'Disable Share' : 'Enable Share'}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Public link</label>
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              placeholder="Enable sharing to generate a public link"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              disabled={!config?.is_enabled || !shareUrl}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleCopy}
            disabled={!config?.is_enabled || !shareUrl}
          >
            <Link2 className="h-4 w-4" />
            Copy Link
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleRegenerate}
            disabled={loading || working}
          >
            <RefreshCcw className="h-4 w-4" />
            Regenerate Link
          </Button>
        </div>

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CycleManagementCard({
  onCloseCycle,
  hasPendingCycle,
}: {
  onCloseCycle: () => void;
  hasPendingCycle: boolean;
}) {
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
            <Button variant="destructive" className="w-full gap-2" disabled={hasPendingCycle}>
              <RefreshCcw className="h-4 w-4" />
              Close Cycle
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
              <AlertDialogAction onClick={onCloseCycle}>Yes, Close Cycle</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function InstallAppCard() {
  const { canInstall, isInstalled, isIos, promptInstall } = usePwaInstall();
  const [message, setMessage] = useState<string | null>(null);

  if (isInstalled || (!canInstall && !isIos)) {
    return null;
  }

  const handleInstall = async () => {
    const result = await promptInstall();

    if (result.outcome === 'accepted') {
      setMessage('Install prompt accepted. Finish the browser install flow to add MealManager.');
      return;
    }

    setMessage('Install was dismissed. You can try again later from this card.');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-emerald-500" />
          Install App
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Install MealManager on your phone or desktop for a faster, app-like experience with home screen access.
        </p>

        <div className="rounded-xl border bg-secondary/30 p-4">
          <p className="text-sm font-medium">Installable PWA</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isIos
              ? 'On iPhone or iPad, use Safari Share -> Add to Home Screen.'
              : 'This app can be installed without going through an app store.'}
          </p>
        </div>

        {!isIos ? (
          <Button className="w-full gap-2" onClick={handleInstall}>
            <Download className="h-4 w-4" />
            Install MealManager
          </Button>
        ) : (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Open this app in Safari, tap the Share icon, then choose Add to Home Screen.
          </p>
        )}

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { stats, getMemberStats, members, closeActiveCycle, pendingCycle } = useMeal();
  const [openExpense, setOpenExpense] = useState(false);
  const [openMeal, setOpenMeal] = useState(false);

  return (
    <div className="space-y-6 pb-20">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-card border-none bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-emerald-100">Remaining Cash in Hand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold md:text-5xl">৳{stats.remainingCash.toFixed(2)}</span>
              <span className="text-sm text-emerald-100">/ ৳{stats.totalDeposits.toFixed(2)} Collected</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded bg-white/10 p-2 backdrop-blur-sm">
                <p className="text-xs text-emerald-100">Total Meal Cost</p>
                <p className="font-bold">৳{stats.totalMealExpenses.toFixed(2)}</p>
              </div>
              <div className="rounded bg-white/10 p-2 backdrop-blur-sm">
                <p className="text-xs text-emerald-100">Total Fixed Cost</p>
                <p className="font-bold">৳{stats.totalFixedExpenses.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Current Meal Rate</CardTitle>
            <Utensils className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <span className="font-heading text-3xl font-bold text-foreground md:text-4xl">৳{stats.currentMealRate.toFixed(2)}</span>
              <p className="mt-1 text-xs text-muted-foreground">Per Meal</p>
            </div>
            <div className="mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Meals:</span>
                <span className="font-medium">{formatMealCount(stats.totalMealsConsumed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fixed Cost/Person:</span>
                <span className="font-medium">৳{stats.fixedCostPerMember.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Dialog open={openExpense} onOpenChange={setOpenExpense}>
          <DialogTrigger asChild>
            <Button size="lg" className="flex h-20 flex-col items-center justify-center gap-2 border border-dashed border-emerald-500 bg-white text-emerald-600 shadow-sm transition-all hover:border-emerald-600 hover:bg-emerald-50">
              <ShoppingBag className="h-6 w-6" />
              <span className="font-semibold">Add Expense</span>
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

        <Dialog open={openMeal} onOpenChange={setOpenMeal}>
          <DialogTrigger asChild>
            <Button size="lg" className="flex h-20 flex-col items-center justify-center gap-2 border border-dashed border-slate-300 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50">
              <Utensils className="h-6 w-6" />
              <span className="font-semibold">Log Meals</span>
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
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">All Members Summary</h2>
          <Button variant="ghost" size="sm" asChild><a href="/members">View Details</a></Button>
        </div>
        <div className="grid gap-3">
          {members.map(member => {
            const mStats = getMemberStats(member.id);
            return (
              <div key={member.id} className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 text-xs"><AvatarFallback>{member.avatar}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{formatMealCount(mStats.mealsEaten)} Meals</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${mStats.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {mStats.balance >= 0 ? '+' : '-'}{Math.round(Math.abs(mStats.balance))}
                  </p>
                  <p className="text-xs text-muted-foreground">Bal</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 pt-2">
        <InstallAppCard />
        <ShareDashboardCard />
        <CycleManagementCard onCloseCycle={closeActiveCycle} hasPendingCycle={!!pendingCycle} />
      </section>
    </div>
  );
}
