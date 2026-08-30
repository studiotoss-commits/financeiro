-- Executar somente após backup e validação. Migração atômica, sem alterar IDs.
begin;

-- Acesso ao cadastro central não concede acesso ao conteúdo financeiro.
create table public.base_app_members (
  workspace_id uuid not null,
  user_id uuid not null,
  app_id text not null check(app_id in ('financeiro','not','manutencao-sites')),
  primary key(workspace_id,user_id,app_id),
  foreign key(workspace_id,user_id) references public.finance_workspace_members(workspace_id,user_id) on delete cascade
);
insert into public.base_app_members select workspace_id,user_id,'financeiro' from public.finance_workspace_members;
alter table public.base_app_members enable row level security;
create policy "users read own app access" on public.base_app_members for select to authenticated using(user_id=(select auth.uid()));
grant select on public.base_app_members to authenticated;

create function public.is_base_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.finance_workspace_members where workspace_id=target_workspace and user_id=(select auth.uid()));
$$;
revoke all on function public.is_base_workspace_member(uuid) from public;
grant execute on function public.is_base_workspace_member(uuid) to authenticated;
drop policy "members read workspaces" on public.finance_workspaces;
create policy "members read workspaces" on public.finance_workspaces for select to authenticated using(public.is_base_workspace_member(id));
drop policy "members read memberships" on public.finance_workspace_members;
create policy "members read memberships" on public.finance_workspace_members for select to authenticated using(public.is_base_workspace_member(workspace_id));
create or replace function public.is_finance_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_base_workspace_member(target_workspace) and exists(
    select 1 from public.base_app_members where workspace_id=target_workspace and user_id=(select auth.uid()) and app_id='financeiro');
$$;
create or replace function public.bootstrap_finance_workspace(workspace_name text default 'BASE')
returns uuid language plpgsql security definer set search_path=public as $$
declare current_user_id uuid:=auth.uid(); result_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text,0));
  select workspace_id into result_id from public.finance_workspace_members
    where user_id=current_user_id and public.is_finance_workspace_member(workspace_id) order by created_at limit 1;
  if result_id is not null then return result_id; end if;
  if exists(select 1 from public.finance_workspace_members where user_id=current_user_id) then raise exception 'Finance access denied'; end if;
  insert into public.finance_workspaces(name,created_by) values(coalesce(nullif(trim(workspace_name),''),'BASE'),current_user_id) returning id into result_id;
  insert into public.finance_workspace_members(workspace_id,user_id,role) values(result_id,current_user_id,'owner');
  insert into public.base_app_members values(result_id,current_user_id,'financeiro');
  return result_id;
end;
$$;

create function public.base_client_fields(p_payload jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from jsonb_each(p_payload)
  where key = any(array['name','tradeName','cnpj','stateRegistration','cityRegistration',
    'segment','address','origin','since','resp','fin','technical','email','emails',
    'phone','phones','whatsapp','whatsapps','documents','notes']);
$$;

create table public.base_clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.finance_workspaces(id),
  name text not null check (length(trim(name)) > 0),
  status text not null default 'Ativo',
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  revision bigint not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, id)
);

insert into public.base_clients(id, workspace_id, name, status, payload, created_at, updated_at)
select id, workspace_id, name, status,
  public.base_client_fields(payload) || jsonb_build_object('name', name), created_at, updated_at
from public.finance_clients;

-- Os vínculos financeiros passam a apontar para o cadastro central.
alter table public.finance_transactions drop constraint finance_transactions_client_id_fkey;
alter table public.finance_transactions add constraint finance_transactions_base_client_fkey
  foreign key (workspace_id, client_id) references public.base_clients(workspace_id, id) on delete restrict;

alter table public.finance_clients rename to finance_client_profiles;
drop index public.finance_clients_workspace_name_idx;
update public.finance_client_profiles
  set payload = payload - coalesce((select array_agg(key) from jsonb_object_keys(public.base_client_fields(payload)) key),array[]::text[])
    - 'id' - 'status';
alter table public.finance_client_profiles drop column name, drop column status;
alter table public.finance_client_profiles add constraint finance_profiles_base_client_fkey
  foreign key (workspace_id, id) references public.base_clients(workspace_id, id) on delete restrict;

create index base_clients_workspace_name_idx on public.base_clients(workspace_id, name);
create index base_clients_document_idx on public.base_clients(workspace_id, (regexp_replace(payload->>'cnpj', '[^0-9]', '', 'g')));

alter table public.base_clients enable row level security;
create policy "workspace members read central clients" on public.base_clients for select to authenticated
  using (public.is_base_workspace_member(workspace_id));
grant select on public.base_clients to authenticated;
-- Alterações passam pelas RPCs com revisão, validação e sem DELETE.
revoke insert, update, delete on public.finance_client_profiles from authenticated;
drop policy "members manage clients" on public.finance_client_profiles;
create policy "workspace members read finance profiles" on public.finance_client_profiles for select to authenticated
  using (public.is_finance_workspace_member(workspace_id));

-- Compatibilidade de leitura. A gravação antiga é bloqueada abaixo.
create view public.finance_clients with (security_invoker = true) as
select c.id, c.workspace_id, c.name, c.status,
  coalesce(p.payload, '{}'::jsonb) || c.payload || jsonb_build_object(
    'id', c.id, 'name', c.name, 'status', c.status, 'archivedAt', c.archived_at) as payload,
  c.created_at, c.updated_at
from public.base_clients c left join public.finance_client_profiles p on p.id=c.id and p.workspace_id=c.workspace_id;
grant select on public.finance_clients to authenticated;

create function public.save_base_client(p_workspace_id uuid, p_client_id uuid, p_payload jsonb,
  p_status text, p_archived boolean, p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  previous public.base_clients;
  clean jsonb;
  document_number text;
  new_revision bigint;
begin
  if not public.is_base_workspace_member(p_workspace_id) then raise exception 'Workspace access denied'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid client data'; end if;
  if p_status is null or p_status not in ('Ativo','Recorrente','Prospect','Inativo') then raise exception 'Invalid client status'; end if;
  if p_archived is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid client revision'; end if;
  -- Todos os gravadores compartilham o lock do workspace, inclusive apps futuros.
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  select * into previous from public.base_clients where id=p_client_id for update;
  if found then
    if previous.workspace_id <> p_workspace_id then raise exception 'Workspace access denied'; end if;
    if previous.revision <> p_expected_revision then raise exception 'Client changed in another session. Reload before saving.'; end if;
  elsif p_expected_revision <> 0 then
    raise exception 'Client changed in another session. Reload before saving.';
  end if;
  clean := public.base_client_fields(p_payload);
  if coalesce(length(trim(clean->>'name')),0)=0 then raise exception 'Client name required'; end if;
  clean := clean || jsonb_build_object('name', trim(clean->>'name'));
  document_number := regexp_replace(coalesce(clean->>'cnpj',''), '[^0-9]', '', 'g');
  -- Duplicidades históricas não são apagadas nem fundidas. Impedir novas duplicidades.
  if document_number <> '' and (previous.id is null or document_number is distinct from regexp_replace(coalesce(previous.payload->>'cnpj',''), '[^0-9]', '', 'g'))
    and exists(select 1 from public.base_clients where workspace_id=p_workspace_id and id<>p_client_id
      and regexp_replace(coalesce(payload->>'cnpj',''), '[^0-9]', '', 'g')=document_number) then
    raise exception 'Client document already registered in this workspace';
  end if;
  insert into public.base_clients(id,workspace_id,name,status,payload,archived_at)
  values(p_client_id,p_workspace_id,clean->>'name',p_status,clean,case when p_archived then now() end)
  on conflict(id) do update set name=excluded.name, status=excluded.status, payload=excluded.payload,
    archived_at=case when p_archived then coalesce(base_clients.archived_at,now()) end,
    revision=base_clients.revision+1, updated_at=now()
  returning revision into new_revision;
  return new_revision;
end;
$$;
revoke all on function public.save_base_client(uuid,uuid,jsonb,text,boolean,bigint) from public;
grant execute on function public.save_base_client(uuid,uuid,jsonb,text,boolean,bigint) to authenticated;
revoke all on function public.base_client_fields(jsonb) from public;

-- Um estado financeiro antigo nunca pode sobrescrever a central.
-- Apenas clientes explicitamente alterados são gravados; ausentes são preservados.
create or replace function public.save_finance_state(p_workspace_id uuid, p_state jsonb, p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  current_revision bigint;
  change jsonb;
  client_id uuid;
begin
  if not public.is_finance_workspace_member(p_workspace_id) then raise exception 'Workspace access denied'; end if;
  if p_state->>'version' is distinct from '2' then raise exception 'BASE updated. Reload before saving.'; end if;
  if jsonb_typeof(p_state->'entries') is distinct from 'array' or jsonb_typeof(p_state->'suppliers') is distinct from 'array'
    or jsonb_typeof(p_state->'clientChanges') is distinct from 'array' or jsonb_typeof(p_state->'settings') is distinct from 'object' then
    raise exception 'Invalid finance state';
  end if;
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  select revision into current_revision from public.finance_settings where workspace_id=p_workspace_id for update;
  current_revision := coalesce(current_revision,0);
  if p_expected_revision is distinct from current_revision then
    raise exception 'Finance state changed in another session. Reload before saving.';
  end if;
  -- Validar colisões globais e referências antes de gravar (RPC SECURITY DEFINER).
  if exists(select 1 from jsonb_array_elements(p_state->'suppliers') s join public.finance_suppliers t on t.id=(s->>'id')::uuid where t.workspace_id<>p_workspace_id)
    or exists(select 1 from jsonb_array_elements(p_state->'entries') e join public.finance_transactions t on t.id=(e->>'id')::uuid where t.workspace_id<>p_workspace_id) then
    raise exception 'Workspace access denied';
  end if;
  for change in select value from jsonb_array_elements(p_state->'clientChanges') loop
    client_id := (change->>'id')::uuid;
    perform public.save_base_client(p_workspace_id,client_id,change->'data',change->>'status',
      (change->>'archived')::boolean,(change->>'expectedRevision')::bigint);
    if jsonb_typeof(change->'finance') is distinct from 'object' then raise exception 'Invalid finance client profile'; end if;
    insert into public.finance_client_profiles(id,workspace_id,payload)
    values(client_id,p_workspace_id,change->'finance')
    on conflict(id) do update set payload=excluded.payload,updated_at=now();
  end loop;
  if exists(select 1 from jsonb_array_elements(p_state->'entries') e
    where nullif(e->>'clientId','') is not null and not exists(select 1 from public.base_clients c where c.id=(e->>'clientId')::uuid and c.workspace_id=p_workspace_id)) then
    raise exception 'Client does not belong to workspace';
  end if;
  if exists(select 1 from jsonb_array_elements(p_state->'entries') e
    join public.base_clients c on c.id=nullif(e->>'clientId','')::uuid
    where c.archived_at is not null and not exists(select 1 from public.finance_transactions t
      where t.workspace_id=p_workspace_id and t.id=(e->>'id')::uuid and t.client_id=c.id)) then
    raise exception 'Archived client cannot receive new entries';
  end if;
  if exists(select 1 from jsonb_array_elements(p_state->'entries') e
    where nullif(e->>'supplierId','') is not null and not exists(select 1 from jsonb_array_elements(p_state->'suppliers') s where s->>'id'=e->>'supplierId')) then
    raise exception 'Supplier does not belong to workspace';
  end if;
  if exists(select 1 from jsonb_array_elements(p_state->'entries') e
    where nullif(e->>'sourceEntryId','') is not null and not exists(select 1 from jsonb_array_elements(p_state->'entries') s where s->>'id'=e->>'sourceEntryId')) then
    raise exception 'Source entry does not belong to workspace';
  end if;

  -- Lançamentos e fornecedores preservam o comportamento anterior nesta etapa.
  delete from public.finance_transactions where workspace_id=p_workspace_id;
  delete from public.finance_suppliers where workspace_id=p_workspace_id;
  insert into public.finance_suppliers(id,workspace_id,name,status,payload)
  select (item->>'id')::uuid,p_workspace_id,item->>'name',coalesce(item->>'status','Ativo'),item
  from jsonb_array_elements(p_state->'suppliers') item;
  insert into public.finance_transactions(id,workspace_id,kind,description,amount,due_date,status,client_id,supplier_id,payload)
  select (item->>'id')::uuid,p_workspace_id,item->>'type',item->>'desc',coalesce((item->>'amount')::numeric,0),
    coalesce(nullif(item->>'dueDate',''),item->>'date')::date,coalesce(item->>'status','Pendente'),
    nullif(item->>'clientId','')::uuid,nullif(item->>'supplierId','')::uuid,item
  from jsonb_array_elements(p_state->'entries') item where coalesce(item->>'isTaxForecast','false')<>'true';
  insert into public.finance_transactions(id,workspace_id,kind,description,amount,due_date,status,client_id,supplier_id,source_entry_id,payload)
  select (item->>'id')::uuid,p_workspace_id,item->>'type',item->>'desc',coalesce((item->>'amount')::numeric,0),
    coalesce(nullif(item->>'dueDate',''),item->>'date')::date,coalesce(item->>'status','Pendente'),
    nullif(item->>'clientId','')::uuid,nullif(item->>'supplierId','')::uuid,nullif(item->>'sourceEntryId','')::uuid,item
  from jsonb_array_elements(p_state->'entries') item where coalesce(item->>'isTaxForecast','false')='true';
  insert into public.finance_settings(workspace_id,payload,revision,updated_at)
  values(p_workspace_id,p_state->'settings',current_revision+1,now())
  on conflict(workspace_id) do update set payload=excluded.payload,revision=excluded.revision,updated_at=now();
  return current_revision+1;
end;
$$;

-- Mantém o histórico de migrações sem afirmar que o SQL inicial foi aplicado via CLI.
create function public.load_finance_snapshot(p_workspace_id uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'clients', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.base_clients c where workspace_id=p_workspace_id),
    'profiles', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from public.finance_client_profiles p where workspace_id=p_workspace_id),
    'entries', (select coalesce(jsonb_agg(payload order by created_at desc), '[]') from public.finance_transactions where workspace_id=p_workspace_id),
    'suppliers', (select coalesce(jsonb_agg(payload order by created_at desc), '[]') from public.finance_suppliers where workspace_id=p_workspace_id),
    'settings', (select to_jsonb(s) from public.finance_settings s where workspace_id=p_workspace_id)
  ) where public.is_finance_workspace_member(p_workspace_id);
$$;
revoke all on function public.load_finance_snapshot(uuid) from public;
grant execute on function public.load_finance_snapshot(uuid) to authenticated;

create table if not exists public.base_schema_migrations(version text primary key, applied_at timestamptz not null default now());
alter table public.base_schema_migrations enable row level security;
insert into public.base_schema_migrations(version) values('202608300001_central_clientes');
commit;
