alter table public.profiles
  drop constraint if exists profiles_summary_preset_check;
alter table public.profiles
  add constraint profiles_summary_preset_check
  check (summary_preset in ('compact', 'balanced', 'deep', 'detailed'));

alter table public.analysis_intakes
  drop constraint if exists analysis_intakes_summary_preset_check;
alter table public.analysis_intakes
  add constraint analysis_intakes_summary_preset_check
  check (summary_preset in ('compact', 'balanced', 'deep', 'detailed'));

update public.profiles set summary_preset = 'deep' where summary_preset = 'detailed';
update public.analysis_intakes set summary_preset = 'deep' where summary_preset = 'detailed';
