-- Monthly spending limit per category (personal: each user has their own)
create table if not exists public.budgets (
  id            bigserial primary key,
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  category      text not null,
  amount_cents  bigint not null check (amount_cents > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, category)
);

alter table public.budgets enable row level security;

create policy "budgets_select_own" on public.budgets
  for select using (user_id = auth.uid());
create policy "budgets_insert_own" on public.budgets
  for insert with check (user_id = auth.uid());
create policy "budgets_update_own" on public.budgets
  for update using (user_id = auth.uid());
create policy "budgets_delete_own" on public.budgets
  for delete using (user_id = auth.uid());

notify pgrst, 'reload schema';
