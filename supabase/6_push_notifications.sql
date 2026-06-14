create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audience text not null check (audience in ('main', 'shared')),
  share_token text,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_audience_idx
  on public.push_subscriptions(user_id, audience);

create index if not exists push_subscriptions_shared_token_idx
  on public.push_subscriptions(share_token)
  where audience = 'shared';

create unique index if not exists push_subscriptions_main_unique_idx
  on public.push_subscriptions(user_id, endpoint)
  where audience = 'main' and share_token is null;

create unique index if not exists push_subscriptions_shared_unique_idx
  on public.push_subscriptions(user_id, share_token, endpoint)
  where audience = 'shared';

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('meal_log_reminder', 'notice_posted')),
  dedupe_key text not null,
  sent_at timestamptz not null default now()
);

create unique index if not exists notification_deliveries_user_type_dedupe_idx
  on public.notification_deliveries(user_id, type, dedupe_key);

alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "server manages push subscriptions" on public.push_subscriptions;
drop policy if exists "server manages notification deliveries" on public.notification_deliveries;
