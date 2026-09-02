/**
 * notice-card.tsx
 * A premium Dashboard widget that shows the current active notice.
 * – Visible to ALL roles (member, coordinator, manager).
 * – Managers / Coordinators see Edit + Remove quick-action buttons.
 * – Managers / Coordinators see a "Post Notice" CTA when no notice is active.
 * – Members see an "Acknowledge" button that dismisses the banner.
 * – Countdown badge with real-time remaining time.
 */
import { useState } from 'react';
import { formatDistanceToNow, format, parseISO, isPast } from 'date-fns';
import {
  Clock,
  Loader2,
  Megaphone,
  Pencil,
  PlusCircle,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotice } from '@/lib/notice-context';
import { useAuth } from '@/lib/auth-context';
import { NoticeDialog } from './notice-dialog';

// ── Countdown badge ───────────────────────────────────────────────────────────

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const expiry = parseISO(expiresAt);
  const expired = isPast(expiry);
  const relative = formatDistanceToNow(expiry, { addSuffix: true });
  const absolute = format(expiry, 'dd MMM yyyy, h:mm a');

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        expired
          ? 'border-muted bg-muted/50 text-muted-foreground'
          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
      )}
      title={absolute}
    >
      <Clock className="h-3 w-3 shrink-0" />
      {expired ? 'Expired' : `Expires ${relative}`}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NoticeCard() {
  const { notice, loading, dismissed, dismissNotice, restoreNotice, deleteNotice } = useNotice();
  const { profile } = useAuth();
  const canManage = profile?.role === 'manager' || profile?.role === 'coordinator';

  const [showRead, setShowRead] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Loading skeleton
  if (loading) {
    return (
      <Card className="overflow-hidden border-amber-100 shadow-sm dark:border-amber-900/40">
        <CardHeader className="border-b bg-amber-50/60 p-4 dark:bg-amber-950/20">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  // No active notice — show manager CTA, hide for members
  if (!notice) {
    if (!canManage) return null;

    return (
      <>
        <Card
          className="group cursor-pointer overflow-hidden border-dashed border-amber-200 bg-amber-50/30 shadow-none transition-all hover:border-amber-300 hover:bg-amber-50/60 hover:shadow-sm dark:border-amber-900/30 dark:bg-amber-950/10 dark:hover:border-amber-800/60"
          onClick={() => setShowPost(true)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:ring-amber-800">
              <PlusCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Post a Notice
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Tap to create an announcement for all mess members.
              </p>
            </div>
          </CardContent>
        </Card>

        {showPost && (
          <NoticeDialog mode="post" open={showPost} onOpenChange={setShowPost} />
        )}
      </>
    );
  }

  // Active notice card
  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    await deleteNotice(notice.id);
    setDeleting(false);
  };

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden shadow-sm transition-all hover:shadow-md',
          'border-amber-200/70 dark:border-amber-800/50',
          dismissed && 'opacity-75',
        )}
      >
        {/* Card header */}
        <CardHeader className="border-b border-amber-100 bg-gradient-to-r from-amber-400/10 via-amber-300/5 to-transparent p-4 pb-3 dark:border-amber-900/30 dark:from-amber-800/20">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20 ring-1 ring-amber-400/30 dark:bg-amber-700/30 dark:ring-amber-700/40">
              <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="min-w-0 flex-1">
              {/* Category label */}
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                Active Announcement
              </p>
              {/* Title */}
              <h3 className="font-heading text-base font-bold leading-snug text-foreground">
                {notice.title}
              </h3>
            </div>

            {/* Manager actions (top-right) */}
            {canManage && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  title="Edit notice"
                  onClick={() => setShowEdit(true)}
                  className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Remove notice"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors dark:text-red-400 dark:hover:bg-red-950/30 disabled:opacity-50"
                >
                  {deleting
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Card body */}
        <CardContent className="space-y-3 p-4">
          {/* Content preview */}
          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap line-clamp-3">
            {notice.content}
          </p>

          {/* Expiry + actions row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <ExpiryBadge expiresAt={notice.expiresAt} />

            <div className="flex items-center gap-2">
              {/* Member: Acknowledge (dismiss) */}
              {!canManage && !dismissed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                  onClick={dismissNotice}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Acknowledge
                </Button>
              )}
              {!canManage && dismissed && (
                <button
                  type="button"
                  onClick={restoreNotice}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Show banner
                </button>
              )}

              {/* Read more */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                onClick={() => setShowRead(true)}
              >
                Read More
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {showRead && (
        <NoticeDialog mode="read" open={showRead} onOpenChange={setShowRead} />
      )}
      {showEdit && canManage && (
        <NoticeDialog mode="edit" open={showEdit} onOpenChange={setShowEdit} />
      )}
      {showPost && canManage && (
        <NoticeDialog mode="post" open={showPost} onOpenChange={setShowPost} />
      )}
    </>
  );
}
