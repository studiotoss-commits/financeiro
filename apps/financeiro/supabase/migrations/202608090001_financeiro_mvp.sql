-- BASE Financeiro MVP: workspace compartilhável, RLS e persistência.
create extension if not exists pgcrypto;

create table public.finance_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.finance_workspace_members (
  workspace_id uuid not null references public.finance_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create or replace function public.is_finance_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.finance_workspace_members
    where workspace_id = target_workspace and user_id = (select auth.uid())
  );
$$;

create or replace function public.bootstrap_finance_workspace(workspace_name text default 'BASE')
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  result_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select workspace_id into result_id from public.finance_workspace_members
  where user_id = current_user_id order by created_at limit 1;
  if result_id is null then
    insert into public.finance_workspaces (name, created_by)
    values (coalesce(nullif(trim(workspace_name), ''), 'BASE'), current_user_id)
    returning id into result_id;
    insert into public.finance_workspace_members (workspace_id, user_id, role)
    values (result_id, current_user_id, 'owner');
  end if;
  return result_id;
end;
$$;

create table public.finance_clients (
  id uuid primary key,
  workspace_id uuid not null references public.finance_workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'Ativo',
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_suppliers (
  id uuid primary key,
  workspace_id uuid not null references public.finance_workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'Ativo',
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_transactions (
  id uuid primary key,
  workspace_id uuid not null references public.finance_workspaces(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  due_date date not null,
  status text not null,
  client_id uuid references public.finance_clients(id) on delete set null,
  supplier_id uuid references public.finance_suppliers(id) on delete set null,
  source_entry_id uuid references public.finance_transactions(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_settings (
  workspace_id uuid primary key references public.finance_workspaces(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index finance_transactions_workspace_due_idx on public.finance_transactions(workspace_id, due_date desc);
create index finance_clients_workspace_name_idx on public.finance_clients(workspace_id, name);
create index finance_suppliers_workspace_name_idx on public.finance_suppliers(workspace_id, name);

alter table public.finance_workspaces enable row level security;
alter table public.finance_workspace_members enable row level security;
alter table public.finance_clients enable row level security;
alter table public.finance_suppliers enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_settings enable row level security;

create policy "members read workspaces" on public.finance_workspaces for select to authenticated using (public.is_finance_workspace_member(id));
create policy "members read memberships" on public.finance_workspace_members for select to authenticated using (public.is_finance_workspace_member(workspace_id));
create policy "members manage clients" on public.finance_clients for all to authenticated using (public.is_finance_workspace_member(workspace_id)) with check (public.is_finance_workspace_member(workspace_id));
create policy "members manage suppliers" on public.finance_suppliers for all to authenticated using (public.is_finance_workspace_member(workspace_id)) with check (public.is_finance_workspace_member(workspace_id));
create policy "members manage transactions" on public.finance_transactions for all to authenticated using (public.is_finance_workspace_member(workspace_id)) with check (public.is_finance_workspace_member(workspace_id));
create policy "members manage settings" on public.finance_settings for all to authenticated using (public.is_finance_workspace_member(workspace_id)) with check (public.is_finance_workspace_member(workspace_id));

create or replace function public.save_finance_state(p_workspace_id uuid, p_state jsonb, p_expected_revision bigint)
returns bigint language plpgsql set search_path = public
as $$
declare
  current_revision bigint;
begin
  if not public.is_finance_workspace_member(p_workspace_id) then raise exception 'Workspace access denied'; end if;

  perform 1 from public.finance_workspaces where id = p_workspace_id for update;
  select revision into current_revision from public.finance_settings
  where workspace_id = p_workspace_id for update;
  current_revision := coalesce(current_revision, 0);
  if current_revision <> p_expected_revision then
    raise exception 'Finance state changed in another session. Reload before saving.';
  end if;

  delete from public.finance_transactions where workspace_id = p_workspace_id;
  delete from public.finance_clients where workspace_id = p_workspace_id;
  delete from public.finance_suppliers where workspace_id = p_workspace_id;

  insert into public.finance_clients (id, workspace_id, name, status, payload)
  select (item->>'id')::uuid, p_workspace_id, item->>'name', coalesce(item->>'status', 'Ativo'), item
  from jsonb_array_elements(coalesce(p_state->'clients', '[]'::jsonb)) item;

  insert into public.finance_suppliers (id, workspace_id, name, status, payload)
  select (item->>'id')::uuid, p_workspace_id, item->>'name', coalesce(item->>'status', 'Ativo'), item
  from jsonb_array_elements(coalesce(p_state->'suppliers', '[]'::jsonb)) item;

  insert into public.finance_transactions (id, workspace_id, kind, description, amount, due_date, status, client_id, supplier_id, payload)
  select (item->>'id')::uuid, p_workspace_id, item->>'type', item->>'desc',
    coalesce((item->>'amount')::numeric, 0), coalesce(nullif(item->>'dueDate', ''), item->>'date')::date,
    coalesce(item->>'status', 'Pendente'), nullif(item->>'clientId', '')::uuid,
    nullif(item->>'supplierId', '')::uuid, item
  from jsonb_array_elements(coalesce(p_state->'entries', '[]'::jsonb)) item
  where coalesce(item->>'isTaxForecast', 'false') <> 'true';

  insert into public.finance_transactions (id, workspace_id, kind, description, amount, due_date, status, client_id, supplier_id, source_entry_id, payload)
  select (item->>'id')::uuid, p_workspace_id, item->>'type', item->>'desc',
    coalesce((item->>'amount')::numeric, 0), coalesce(nullif(item->>'dueDate', ''), item->>'date')::date,
    coalesce(item->>'status', 'Pendente'), nullif(item->>'clientId', '')::uuid,
    nullif(item->>'supplierId', '')::uuid, nullif(item->>'sourceEntryId', '')::uuid, item
  from jsonb_array_elements(coalesce(p_state->'entries', '[]'::jsonb)) item
  where coalesce(item->>'isTaxForecast', 'false') = 'true';

  insert into public.finance_settings (workspace_id, payload, revision, updated_at)
  values (p_workspace_id, coalesce(p_state->'settings', '{}'::jsonb), current_revision + 1, now())
  on conflict (workspace_id) do update set payload = excluded.payload, revision = excluded.revision, updated_at = now();
  return current_revision + 1;
end;
$$;

revoke all on function public.bootstrap_finance_workspace(text) from public;
revoke all on function public.save_finance_state(uuid, jsonb, bigint) from public;
grant execute on function public.bootstrap_finance_workspace(text) to authenticated;
grant execute on function public.save_finance_state(uuid, jsonb, bigint) to authenticated;
grant execute on function public.is_finance_workspace_member(uuid) to authenticated;
grant select on public.finance_workspaces, public.finance_workspace_members to authenticated;
grant select, insert, update, delete on public.finance_clients, public.finance_suppliers, public.finance_transactions, public.finance_settings to authenticated;
