import { supabase } from '@/lib/supabase';

export type NotificationPreferences = { reminderTime: string; reminderTimezone: string };

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await fetch('/api/push/preferences', { headers: await authHeaders() });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || 'Unable to load reminder preferences.');
  return body;
}

export async function saveNotificationPreferences(preferences: NotificationPreferences): Promise<NotificationPreferences> {
  const response = await fetch('/api/push/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify(preferences) });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || 'Unable to save reminder preferences.');
  return body;
}
