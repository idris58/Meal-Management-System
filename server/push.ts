import cron from "node-cron";
import webpush, { type PushSubscription } from "web-push";

import { assertSupabaseAdmin, supabaseAdmin } from "./supabase-admin";

type PushAudience = "main" | "shared";
type NotificationType = "meal_log_reminder" | "notice_posted";

type PushSubscriptionBody = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type ActiveCycleRow = {
  id: string;
  user_id: string;
};

const DEFAULT_TIMEZONE = "Asia/Dhaka";
let vapidConfigured = false;
let hasLoggedMissingVapid = false;

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey() {
  return getVapidConfig()?.publicKey ?? null;
}

export function isPushConfigured() {
  return Boolean(getVapidConfig());
}

function ensureVapidConfigured() {
  const config = getVapidConfig();

  if (!config) {
    if (!hasLoggedMissingVapid) {
      hasLoggedMissingVapid = true;
      console.warn(
        "Push notifications are disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable Web Push.",
      );
    }
    return false;
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    vapidConfigured = true;
  }

  return true;
}

export function parsePushSubscription(body: PushSubscriptionBody) {
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return { endpoint, p256dh, auth };
}

function toWebPushSubscription(row: PushSubscriptionRow): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

async function deleteSubscription(id: string) {
  const supabase = assertSupabaseAdmin();
  const { error } = await supabase.from("push_subscriptions").delete().eq("id", id);

  if (error) {
    console.error("Error deleting stale push subscription:", error);
  }
}

async function sendPushToRows(
  rows: PushSubscriptionRow[],
  payload: {
    title: string;
    body: string;
    url: string;
    tag: string;
  },
) {
  if (!ensureVapidConfigured()) {
    return;
  }

  const data = JSON.stringify({
    ...payload,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(toWebPushSubscription(row), data);
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscription(row.id);
          return;
        }

        console.error("Error sending push notification:", error);
      }
    }),
  );
}

export async function upsertPushSubscription({
  userId,
  audience,
  shareToken,
  subscription,
  userAgent,
}: {
  userId: string;
  audience: PushAudience;
  shareToken?: string | null;
  subscription: { endpoint: string; p256dh: string; auth: string };
  userAgent?: string;
}) {
  const supabase = assertSupabaseAdmin();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      audience,
      share_token: shareToken ?? null,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      user_agent: userAgent ?? null,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    throw error;
  }
}

export async function removePushSubscription(endpoint: string) {
  const supabase = assertSupabaseAdmin();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) {
    throw error;
  }
}

async function getEnabledShareTokenForUser(userId: string) {
  const supabase = assertSupabaseAdmin();
  const { data, error } = await supabase
    .from("share_links")
    .select("token")
    .eq("user_id", userId)
    .eq("is_enabled", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return typeof data?.token === "string" ? data.token : null;
}

function truncateNotificationBody(value: string) {
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

async function recordDelivery(userId: string, type: NotificationType, dedupeKey: string) {
  const supabase = assertSupabaseAdmin();
  const { error } = await supabase.from("notification_deliveries").insert({
    user_id: userId,
    type,
    dedupe_key: dedupeKey,
  });

  if (error?.code === "23505") {
    return false;
  }

  if (error) {
    throw error;
  }

  return true;
}

export async function sendNoticePushToSharedSubscribers(
  userId: string,
  notice: { id: string; title: string; content: string; expiresAt: string } | null,
) {
  if (!notice) {
    return;
  }

  const shareToken = await getEnabledShareTokenForUser(userId);
  if (!shareToken) {
    return;
  }

  const supabase = assertSupabaseAdmin();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("audience", "shared")
    .eq("share_token", shareToken);

  if (error) {
    console.error("Error loading shared push subscriptions:", error);
    return;
  }

  const rows = (data || []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return;
  }

  const deliveryRecorded = await recordDelivery(
    userId,
    "notice_posted",
    `${notice.id}:${notice.expiresAt}`,
  );

  if (!deliveryRecorded) {
    return;
  }

  await sendPushToRows(rows, {
    title: "New MealTrack Notice",
    body: truncateNotificationBody(`${notice.title}: ${notice.content}`),
    url: `/shared/${shareToken}`,
    tag: `notice-${notice.id}`,
  });
}

function getDateInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export async function sendMealLogReminders() {
  if (!ensureVapidConfigured()) {
    return;
  }

  const supabase = assertSupabaseAdmin();
  const timeZone = process.env.NOTIFICATION_TIMEZONE || DEFAULT_TIMEZONE;
  const today = getDateInTimeZone(timeZone);

  const { data: activeCycles, error: cyclesError } = await supabase
    .from("cycles")
    .select("id, user_id")
    .eq("status", "active");

  if (cyclesError) {
    console.error("Error loading active cycles for reminders:", cyclesError);
    return;
  }

  for (const cycle of (activeCycles || []) as ActiveCycleRow[]) {
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("user_id", cycle.user_id)
      .eq("audience", "main");

    if (subscriptionError) {
      console.error("Error loading main push subscriptions:", subscriptionError);
      continue;
    }

    const rows = (subscriptions || []) as PushSubscriptionRow[];
    if (rows.length === 0) {
      continue;
    }

    const { data: mealLog, error: mealLogError } = await supabase
      .from("meal_logs")
      .select("id")
      .eq("user_id", cycle.user_id)
      .eq("cycle_id", cycle.id)
      .eq("date", today)
      .limit(1)
      .maybeSingle();

    if (mealLogError) {
      console.error("Error checking today's meal logs:", mealLogError);
      continue;
    }

    if (mealLog) {
      continue;
    }

    const deliveryRecorded = await recordDelivery(
      cycle.user_id,
      "meal_log_reminder",
      `${today}:${cycle.id}`,
    ).catch((error) => {
      console.error("Error recording meal reminder delivery:", error);
      return false;
    });

    if (!deliveryRecorded) {
      continue;
    }

    await sendPushToRows(rows, {
      title: "Meal log reminder",
      body: "Today's meal has not been logged yet.",
      url: "/app/meals",
      tag: `meal-log-reminder-${today}-${cycle.id}`,
    });
  }
}

export function startMealReminderScheduler() {
  if (!supabaseAdmin) {
    console.warn("Meal reminder scheduler disabled. Missing Supabase service role client.");
    return;
  }

  const timeZone = process.env.NOTIFICATION_TIMEZONE || DEFAULT_TIMEZONE;
  cron.schedule(
    "0 22 * * *",
    () => {
      void sendMealLogReminders();
    },
    { timezone: timeZone },
  );
}
