-- Savings goals: target amount becomes optional (forecast-only goals), but a goal needs an amount or a date
alter table public.savings_goals
  drop constraint if exists savings_goals_target_cents_check;

alter table public.savings_goals
  alter column target_cents drop not null;

alter table public.savings_goals
  add constraint savings_goals_target_cents_check check (target_cents is null or target_cents > 0),
  add constraint savings_goals_target_or_date check (target_cents is not null or target_date is not null);

notify pgrst, 'reload schema';
