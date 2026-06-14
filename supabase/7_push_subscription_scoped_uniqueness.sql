alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_endpoint_key;

drop index if exists push_subscriptions_endpoint_key;

create unique index if not exists push_subscriptions_main_unique_idx
  on public.push_subscriptions(user_id, endpoint)
  where audience = 'main' and share_token is null;

create unique index if not exists push_subscriptions_shared_unique_idx
  on public.push_subscriptions(user_id, share_token, endpoint)
  where audience = 'shared';
