-- Importações podem preservar dados ausentes, sem inventar datas/recorrências.
-- Somente serviços pausados aceitam esses campos vazios; RLS/RPCs permanecem.
begin;
alter table public.not_services alter column due_date drop not null;
alter table public.not_services alter column recurrence_months drop not null;
alter table public.not_services add constraint not_services_schedule_required
  check (status='paused' or (due_date is not null and recurrence_months is not null));
insert into public.base_schema_migrations(version) values('202608300003_not_incomplete_services');
commit;
