-- Arquivamento reversível por app; exclusão global exclusiva do proprietário no Financeiro.
begin;
create table public.base_client_app_state (
  workspace_id uuid not null, client_id uuid not null, app_id text not null,
  archived_at timestamptz, revision bigint not null default 1,
  primary key(workspace_id,client_id,app_id),
  foreign key(workspace_id,client_id) references public.base_clients(workspace_id,id) on delete restrict,
  check(app_id in ('financeiro','not'))
);
create table public.base_client_actions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.finance_workspaces(id),
  client_id uuid not null, actor_id uuid not null, app_id text not null,
  action text not null check(action in ('archive','restore','delete')),
  counts jsonb not null default '{}', created_at timestamptz not null default now()
);
create index base_client_actions_client_idx on public.base_client_actions(workspace_id,client_id);
create function public.is_client_central_manager(target uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_finance_workspace_member(target) and exists(select 1 from public.finance_workspace_members
    where workspace_id=target and user_id=auth.uid() and role='owner');
$$;
create function public.is_client_archived_in_app(target uuid, client uuid, app text) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_base_workspace_member(target) and (
    exists(select 1 from public.base_clients where workspace_id=target and id=client and archived_at is not null)
    or exists(select 1 from public.base_client_app_state where workspace_id=target and client_id=client and app_id=app and archived_at is not null));
$$;
revoke all on function public.is_client_central_manager(uuid),public.is_client_archived_in_app(uuid,uuid,text) from public;
grant execute on function public.is_client_central_manager(uuid),public.is_client_archived_in_app(uuid,uuid,text) to authenticated;
alter table public.base_client_app_state enable row level security;
alter table public.base_client_actions enable row level security;
revoke all on public.base_client_app_state,public.base_client_actions from public,anon,authenticated;
grant select on public.base_client_app_state,public.base_client_actions to authenticated;
create policy "members read app archive state" on public.base_client_app_state for select to authenticated using(
  public.is_base_workspace_member(workspace_id) and (public.is_client_central_manager(workspace_id)
    or exists(select 1 from public.base_app_members m where m.workspace_id=base_client_app_state.workspace_id and m.user_id=auth.uid() and m.app_id=base_client_app_state.app_id)));
create policy "members read app client actions" on public.base_client_actions for select to authenticated using(
  public.is_client_central_manager(workspace_id) or (public.is_base_workspace_member(workspace_id) and exists(
    select 1 from public.base_app_members m where m.workspace_id=base_client_actions.workspace_id and m.user_id=auth.uid() and m.app_id=base_client_actions.app_id)));

create function public.set_client_app_archived(p_workspace_id uuid,p_client_id uuid,p_app_id text,p_archived boolean,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare previous public.base_client_app_state; result public.base_client_app_state; affected bigint;
begin
  if p_app_id not in ('financeiro','not') or p_app_id is null or not public.is_base_workspace_member(p_workspace_id)
    or not exists(select 1 from public.base_app_members where workspace_id=p_workspace_id and user_id=auth.uid() and app_id=p_app_id)
    then raise exception 'App access denied'; end if;
  if p_archived is null or p_expected_revision is null or p_expected_revision<0 then raise exception 'Invalid archive request'; end if;
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  if not exists(select 1 from public.base_clients where id=p_client_id and workspace_id=p_workspace_id) then raise exception 'Client not found'; end if;
  select * into previous from public.base_client_app_state where workspace_id=p_workspace_id and client_id=p_client_id and app_id=p_app_id;
  if coalesce(previous.revision,0)<>p_expected_revision then raise exception 'Client app state changed. Reload before saving.'; end if;
  if previous.client_id is not null and (previous.archived_at is not null)=p_archived then return to_jsonb(previous); end if;
  insert into public.base_client_app_state(workspace_id,client_id,app_id,archived_at)
  values(p_workspace_id,p_client_id,p_app_id,case when p_archived then now() end)
  on conflict(workspace_id,client_id,app_id) do update set archived_at=excluded.archived_at,revision=base_client_app_state.revision+1 returning * into result;
  if p_app_id='financeiro' then
    select count(*) into affected from public.finance_transactions where workspace_id=p_workspace_id and client_id=p_client_id;
    update public.finance_settings set revision=revision+1,updated_at=now() where workspace_id=p_workspace_id;
  else
    update public.not_services set revision=revision+1,updated_at=now() where workspace_id=p_workspace_id and client_id=p_client_id;
    get diagnostics affected = row_count;
  end if;
  insert into public.base_client_actions(workspace_id,client_id,actor_id,app_id,action,counts)
  values(p_workspace_id,p_client_id,auth.uid(),p_app_id,case when p_archived then 'archive' else 'restore' end,jsonb_build_object('records',affected));
  return to_jsonb(result);
end;
$$;
revoke all on function public.set_client_app_archived(uuid,uuid,text,boolean,bigint) from public;
grant execute on function public.set_client_app_archived(uuid,uuid,text,boolean,bigint) to authenticated;

-- IDs excluídos não podem ser recriados por formulários/sessões antigos.
alter function public.save_base_client(uuid,uuid,jsonb,text,boolean,bigint) rename to _save_base_client_before_lifecycle;
revoke all on function public._save_base_client_before_lifecycle(uuid,uuid,jsonb,text,boolean,bigint) from public,anon,authenticated;
create function public.save_base_client(p_workspace_id uuid,p_client_id uuid,p_payload jsonb,p_status text,p_archived boolean,p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path=public as $$
begin
  if not public.is_base_workspace_member(p_workspace_id) then raise exception 'Workspace access denied'; end if;
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  if exists(select 1 from public.base_client_actions where client_id=p_client_id and action='delete') then raise exception 'Client was permanently deleted. Reload.'; end if;
  if p_archived is distinct from coalesce((select archived_at is not null from public.base_clients where id=p_client_id and workspace_id=p_workspace_id),false)
    then raise exception 'Use app archive action. Reload BASE.'; end if;
  return public._save_base_client_before_lifecycle(p_workspace_id,p_client_id,p_payload,p_status,p_archived,p_expected_revision);
end;
$$;
revoke all on function public.save_base_client(uuid,uuid,jsonb,text,boolean,bigint) from public;
grant execute on function public.save_base_client(uuid,uuid,jsonb,text,boolean,bigint) to authenticated;

alter function public.save_not_service(uuid,uuid,jsonb,bigint) rename to _save_not_service_before_lifecycle;
revoke all on function public._save_not_service_before_lifecycle(uuid,uuid,jsonb,bigint) from public,anon,authenticated;
create function public.save_not_service(p_workspace_id uuid,p_id uuid,p_data jsonb,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_not_workspace_member(p_workspace_id) then raise exception 'NOT access denied'; end if;
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  if public.is_client_archived_in_app(p_workspace_id,(p_data->>'client_id')::uuid,'not') or exists(
    select 1 from public.not_services where id=p_id and workspace_id=p_workspace_id and public.is_client_archived_in_app(p_workspace_id,client_id,'not'))
    then raise exception 'Client archived in NOT. Restore before editing.'; end if;
  return public._save_not_service_before_lifecycle(p_workspace_id,p_id,p_data,p_expected_revision);
end;
$$;
revoke all on function public.save_not_service(uuid,uuid,jsonb,bigint) from public;
grant execute on function public.save_not_service(uuid,uuid,jsonb,bigint) to authenticated;
alter function public.renew_not_service(uuid,uuid,bigint,date,date,bigint) rename to _renew_not_service_before_lifecycle;
revoke all on function public._renew_not_service_before_lifecycle(uuid,uuid,bigint,date,date,bigint) from public,anon,authenticated;
create function public.renew_not_service(p_workspace_id uuid,p_id uuid,p_expected_revision bigint,p_paid_on date,p_next_due date,p_amount_cents bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_not_workspace_member(p_workspace_id) then raise exception 'NOT access denied'; end if;
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  if exists(select 1 from public.not_services where id=p_id and workspace_id=p_workspace_id and public.is_client_archived_in_app(p_workspace_id,client_id,'not'))
    then raise exception 'Client archived in NOT. Restore before renewal.'; end if;
  return public._renew_not_service_before_lifecycle(p_workspace_id,p_id,p_expected_revision,p_paid_on,p_next_due,p_amount_cents);
end;
$$;
revoke all on function public.renew_not_service(uuid,uuid,bigint,date,date,bigint) from public;
grant execute on function public.renew_not_service(uuid,uuid,bigint,date,date,bigint) to authenticated;

-- O financeiro continua carregando todos os registros para não apagar os arquivados no autosave.
-- Dados de clientes arquivados são preservados pelo banco mesmo se omitidos pelo navegador.
alter function public.save_finance_state(uuid,jsonb,bigint) rename to _save_finance_state_before_lifecycle;
revoke all on function public._save_finance_state_before_lifecycle(uuid,jsonb,bigint) from public,anon,authenticated;
create function public.save_finance_state(p_workspace_id uuid,p_state jsonb,p_expected_revision bigint)
returns bigint language plpgsql security definer set search_path=public as $$
declare protected_entries jsonb; protected_records jsonb; live_entries jsonb; result_revision bigint;
begin
  if not public.is_finance_workspace_member(p_workspace_id) then raise exception 'Workspace access denied'; end if;
  if p_state->>'version' is distinct from '3' then raise exception 'BASE updated. Reload before saving.'; end if;
  if jsonb_typeof(p_state->'entries') is distinct from 'array' then raise exception 'Invalid finance state'; end if;
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  p_state:=jsonb_set(p_state,'{clientChanges}',coalesce((select jsonb_agg(case when public.is_client_archived_in_app(p_workspace_id,(c->>'id')::uuid,'financeiro')
    then c||jsonb_build_object('finance',coalesce((select payload from public.finance_client_profiles where id=(c->>'id')::uuid and workspace_id=p_workspace_id),'{}')) else c end)
    from jsonb_array_elements(p_state->'clientChanges') c),'[]'));
  if exists(select 1 from jsonb_array_elements(p_state->'entries') e where public.is_client_archived_in_app(p_workspace_id,nullif(e->>'clientId','')::uuid,'financeiro')
    and not exists(select 1 from public.finance_transactions where id=(e->>'id')::uuid and workspace_id=p_workspace_id)) then raise exception 'Archived client cannot receive new entries'; end if;
  with recursive protected as (
    select t.* from public.finance_transactions t where workspace_id=p_workspace_id and public.is_client_archived_in_app(p_workspace_id,client_id,'financeiro')
    union select t.* from public.finance_transactions t join protected p on t.source_entry_id=p.id where t.workspace_id=p_workspace_id
  ) select coalesce(jsonb_agg(payload),'[]'),coalesce(jsonb_agg(to_jsonb(p)),'[]') into protected_entries,protected_records from protected p;
  if exists(select 1 from jsonb_array_elements(p_state->'entries') e where exists(select 1 from jsonb_array_elements(protected_entries) p where p->>'id'=e->>'sourceEntryId') and not exists(select 1 from jsonb_array_elements(protected_entries) p where p->>'id'=e->>'id')) then raise exception 'Archived client cannot receive new derived entries'; end if;
  select coalesce(jsonb_agg(e),'[]') into live_entries from jsonb_array_elements(p_state->'entries') e
    where not exists(select 1 from jsonb_array_elements(protected_entries) a where a->>'id'=e->>'id');
  result_revision:=public._save_finance_state_before_lifecycle(p_workspace_id,p_state||jsonb_build_object('version',2,'entries',live_entries||protected_entries),p_expected_revision);
  update public.finance_transactions t set created_at=(p->>'created_at')::timestamptz,updated_at=(p->>'updated_at')::timestamptz from jsonb_array_elements(protected_records) p where t.id=(p->>'id')::uuid and t.workspace_id=p_workspace_id;
  return result_revision;
end;
$$;
revoke all on function public.save_finance_state(uuid,jsonb,bigint) from public;
grant execute on function public.save_finance_state(uuid,jsonb,bigint) to authenticated;

create function public.client_delete_preview(p_workspace_id uuid,p_client_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare c public.base_clients; transactions jsonb; services jsonb; events jsonb; profiles jsonb; archives jsonb; result jsonb;
begin
  if not public.is_client_central_manager(p_workspace_id) then raise exception 'Central owner access required'; end if;
  select * into c from public.base_clients where id=p_client_id and workspace_id=p_workspace_id;
  if c.id is null then raise exception 'Client not found'; end if;
  with recursive affected as (
    select t.* from public.finance_transactions t where workspace_id=p_workspace_id and client_id=p_client_id
    union select t.* from public.finance_transactions t join affected a on t.source_entry_id=a.id
  ) select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') into transactions from affected a;
  if exists(select 1 from jsonb_array_elements(transactions) t where t->>'workspace_id'<>p_workspace_id::text or (t->>'client_id' is not null and t->>'client_id'<>p_client_id::text)) then raise exception 'Cross-client dependency requires review'; end if;
  select coalesce(jsonb_agg(to_jsonb(s) order by id),'[]') into services from public.not_services s where workspace_id=p_workspace_id and client_id=p_client_id;
  select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') into events from public.not_service_events e where workspace_id=p_workspace_id and service_id in(select (s->>'id')::uuid from jsonb_array_elements(services) s);
  select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') into profiles from public.finance_client_profiles p where workspace_id=p_workspace_id and id=p_client_id;
  select coalesce(jsonb_agg(to_jsonb(a) order by app_id),'[]') into archives from public.base_client_app_state a where workspace_id=p_workspace_id and client_id=p_client_id;
  result:=jsonb_build_object('client_id',c.id,'name',c.name,'finance_entries',jsonb_array_length(transactions),'finance_profiles',jsonb_array_length(profiles),
    'not_services',jsonb_array_length(services),'not_events',jsonb_array_length(events),'app_archives',jsonb_array_length(archives),
    'token',md5(jsonb_build_array(to_jsonb(c),transactions,services,events,profiles,archives)::text));
  return result;
end;
$$;
revoke all on function public.client_delete_preview(uuid,uuid) from public;
grant execute on function public.client_delete_preview(uuid,uuid) to authenticated;
create function public.delete_client_from_central(p_workspace_id uuid,p_client_id uuid,p_token text,p_confirmation text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare preview jsonb;
begin
  if not public.is_client_central_manager(p_workspace_id) then raise exception 'Central owner access required'; end if;
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  preview:=public.client_delete_preview(p_workspace_id,p_client_id);
  if p_token is distinct from preview->>'token' then raise exception 'Deletion impact changed. Review again.'; end if;
  if p_confirmation is distinct from preview->>'name' then raise exception 'Confirm exact client name'; end if;
  delete from public.not_service_events where workspace_id=p_workspace_id and service_id in(select id from public.not_services where workspace_id=p_workspace_id and client_id=p_client_id);
  delete from public.not_services where workspace_id=p_workspace_id and client_id=p_client_id;
  delete from public.finance_transactions where workspace_id=p_workspace_id and client_id=p_client_id;
  delete from public.finance_client_profiles where workspace_id=p_workspace_id and id=p_client_id;
  delete from public.base_client_app_state where workspace_id=p_workspace_id and client_id=p_client_id;
  delete from public.base_clients where workspace_id=p_workspace_id and id=p_client_id;
  insert into public.base_client_actions(workspace_id,client_id,actor_id,app_id,action,counts)
  values(p_workspace_id,p_client_id,auth.uid(),'central','delete',preview-'name'-'token'-'client_id');
  update public.finance_settings set revision=revision+1,updated_at=now() where workspace_id=p_workspace_id;
  return preview-'token'-'name';
end;
$$;
revoke all on function public.delete_client_from_central(uuid,uuid,text,text) from public;
grant execute on function public.delete_client_from_central(uuid,uuid,text,text) to authenticated;


create or replace function public.load_finance_snapshot(p_workspace_id uuid)
returns jsonb language sql stable security invoker set search_path=public as $$
  select jsonb_build_object(
    'clients',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from public.base_clients c where workspace_id=p_workspace_id),
    'profiles',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.finance_client_profiles p where workspace_id=p_workspace_id),
    'entries',(select coalesce(jsonb_agg(payload order by created_at desc),'[]') from public.finance_transactions where workspace_id=p_workspace_id),
    'suppliers',(select coalesce(jsonb_agg(payload order by created_at desc),'[]') from public.finance_suppliers where workspace_id=p_workspace_id),
    'settings',(select to_jsonb(s) from public.finance_settings s where workspace_id=p_workspace_id),
    'clientApps',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.base_client_app_state a where workspace_id=p_workspace_id),
    'centralManager',public.is_client_central_manager(p_workspace_id)
  ) where public.is_finance_workspace_member(p_workspace_id);
$$;
insert into public.base_schema_migrations(version) values('202608300004_client_lifecycle');
notify pgrst,'reload schema';
commit;
