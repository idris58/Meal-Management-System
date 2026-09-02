/**
 * notice-context.tsx
 * Centralised state for the active mess notice.
 * – Fetches the current notice from Supabase on mount.
 * – Subscribes to Supabase Realtime (postgres_changes) so every tab /
 *   every user in the same mess sees updates without a page refresh.
 * – Persists per-user dismissals in localStorage so the banner hides
 *   after acknowledgement, but the notice is still visible via the bell.
 * – Exposes postNotice, updateNotice, deleteNotice, dismissNotice,
 *   restoreNotice and broadcastToServer (fires the push delivery).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-context';
import { addHours, isPast, parseISO } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Notice {
  id: string;
  title: string;
  content: string;
  expiresAt: string;
  createdAt?: string;
}

export type NoticeExpiryMode = 'hours' | 'datetime';

interface NoticeContextValue {
  /** Currently active notice for the mess, or null. */
  notice: Notice | null;
  /** True while the initial fetch is in progress. */
  loading: boolean;
  /** True if the user has dismissed the banner for the current notice. */
  dismissed: boolean;
  /** Post or replace a notice. Returns the new notice or null on error. */
  postNotice: (
    title: string,
    content: string,
    expiresAt: Date,
  ) => Promise<Notice | null>;
  /** Update the active notice in-place. Returns updated notice or null. */
  updateNotice: (
    id: string,
    title: string,
    content: string,
    expiresAt: Date,
  ) => Promise<Notice | null>;
  /** Delete the active notice. */
  deleteNotice: (id: string) => Promise<boolean>;
  /** Hide the banner without deleting; saves noticeId to localStorage. */
  dismissNotice: () => void;
  /** Un-dismiss (restore the banner for this notice). */
  restoreNotice: () => void;
  /** Fire the server-side broadcast + push delivery. */
  broadcastToServer: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const NoticeContext = createContext<NoticeContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function NoticeProvider({ children }: { children: ReactNode }) {
  const { user, profile, session } = useAuth();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const dismissKey = (id: string) => `mealtrack-dismissed-notice-${id}`;

  const checkDismissed = useCallback((n: Notice | null) => {
    if (!n) { setDismissed(false); return; }
    setDismissed(Boolean(localStorage.getItem(dismissKey(n.id))));
  }, []);

  /** Convert a DB row to the Notice interface. */
  function rowToNotice(row: {
    id: string;
    title: string;
    content: string;
    expires_at: string;
    created_at?: string;
  }): Notice {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  /** Schedule automatic removal of an expired notice from local state. */
  function scheduleExpiry(n: Notice) {
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    const delay = parseISO(n.expiresAt).getTime() - Date.now();
    if (delay <= 0) { setNotice(null); return; }
    expireTimerRef.current = setTimeout(() => {
      setNotice((prev) => (prev?.id === n.id ? null : prev));
    }, delay);
  }

  /** Server-broadcast helper — calls the API endpoint to push to all subscribers. */
  const broadcastToServer = useCallback(async () => {
    const accessToken = session?.access_token;
    if (!accessToken) return;
    try {
      const res = await fetch('/api/notices/broadcast', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) console.error('Broadcast error:', await res.text());
    } catch (err) {
      console.error('Broadcast fetch error:', err);
    }
  }, [session?.access_token]);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        let q = supabase
          .from('notices')
          .select('id, title, content, expires_at, created_at')
          .gt('expires_at', now)
          .order('created_at', { ascending: false })
          .limit(1);
        if (profile?.mess_id) q = q.eq('mess_id', profile.mess_id);
        else q = q.eq('user_id', user.id);
        const { data, error } = await q.maybeSingle();
        if (error) throw error;
        if (active) {
          const n = data ? rowToNotice(data as any) : null;
          setNotice(n);
          checkDismissed(n);
          if (n) scheduleExpiry(n);
        }
      } catch (err) {
        console.error('Error loading notice:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.mess_id]);

  // ── Supabase Realtime ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notices-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notices',
          // If we have a mess_id filter we add it; otherwise we let RLS handle it
          ...(profile?.mess_id ? { filter: `mess_id=eq.${profile.mess_id}` } : {}),
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'DELETE') {
            setNotice((prev) => {
              const deletedId = (oldRow as any)?.id;
              return prev?.id === deletedId ? null : prev;
            });
            return;
          }

          const row = newRow as any;
          if (!row?.id) return;

          // Ignore if already expired
          if (isPast(parseISO(row.expires_at))) {
            setNotice((prev) => (prev?.id === row.id ? null : prev));
            return;
          }

          const n = rowToNotice(row);
          setNotice(n);
          checkDismissed(n);
          scheduleExpiry(n);
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.mess_id]);

  // ── Cleanup expiry timer ───────────────────────────────────────────────────────

  useEffect(() => () => {
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
  }, []);

  // ── CRUD actions ──────────────────────────────────────────────────────────────

  const postNotice = useCallback(async (
    title: string,
    content: string,
    expiresAt: Date,
  ): Promise<Notice | null> => {
    if (!user?.id) return null;
    const now = new Date().toISOString();

    // Expire any current active notice first
    let expireQ = supabase.from('notices').update({ expires_at: now });
    if (profile?.mess_id) expireQ = expireQ.eq('mess_id', profile.mess_id);
    else expireQ = expireQ.eq('user_id', user.id);
    await expireQ.gt('expires_at', now);

    const payload: Record<string, any> = {
      user_id: user.id,
      profile_id: user.id,
      title,
      content,
      expires_at: expiresAt.toISOString(),
    };
    if (profile?.mess_id) payload.mess_id = profile.mess_id;

    const { data, error } = await supabase
      .from('notices')
      .insert([payload])
      .select('id, title, content, expires_at, created_at')
      .single();

    if (error) { console.error('Error posting notice:', error); return null; }
    const n = rowToNotice(data as any);
    setNotice(n);
    checkDismissed(n);
    scheduleExpiry(n);
    void broadcastToServer();
    return n;
  }, [user?.id, profile?.mess_id, broadcastToServer, checkDismissed]);

  const updateNotice = useCallback(async (
    id: string,
    title: string,
    content: string,
    expiresAt: Date,
  ): Promise<Notice | null> => {
    const { data, error } = await supabase
      .from('notices')
      .update({ title, content, expires_at: expiresAt.toISOString() })
      .eq('id', id)
      .select('id, title, content, expires_at, created_at')
      .single();

    if (error) { console.error('Error updating notice:', error); return null; }
    const n = rowToNotice(data as any);
    setNotice(n);
    checkDismissed(n);
    scheduleExpiry(n);
    void broadcastToServer();
    return n;
  }, [broadcastToServer, checkDismissed]);

  const deleteNotice = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) { console.error('Error deleting notice:', error); return false; }
    setNotice(null);
    void broadcastToServer();
    return true;
  }, [broadcastToServer]);

  const dismissNotice = useCallback(() => {
    if (!notice) return;
    localStorage.setItem(dismissKey(notice.id), '1');
    setDismissed(true);
  }, [notice]);

  const restoreNotice = useCallback(() => {
    if (!notice) return;
    localStorage.removeItem(dismissKey(notice.id));
    setDismissed(false);
  }, [notice]);

  // ── Value ─────────────────────────────────────────────────────────────────────

  const value: NoticeContextValue = {
    notice,
    loading,
    dismissed,
    postNotice,
    updateNotice,
    deleteNotice,
    dismissNotice,
    restoreNotice,
    broadcastToServer,
  };

  return <NoticeContext.Provider value={value}>{children}</NoticeContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotice(): NoticeContextValue {
  const ctx = useContext(NoticeContext);
  if (!ctx) throw new Error('useNotice must be used inside <NoticeProvider>');
  return ctx;
}
