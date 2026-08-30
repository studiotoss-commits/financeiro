-- Somente leitura. Exportar a coluna backup como JSON e guardar fora do Git.
-- Backup lógico dos dados e definições afetados; não inclui credenciais de Auth.
select jsonb_build_object(
  'captured_at', now(),
  'tables', jsonb_build_object(
    'finance_workspaces', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.finance_workspaces t),
    'finance_workspace_members', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.finance_workspace_members t),
    'not_services', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.not_services t),
    'not_service_events', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.not_service_events t),
    'base_clients', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.base_clients t),
    'finance_client_profiles', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.finance_client_profiles t),
    'base_app_members', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.base_app_members t),
    'base_schema_migrations', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.base_schema_migrations t),
    'finance_clients', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.finance_clients t),
    'finance_suppliers', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.finance_suppliers t),
    'finance_transactions', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.finance_transactions t),
    'finance_settings', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.finance_settings t)
  ),
  'functions', (select jsonb_agg(jsonb_build_object('name', p.proname, 'definition', pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('bootstrap_finance_workspace','is_finance_workspace_member','save_finance_state','save_base_client','base_client_fields','is_base_workspace_member','load_finance_snapshot','is_not_workspace_member','activate_not_workspace','save_not_service','renew_not_service')),
  'policies', (select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname='public' and (tablename like 'finance_%' or tablename like 'base_%' or tablename like 'not_%')),
  'columns', (select jsonb_agg(to_jsonb(c)) from information_schema.columns c where table_schema='public' and (table_name like 'finance_%' or table_name like 'base_%' or table_name like 'not_%')),
  'constraints', (select jsonb_agg(jsonb_build_object('table', conrelid::regclass::text, 'name', conname, 'definition', pg_get_constraintdef(oid))) from pg_constraint where connamespace='public'::regnamespace),
  'indexes', (select jsonb_agg(to_jsonb(i)) from pg_indexes i where schemaname='public')
)::text as backup;
