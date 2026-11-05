-- Subscription suggestions the user dismissed ("not a subscription"), keyed by account + normalised description
create table if not exists public.dismissed_subscriptions (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  key         text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.dismissed_subscriptions enable row level security;

create policy "dismissed_subscriptions_select_own" on public.dismissed_subscriptions
  for select using (user_id = auth.uid());
create policy "dismissed_subscriptions_insert_own" on public.dismissed_subscriptions
  for insert with check (user_id = auth.uid());
create policy "dismissed_subscriptions_delete_own" on public.dismissed_subscriptions
  for delete using (user_id = auth.uid());

notify pgrst, 'reload schema';
