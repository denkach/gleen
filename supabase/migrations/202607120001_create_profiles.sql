create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  interface_locale text not null default 'en'
    check (interface_locale in ('uk', 'ru', 'en', 'es', 'de')),
  output_locale text not null default 'en'
    check (output_locale in ('uk', 'ru', 'en', 'es', 'de')),
  summary_preset text not null default 'balanced'
    check (summary_preset in ('balanced', 'detailed')),
  flashcard_preset integer not null default 18
    check (flashcard_preset in (18, 30)),
  onboarding_step integer not null default 1
    check (onboarding_step in (1, 2, 3)),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
