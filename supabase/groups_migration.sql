-- ============================================================
-- Groups Phase 1 Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ---- 1. groups ------------------------------------------------
create table if not exists public.groups (
  id          serial primary key,
  name        text        not null,
  currency    text        not null default 'EUR',
  created_by  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---- 2. group_members -----------------------------------------
create table if not exists public.group_members (
  id         serial  primary key,
  group_id   int     not null references public.groups(id) on delete cascade,
  user_id    uuid    references auth.users(id) on delete set null,  -- null = non-app member
  name       text    not null,           -- display name (editable alias)
  email      text,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)             -- at most one row per app user per group
);

-- ---- 3. group_entries -----------------------------------------
create table if not exists public.group_entries (
  id               serial  primary key,
  group_id         int     not null references public.groups(id) on delete cascade,
  description      text    not null,
  date             date    not null,
  category         text    not null default 'other',
  total_amount     int     not null check (total_amount > 0),   -- cents
  paid_by_member_id int    not null references public.group_members(id) on delete restrict,
  notes            text,
  created_by       uuid    not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now()
);

-- ---- 4. group_entry_splits ------------------------------------
create table if not exists public.group_entry_splits (
  id        serial primary key,
  entry_id  int    not null references public.group_entries(id) on delete cascade,
  member_id int    not null references public.group_members(id) on delete cascade,
  amount    int    not null check (amount >= 0),   -- cents owed by this member
  unique (entry_id, member_id)
);

-- ---- Indexes ---------------------------------------------------
create index if not exists idx_group_members_user_id on public.group_members(user_id);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_entries_group_id on public.group_entries(group_id);
create index if not exists idx_group_entry_splits_entry_id on public.group_entry_splits(entry_id);
create index if not exists idx_group_entry_splits_member_id on public.group_entry_splits(member_id);

-- ---- Enable RLS -----------------------------------------------
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.group_entries       enable row level security;
alter table public.group_entry_splits  enable row level security;

-- ---- Helper: lookup Financelli user by email ------------------
create or replace function public.lookup_user_by_email(p_email text)
returns table (user_id uuid, display_name text)
language sql
security definer
stable
as $$
  select
    id,
    coalesce(
      nullif(raw_user_meta_data->>'full_name', ''),
      split_part(email, '@', 1)
    )
  from auth.users
  where email = lower(trim(p_email))
  limit 1;
$$;

-- ---- Helper: is the current user a member of a group? ---------
create or replace function public.is_group_member(p_group_id int)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id  = auth.uid()
  )
$$;

-- ---- RLS: groups ----------------------------------------------
drop policy if exists "members can view group"                  on public.groups;
drop policy if exists "authenticated users can create group"    on public.groups;
drop policy if exists "members can update group"                on public.groups;
drop policy if exists "creator can delete group"                on public.groups;

-- View any group you're a member of, or created
create policy "members can view group"
  on public.groups for select
  using (auth.uid() = created_by or public.is_group_member(id));

-- Create group: anyone authenticated
create policy "authenticated users can create group"
  on public.groups for insert
  with check (auth.uid() = created_by);

-- Update group: only members
create policy "members can update group"
  on public.groups for update
  using (public.is_group_member(id));

-- Delete group: only creator
create policy "creator can delete group"
  on public.groups for delete
  using (auth.uid() = created_by);

-- ---- RLS: group_members ----------------------------------------
drop policy if exists "members can view group members"   on public.group_members;
drop policy if exists "members can insert group members" on public.group_members;
drop policy if exists "members can update group members" on public.group_members;
drop policy if exists "members can delete group members" on public.group_members;

create policy "members can view group members"
  on public.group_members for select
  using (public.is_group_member(group_id));

create policy "members can insert group members"
  on public.group_members for insert
  with check (
    public.is_group_member(group_id)
    or exists (
      select 1 from public.groups
      where id = group_id and created_by = auth.uid()
    )
  );

create policy "members can update group members"
  on public.group_members for update
  using (public.is_group_member(group_id));

create policy "members can delete group members"
  on public.group_members for delete
  using (public.is_group_member(group_id));

-- ---- RLS: group_entries ----------------------------------------
drop policy if exists "members can view group entries"   on public.group_entries;
drop policy if exists "members can insert group entries" on public.group_entries;
drop policy if exists "members can update group entries" on public.group_entries;
drop policy if exists "members can delete group entries" on public.group_entries;

create policy "members can view group entries"
  on public.group_entries for select
  using (public.is_group_member(group_id));

create policy "members can insert group entries"
  on public.group_entries for insert
  with check (public.is_group_member(group_id) and auth.uid() = created_by);

create policy "members can update group entries"
  on public.group_entries for update
  using (public.is_group_member(group_id));

create policy "members can delete group entries"
  on public.group_entries for delete
  using (public.is_group_member(group_id));

-- ---- RLS: group_entry_splits -----------------------------------
drop policy if exists "members can view splits"   on public.group_entry_splits;
drop policy if exists "members can insert splits" on public.group_entry_splits;
drop policy if exists "members can update splits" on public.group_entry_splits;
drop policy if exists "members can delete splits" on public.group_entry_splits;

create policy "members can view splits"
  on public.group_entry_splits for select
  using (
    exists (
      select 1
      from public.group_entries ge
      where ge.id = entry_id
        and public.is_group_member(ge.group_id)
    )
  );

create policy "members can insert splits"
  on public.group_entry_splits for insert
  with check (
    exists (
      select 1
      from public.group_entries ge
      where ge.id = entry_id
        and public.is_group_member(ge.group_id)
    )
  );

create policy "members can update splits"
  on public.group_entry_splits for update
  using (
    exists (
      select 1
      from public.group_entries ge
      where ge.id = entry_id
        and public.is_group_member(ge.group_id)
    )
  );

create policy "members can delete splits"
  on public.group_entry_splits for delete
  using (
    exists (
      select 1
      from public.group_entries ge
      where ge.id = entry_id
        and public.is_group_member(ge.group_id)
    )
  );

-- ---- IMPORTANT: First-member bootstrap -------------------------
-- When a user creates a group, we need to add them as a member.
-- Do this client-side right after insert (see groupsRepo.create).
-- Alternatively, use a trigger:

create or replace function public.add_creator_as_member()
returns trigger
language plpgsql
security definer
as $$
declare
  v_name text;
begin
  -- Try to get the user's display name from profiles table (may not exist)
  begin
    select coalesce(full_name, '') into v_name
    from public.profiles
    where id = NEW.created_by;
  exception when undefined_table then
    v_name := null;
  end;

  if v_name is null or v_name = '' then
    v_name := split_part((select email from auth.users where id = NEW.created_by), '@', 1);
  end if;

  insert into public.group_members (group_id, user_id, name)
  values (NEW.id, NEW.created_by, v_name)
  on conflict (group_id, user_id) do nothing;

  return NEW;
end;
$$;

drop trigger if exists trg_add_creator_as_member on public.groups;
create trigger trg_add_creator_as_member
  after insert on public.groups
  for each row execute function public.add_creator_as_member();

-- ============================================================
-- Phase 2: link group entries to bank transactions
-- Run separately if tables already exist.
-- ============================================================
alter table public.group_entries
  add column if not exists transaction_id int references public.transactions(id) on delete set null;

create index if not exists idx_group_entries_transaction_id
  on public.group_entries(transaction_id)
  where transaction_id is not null;

-- ============================================================
-- Phase 3: link group entries to shared expenses (payer=other)
-- Run separately if tables already exist.
-- ============================================================
alter table public.group_entries
  add column if not exists shared_expense_id int references public.shared_expenses(id) on delete set null;

create index if not exists idx_group_entries_shared_expense_id
  on public.group_entries(shared_expense_id)
  where shared_expense_id is not null;

-- ============================================================
-- Phase 4: personal_user_id on transactions
-- ============================================================
alter table public.transactions
  add column if not exists personal_user_id uuid references auth.users(id) on delete set null;
