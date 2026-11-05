-- Savings goals: a target amount tracked against the live balance of linked accounts (personal: each user has their own)
create table if not exists public.savings_goals (
  id            bigserial primary key,
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  name          text not null,
  target_cents  bigint not null check (target_cents > 0),
  target_date   date,
  account_ids   bigint[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.savings_goals enable row level security;

create policy "savings_goals_select_own" on public.savings_goals
  for select using (user_id = auth.uid());
create policy "savings_goals_insert_own" on public.savings_goals
  for insert with check (user_id = auth.uid());
create policy "savings_goals_update_own" on public.savings_goals
  for update using (user_id = auth.uid());
create policy "savings_goals_delete_own" on public.savings_goals
  for delete using (user_id = auth.uid());

notify pgrst, 'reload schema';
