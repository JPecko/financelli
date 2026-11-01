-- Month-end market value per investment account (one row per account per month, overwritten during the month)
create table if not exists investment_snapshots (
  id            bigserial primary key,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id    bigint not null references accounts(id) on delete cascade,
  snapshot_date date not null,
  value_cents   bigint not null,
  updated_at    timestamptz not null default now(),
  unique (account_id, snapshot_date)
);

alter table investment_snapshots enable row level security;

create policy "investment_snapshots_select" on investment_snapshots
for select using (
  user_id = auth.uid()
  or account_id in (select account_id from account_shares where shared_with_id = auth.uid())
);

create policy "investment_snapshots_insert" on investment_snapshots
for insert with check (
  account_id in (select id from accounts where user_id = auth.uid())
);

create policy "investment_snapshots_update" on investment_snapshots
for update using (user_id = auth.uid());

notify pgrst, 'reload schema';
