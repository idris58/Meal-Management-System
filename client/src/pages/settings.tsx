import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle,
  Archive,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Megaphone,
  Pencil,
  Play,
  RefreshCcw,
  Settings2,
  Share2,
  ShoppingBag,
  Trash2,
  Users,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { addHours, format, formatDistanceToNow, isPast, parseISO } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/lib/auth-context';
import { useMeal } from '@/lib/meal-context';
import { usePushNotifications } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

type ShareLinkConfig = {
  token: string;
  is_enabled: boolean;
};

type ActiveNotice = {
  id: string;
  title: string;
  content: string;
  expires_at: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const SHARE_TOKEN_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SHARE_TOKEN_LENGTH = 6;

function createShareToken() {
  const randomValues = new Uint8Array(SHARE_TOKEN_LENGTH);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => SHARE_TOKEN_ALPHABET[value % SHARE_TOKEN_ALPHABET.length]).join('');
}

function formatCurrency(amount: number) {
  return `৳${amount.toFixed(0)}`;
}

function formatMealCount(value: number) {
  const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
  return rounded.toString();
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ── Cycle Management Card ─────────────────────────────────────────────────────

function CycleManagementCard() {
  const {
    activeCycle, pendingCycle, stats, members,
    closeActiveCycle, renameActiveCycle, startNewCycle, suggestCycleName,
  } = useMeal();
  const { canManageCycles } = useAuth();

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeStep, setCloseStep] = useState<1 | 2>(1);
  const [isClosing, setIsClosing] = useState(false);

  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const startRename = () => {
    setRenameValue(activeCycle?.name ?? '');
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const cancelRename = () => { setIsRenaming(false); setRenameValue(''); };

  const saveRename = async () => {
    if (!renameValue.trim() || renameValue.trim() === activeCycle?.name) { cancelRename(); return; }
    setIsSavingName(true);
    try { await renameActiveCycle(renameValue.trim()); setIsRenaming(false); }
    finally { setIsSavingName(false); }
  };

  const handleCloseConfirm = async () => {
    setIsClosing(true);
    try { await closeActiveCycle(); setCloseDialogOpen(false); setCloseStep(1); }
    finally { setIsClosing(false); }
  };

  const handleOpenStart = () => {
    setCycleName(suggestCycleName(new Date()));
    setStartDate(new Date()); setStartError(null); setStartDialogOpen(true);
  };

  const handleStart = async () => {
    if (!cycleName.trim()) { setStartError('Cycle name is required.'); return; }
    setIsStarting(true); setStartError(null);
    try { await startNewCycle(cycleName.trim(), startDate.toISOString()); setStartDialogOpen(false); }
    catch (err) { setStartError(err instanceof Error ? err.message : 'Failed to start cycle.'); }
    finally { setIsStarting(false); }
  };

  const startedAt = activeCycle ? new Date(activeCycle.startedAt) : null;
  const durationLabel = startedAt ? formatDistanceToNow(startedAt, { addSuffix: false }) : null;

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <RefreshCcw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          Cycle Operations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeCycle ? (
          <div className="overflow-hidden rounded-xl border bg-emerald-500/5">
            {/* Status bar */}
            <div className="flex items-center justify-between gap-3 border-b bg-emerald-500/5 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Active Cycle</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {durationLabel} · Started {startedAt ? format(startedAt, 'MMM d') : '—'}
              </div>
            </div>
            {/* Name + rename */}
            <div className="flex items-center gap-3 px-4 py-3">
              {isRenaming ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input ref={renameInputRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void saveRename(); if (e.key === 'Escape') cancelRename(); }} className="h-8 text-sm font-semibold" disabled={isSavingName} />
                  <Button size="sm" className="h-8 shrink-0" onClick={() => void saveRename()} disabled={isSavingName}>
                    {isSavingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={cancelRename} disabled={isSavingName}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <p className="truncate text-base font-bold">{activeCycle.name}</p>
                  {canManageCycles && (
                    <button type="button" onClick={startRename} className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Rename cycle">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Metrics strip */}
            <div className="grid grid-cols-4 gap-px border-t bg-border">
              {[
                { icon: Users, value: members.length, label: 'Members' },
                { icon: Utensils, value: formatMealCount(stats.totalMealsConsumed), label: 'Meals' },
                { icon: ShoppingBag, value: formatCurrency(stats.totalMealExpenses + stats.totalFixedExpenses), label: 'Expenses' },
                { icon: Wallet, value: formatCurrency(stats.remainingCash), label: 'Cash' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center gap-0.5 bg-card px-2 py-2.5 text-center">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                  <span className="text-sm font-bold leading-none">{value}</span>
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            {/* Pending warning */}
            {pendingCycle && (
              <div className="flex items-center gap-2 border-t bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Pending settlement —{' '}
                <a href="/app/history" className="font-semibold underline underline-offset-2">go to History to finalize</a>
              </div>
            )}
            {/* Actions */}
            {canManageCycles && (
              <div className="border-t px-4 py-3">
                <Button
                  variant="outline" size="sm"
                  className="gap-2 border-amber-300 text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  disabled={!!pendingCycle}
                  title={pendingCycle ? 'Finish the pending settlement before closing this cycle' : undefined}
                  onClick={() => { setCloseStep(1); setCloseDialogOpen(true); }}
                >
                  <Archive className="h-4 w-4" />Close Cycle
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Play className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">No Active Cycle</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {pendingCycle ? 'A cycle is in pending settlement. Start a new one when ready.' : 'Start a new cycle to begin tracking meals, expenses, and deposits.'}
            </p>
            {pendingCycle && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Settle pending cycle balances in{' '}
                  <a href="/app/history" className="font-semibold underline underline-offset-2">History</a>{' '}
                  first for clean accounts.
                </span>
              </div>
            )}
            {canManageCycles && (
              <Button className="mt-4 gap-2" onClick={handleOpenStart}>
                <Play className="h-4 w-4" />Start New Cycle
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Close Cycle Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={(open) => { setCloseDialogOpen(open); if (!open) setCloseStep(1); }}>
        <DialogContent className="max-w-md w-[95%]">
          {closeStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-amber-500" />Close Current Cycle</DialogTitle>
                <DialogDescription>Review the cycle summary before closing.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-xl border bg-secondary/30 p-4 space-y-3">
                  <p className="text-sm font-semibold">{activeCycle?.name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Members', value: members.length },
                      { label: 'Total Meals', value: formatMealCount(stats.totalMealsConsumed) },
                      { label: 'Total Expenses', value: formatCurrency(stats.totalMealExpenses + stats.totalFixedExpenses) },
                      { label: 'Remaining Cash', value: formatCurrency(stats.remainingCash) },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-card p-2.5 border">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-lg font-bold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <p className="font-semibold">What happens when you close?</p>
                  <ul className="mt-1.5 list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-400">
                    <li>This cycle moves to <strong>Pending Settlement</strong> in History</li>
                    <li>No new cycle starts automatically</li>
                    <li>You can still add corrections in History</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
                <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400" onClick={() => setCloseStep(2)}>Continue</Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400"><AlertTriangle className="h-5 w-5" />Confirm Close Cycle</DialogTitle>
                <DialogDescription>This action cannot be undone. The cycle will enter pending settlement.</DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground py-2">Are you sure you want to close <strong>"{activeCycle?.name}"</strong>? No new cycle will start automatically.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setCloseStep(1)} disabled={isClosing}>Back</Button>
                <Button variant="destructive" className="gap-2" onClick={() => void handleCloseConfirm()} disabled={isClosing}>
                  {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  {isClosing ? 'Closing…' : 'Yes, Close Cycle'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Start New Cycle Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="max-w-md w-[95%]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Play className="h-5 w-5 text-emerald-500" />Start New Cycle</DialogTitle>
            <DialogDescription>Name your new cycle and choose a start date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cycle Name</label>
              <Input id="settings-new-cycle-name" value={cycleName} onChange={(e) => { setCycleName(e.target.value); setStartError(null); }} placeholder="e.g. Meal_Sep-26" onKeyDown={(e) => { if (e.key === 'Enter') void handleStart(); }} autoFocus />
              <p className="text-xs text-muted-foreground">A descriptive name helps identify this cycle in history later.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />{format(startDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-xl p-0 shadow-xl" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus className="p-3" />
                </PopoverContent>
              </Popover>
            </div>
            {startError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{startError}</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setStartDialogOpen(false)} disabled={isStarting}>Cancel</Button>
            <Button className="gap-2" onClick={() => void handleStart()} disabled={isStarting}>
              {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isStarting ? 'Starting…' : 'Start Cycle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Share Settings Card ───────────────────────────────────────────────────────

function ShareSettingsCard() {
  const { user, profile } = useAuth();
  const [config, setConfig] = useState<ShareLinkConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const loadConfig = async () => {
      try {
        setLoading(true); setError(null);
        let query = supabase.from('share_links').select('token, is_enabled');
        if (profile?.mess_id) query = query.eq('mess_id', profile.mess_id);
        else query = query.eq('user_id', user.id);
        const { data, error: fetchError } = await query.maybeSingle();
        if (fetchError) throw fetchError;
        if (active) setConfig(data ? { token: data.token, is_enabled: data.is_enabled } : null);
      } catch (caughtError) {
        if (!active) return;
        console.error('Error loading share link config:', caughtError);
        setError('Unable to load share settings. Run the share_links SQL setup first if needed.');
      } finally { if (active) setLoading(false); }
    };
    void loadConfig();
    return () => { active = false; };
  }, [user?.id]);

  const shareUrl = config?.token ? `${window.location.origin}/shared/${config.token}` : '';
  const mealCode = config?.token ?? '';

  const upsertConfig = async (nextConfig: ShareLinkConfig) => {
    if (!user?.id || working) return null;
    setWorking(true); setError(null); setMessage(null);
    try {
      const payload: Record<string, any> = { user_id: user.id, profile_id: user.id, token: nextConfig.token, is_enabled: nextConfig.is_enabled, updated_at: new Date().toISOString() };
      if (profile?.mess_id) payload.mess_id = profile.mess_id;
      const { data, error: upsertError } = await supabase.from('share_links').upsert(payload, { onConflict: 'user_id' }).select('token, is_enabled').single();
      if (upsertError) throw upsertError;
      setConfig({ token: data.token, is_enabled: data.is_enabled }); return data;
    } catch (caughtError: any) {
      console.error('Error saving share config:', caughtError);
      setError(caughtError?.message || 'Unable to update the share link right now.'); return null;
    } finally { setWorking(false); }
  };

  const handleEnableSharing = async () => { const saved = await upsertConfig({ token: config?.token ?? createShareToken(), is_enabled: true }); if (saved) setMessage('Sharing is enabled. You can now copy the public view link.'); };
  const handleDisableSharing = async () => { if (!config) return; const saved = await upsertConfig({ token: config.token, is_enabled: false }); if (saved) setMessage('Sharing is disabled. The old link will no longer work.'); };
  const handleRegenerate = async () => { const saved = await upsertConfig({ token: createShareToken(), is_enabled: true }); if (saved) setMessage('A new share link was generated. The previous link is now invalid.'); };
  const handleCopy = async () => {
    if (!shareUrl || !config?.is_enabled) return;
    try { await navigator.clipboard.writeText(shareUrl); setMessage('Shared link copied to clipboard.'); setError(null); }
    catch { setError('Unable to copy the link. Copy it manually from the field below.'); }
  };
  const handleCopyMealCode = async () => {
    if (!mealCode || !config?.is_enabled) return;
    try { await navigator.clipboard.writeText(mealCode); setMessage('Meal Code copied to clipboard.'); setError(null); }
    catch { setError('Unable to copy the Meal Code right now. Copy it manually from the field below.'); }
  };

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
            <Share2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </div>
          Public Sharing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Create a read-only public link so members can view the current meal cycle without logging in.</p>
        <div className="flex items-center justify-between rounded-xl border bg-secondary/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Sharing status</p>
            {loading ? <Skeleton className="mt-1 h-3.5 w-16" /> : (
              <p className={cn('text-xs font-medium mt-0.5', config?.is_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                {config?.is_enabled ? '● Enabled' : '○ Disabled'}
              </p>
            )}
          </div>
          <Button variant={config?.is_enabled ? 'outline' : 'default'} size="sm" onClick={config?.is_enabled ? handleDisableSharing : handleEnableSharing} disabled={loading || working}>
            {config?.is_enabled ? 'Disable' : 'Enable Share'}
          </Button>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Public Link</label>
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly placeholder="Enable sharing to generate a public link" className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={handleCopy} disabled={!config?.is_enabled || !shareUrl} title="Copy link"><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meal Code</label>
          <div className="flex gap-2">
            <Input value={mealCode} readOnly placeholder="Enable sharing to generate a Meal Code" className="font-mono text-sm font-bold tracking-widest" />
            <Button type="button" variant="outline" size="sm" onClick={handleCopyMealCode} disabled={!config?.is_enabled || !mealCode}>Copy Code</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {config?.is_enabled && shareUrl ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={shareUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />Open Shared View</a>
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled><ExternalLink className="h-3.5 w-3.5" />Open Shared View</Button>
          )}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleRegenerate} disabled={loading || working}><RefreshCcw className="h-3.5 w-3.5" />Regenerate Link</Button>
        </div>
        {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">{message}</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}

// ── Notification Settings Card ────────────────────────────────────────────────

function NotificationSettingsCard() {
  const { supported, status, hasSubscription, working, error, message, subscribe, unsubscribe } = usePushNotifications({ mode: 'main' });
  const handleToggle = (checked: boolean) => { if (checked) { void subscribe(); return; } void unsubscribe(); };

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
            <BellRing className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-xl border bg-secondary/30 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Meal log reminders</p>
            <p className="text-xs text-muted-foreground">Get a browser notification at 10:00 PM if today's active-cycle meal log has not been saved.</p>
            {!supported ? <p className="text-xs text-muted-foreground">This browser does not support Web Push notifications.</p>
              : status === 'denied' ? <p className="text-xs text-red-600 dark:text-red-400">Notifications are blocked. Allow them from your browser settings to enable reminders.</p>
              : null}
          </div>
          <Switch checked={hasSubscription} disabled={!supported || working || status === 'denied'} onCheckedChange={handleToggle} aria-label="Toggle meal log reminder notifications" />
        </div>
        {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">{message}</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}

// ── Notice Settings Card ──────────────────────────────────────────────────────

function NoticeSettingsCard() {
  const { user, profile } = useAuth();
  const [activeNotice, setActiveNotice] = useState<ActiveNotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiryMode, setExpiryMode] = useState<'hours' | 'datetime'>('hours');
  const [durationHours, setDurationHours] = useState('24');
  const [expiryDatetime, setExpiryDatetime] = useState('');
  const minDatetime = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  const resetNoticeForm = () => { setTitle(''); setContent(''); setExpiryMode('hours'); setDurationHours('24'); setExpiryDatetime(''); setIsEditingNotice(false); };

  const broadcastNoticeUpdate = async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) return;
    try { const response = await fetch('/api/notices/broadcast', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }); if (!response.ok) console.error('Error broadcasting notice update:', await response.text()); }
    catch (err) { console.error('Error broadcasting notice update:', err); }
  };

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        let cleanupQuery = supabase.from('notices').delete().lte('expires_at', now);
        if (profile?.mess_id) cleanupQuery = cleanupQuery.eq('mess_id', profile.mess_id);
        else cleanupQuery = cleanupQuery.eq('user_id', user.id);
        const { error: cleanupError } = await cleanupQuery;
        if (cleanupError) throw cleanupError;
        let fetchQuery = supabase.from('notices').select('id, title, content, expires_at').gt('expires_at', now).order('created_at', { ascending: false }).limit(1);
        if (profile?.mess_id) fetchQuery = fetchQuery.eq('mess_id', profile.mess_id);
        else fetchQuery = fetchQuery.eq('user_id', user.id);
        const { data, error: fetchError } = await fetchQuery.maybeSingle();
        if (fetchError) throw fetchError;
        if (active) setActiveNotice(data as ActiveNotice | null);
      } catch (err) {
        console.error('Error loading notice:', err);
        if (active) setError('Could not load notices. Make sure the notices table exists in Supabase.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [user?.id, profile?.mess_id]);

  useEffect(() => {
    if (!activeNotice || !user?.id) return;
    const delay = parseISO(activeNotice.expires_at).getTime() - Date.now();
    if (delay <= 0) { setActiveNotice(null); resetNoticeForm(); return; }
    const timeoutId = window.setTimeout(() => {
      void supabase.from('notices').delete().eq('id', activeNotice.id).then(({ error: deleteError }) => {
        if (deleteError) { console.error('Error deleting expired notice:', deleteError); return; }
        setActiveNotice((currentNotice) => currentNotice?.id === activeNotice.id ? null : currentNotice);
        resetNoticeForm(); void broadcastNoticeUpdate();
      });
    }, delay);
    return () => window.clearTimeout(timeoutId);
  }, [activeNotice, user?.id]);

  const handleSubmitNotice = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id || working) return;
    const trimTitle = title.trim(); const trimContent = content.trim();
    if (!trimTitle) { setError('Title is required.'); return; }
    if (!trimContent) { setError('Content is required.'); return; }
    let expiresAt: Date;
    if (expiryMode === 'hours') {
      const hours = parseFloat(durationHours);
      if (isNaN(hours) || hours <= 0) { setError('Enter a valid duration in hours.'); return; }
      expiresAt = addHours(new Date(), hours);
    } else {
      if (!expiryDatetime) { setError('Select an expiry date and time.'); return; }
      expiresAt = parseISO(expiryDatetime);
      if (isPast(expiresAt)) { setError('Expiry must be in the future.'); return; }
    }
    setWorking(true); setError(null); setMessage(null);
    try {
      if (isEditingNotice && activeNotice) {
        const { data, error: updateError } = await supabase.from('notices').update({ title: trimTitle, content: trimContent, expires_at: expiresAt.toISOString() }).eq('id', activeNotice.id).select('id, title, content, expires_at').single();
        if (updateError) throw updateError;
        setActiveNotice(data as ActiveNotice); resetNoticeForm(); void broadcastNoticeUpdate();
        setMessage('Notice updated. The shared view will show the new text immediately.'); return;
      }
      const now = new Date().toISOString();
      let expireOldQuery = supabase.from('notices').update({ expires_at: now });
      if (profile?.mess_id) expireOldQuery = expireOldQuery.eq('mess_id', profile.mess_id);
      else expireOldQuery = expireOldQuery.eq('user_id', user.id);
      await expireOldQuery.gt('expires_at', now);
      const insertPayload: Record<string, any> = { user_id: user.id, profile_id: user.id, title: trimTitle, content: trimContent, expires_at: expiresAt.toISOString() };
      if (profile?.mess_id) insertPayload.mess_id = profile.mess_id;
      const { data, error: insertError } = await supabase.from('notices').insert([insertPayload]).select('id, title, content, expires_at').single();
      if (insertError) throw insertError;
      setActiveNotice(data as ActiveNotice); resetNoticeForm(); void broadcastNoticeUpdate();
      setMessage('Notice posted! It will appear in the shared view immediately.');
    } catch (err: any) {
      console.error('Error posting notice:', err);
      setError(err?.message || (isEditingNotice ? 'Unable to update the notice right now.' : 'Unable to post the notice right now.'));
    } finally { setWorking(false); }
  };

  const handleStartEdit = () => {
    if (!activeNotice) return;
    setTitle(activeNotice.title); setContent(activeNotice.content);
    setExpiryMode('datetime'); setExpiryDatetime(format(parseISO(activeNotice.expires_at), "yyyy-MM-dd'T'HH:mm")); setDurationHours('24'); setIsEditingNotice(true); setMessage(null); setError(null);
  };

  const handleDelete = async () => {
    if (!activeNotice || !user?.id || working) return;
    setWorking(true); setError(null); setMessage(null);
    try {
      const { error: deleteError } = await supabase.from('notices').delete().eq('id', activeNotice.id);
      if (deleteError) throw deleteError;
      setActiveNotice(null); resetNoticeForm(); void broadcastNoticeUpdate();
      setMessage('Notice removed from the shared view.');
    } catch (err: any) {
      console.error('Error deleting notice:', err);
      setError(err?.message || 'Unable to delete the notice right now.');
    } finally { setWorking(false); }
  };

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          Notice Board
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">Post a notice that appears as a running ticker below the shared view header. Only one notice is active at a time.</p>

        {!loading && activeNotice && !isEditingNotice && (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Active Notice</p>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400" onClick={handleStartEdit} disabled={working}><Pencil className="h-3 w-3" />Edit</Button>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400" onClick={handleDelete} disabled={working}><Trash2 className="h-3 w-3" />Remove</Button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">{activeNotice.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{activeNotice.content}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Expires {formatDistanceToNow(parseISO(activeNotice.expires_at), { addSuffix: true })}
                {' '}({format(parseISO(activeNotice.expires_at), 'dd MMM yyyy, hh:mm a')})
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2 rounded-xl border bg-secondary/20 p-4">
            <Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
          </div>
        )}

        <form onSubmit={handleSubmitNotice} className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isEditingNotice ? 'Edit active notice' : activeNotice ? 'Post new notice (replaces active one)' : 'Post a notice'}
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="notice-title">Title</label>
            <Input id="notice-title" placeholder="e.g. Important update for all members" value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }} disabled={working} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="notice-content">Content</label>
            <Textarea id="notice-content" placeholder="Write your notice message here..." rows={3} value={content} onChange={(e) => { setContent(e.target.value); setError(null); }} disabled={working} className="resize-none" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Expiry</p>
            <div className="flex gap-2">
              {(['hours', 'datetime'] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setExpiryMode(mode)} className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors', expiryMode === mode ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-muted')}>
                  {mode === 'hours' ? 'Duration (hours)' : 'Specific date & time'}
                </button>
              ))}
            </div>
            {expiryMode === 'hours' ? (
              <div className="flex items-center gap-2">
                <Input id="notice-duration" type="number" min="0.5" step="0.5" placeholder="24" value={durationHours} onChange={(e) => { setDurationHours(e.target.value); setError(null); }} disabled={working} className="w-32" />
                <span className="text-sm text-muted-foreground">hours from now</span>
              </div>
            ) : (
              <Input id="notice-expiry" type="datetime-local" min={minDatetime} value={expiryDatetime} onChange={(e) => { setExpiryDatetime(e.target.value); setError(null); }} disabled={working} />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="gap-2" disabled={working}>
              <Megaphone className="h-4 w-4" />
              {working ? (isEditingNotice ? 'Saving...' : 'Posting...') : isEditingNotice ? 'Save Notice' : 'Post Notice'}
            </Button>
            {isEditingNotice && <Button type="button" variant="outline" onClick={() => { resetNoticeForm(); setError(null); setMessage(null); }} disabled={working}>Cancel Edit</Button>}
          </div>
        </form>

        {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">{message}</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { profile, canManageCycles } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (profile?.role === 'member') setLocation('/app');
  }, [profile?.role, setLocation]);

  if (profile?.role === 'member') return null;

  return (
    <div className="space-y-8 pb-20">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your mess configuration and preferences.</p>
          </div>
        </div>
      </header>

      {canManageCycles && (
        <section className="space-y-4">
          <SectionLabel icon={RefreshCcw} label="Cycle Operations" />
          <CycleManagementCard />
        </section>
      )}

      <section className="space-y-4">
        <SectionLabel icon={Share2} label="Public Access" />
        <ShareSettingsCard />
      </section>

      <section className="space-y-4">
        <SectionLabel icon={Megaphone} label="Notice Board" />
        <NoticeSettingsCard />
      </section>

      <section className="space-y-4">
        <SectionLabel icon={BellRing} label="Notifications" />
        <NotificationSettingsCard />
      </section>
    </div>
  );
}
