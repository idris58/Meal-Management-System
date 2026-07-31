/**
 * offline-toast.tsx
 *
 * Replaces the old static OfflineBanner.
 *
 * Behaviour:
 *  • Goes offline  → Shows a persistent (non-dismissible) Sonner toast with a
 *                    WifiOff icon. Toast stays until connection is restored.
 *  • Comes online  → Dismisses the offline toast, shows a green "Back online!
 *                    Syncing…" success toast (auto-closes after 4 s), then
 *                    calls triggerSync() from MealContext and registers a
 *                    Background Sync tag with the SW for resilience.
 *
 * Note: This component renders nothing in the DOM — all output goes through
 * Sonner's global <Toaster> (added in App.tsx).
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { WifiOff, CloudUpload } from 'lucide-react';
import { useNetworkStatus } from '@/lib/pwa';
import { useMeal } from '@/lib/meal-context';

const OFFLINE_TOAST_ID = 'mealtrack-offline-status';

/** Register a Background Sync tag so the OS can wake the SW even if the tab is backgrounded. */
async function requestBackgroundSync() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    // Background Sync API — not available on all browsers (Firefox, Safari)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const syncManager = (reg as any).sync as { register: (tag: string) => Promise<void> } | undefined;
    if (syncManager) {
      await syncManager.register('mealtrack-sync');
    }
  } catch {
    // Non-fatal — the app-level triggerSync() still runs
  }
}

export function OfflineToastManager() {
  const { isOnline } = useNetworkStatus();
  const { triggerSync } = useMeal();
  const prevOnlineRef = useRef(isOnline);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    // On mount, show the offline toast immediately if already offline
    hasMountedRef.current = true;
    if (!isOnline) {
      toast(
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">You're offline</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">Changes will sync when back online</p>
          </div>
        </div>,
        {
          id: OFFLINE_TOAST_ID,
          duration: Infinity,
          dismissible: false,
          style: {
            background: 'hsl(48 96% 97%)',
            border: '1px solid hsl(45 93% 75%)',
            color: 'hsl(26 83% 14%)',
          },
          className: 'dark:!bg-amber-950/90 dark:!border-amber-700/60',
        },
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasMountedRef.current) return;

    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!isOnline && wasOnline) {
      // Transition: online → offline
      toast(
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">You're offline</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">Changes will sync when back online</p>
          </div>
        </div>,
        {
          id: OFFLINE_TOAST_ID,
          duration: Infinity,
          dismissible: false,
          style: {
            background: 'hsl(48 96% 97%)',
            border: '1px solid hsl(45 93% 75%)',
            color: 'hsl(26 83% 14%)',
          },
          className: 'dark:!bg-amber-950/90 dark:!border-amber-700/60',
        },
      );
    }

    if (isOnline && !wasOnline) {
      // Transition: offline → online
      toast.dismiss(OFFLINE_TOAST_ID);

      toast.success(
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <CloudUpload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Back online!</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Syncing latest changes…</p>
          </div>
        </div>,
        {
          duration: 4000,
          style: {
            background: 'hsl(138 76% 97%)',
            border: '1px solid hsl(141 78% 75%)',
            color: 'hsl(143 64% 14%)',
          },
          className: 'dark:!bg-emerald-950/90 dark:!border-emerald-700/60',
        },
      );

      // Trigger sync in the app layer
      void triggerSync();

      // Also request a Background Sync tag for resilience (even if the tab loses focus)
      void requestBackgroundSync();
    }
  }, [isOnline, triggerSync]);

  return null;
}
