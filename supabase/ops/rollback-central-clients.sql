-- Somente administrador, em manutenção, com backup pós-migração.
-- Executar no mesmo arquivo/transação que as três definições de funções do backup.
-- Recusa execução caso outro app já esteja usando a central.
begin;
do $$ begin
  if exists(select 1 from public.base_app_members where app_id<>'financeiro') then
    raise exception 'Rollback requires reviewing other apps using the central registry';
  end if;
end $$;

-- Captura o estado atual, não sobrescreve com os dados do backup anterior.
create temporary table central_rollback_clients on commit drop as select * from public.finance_clients;
drop function public.load_finance_snapshot(uuid);
drop view public.finance_clients;
alter table public.finance_transactions drop constraint finance_transactions_base_client_fkey;
alter table public.finance_client_profiles drop constraint finance_profiles_base_client_fkey;
alter table public.finance_client_profiles rename to finance_clients;
alter table public.finance_clients add column name text, add column status text;
insert into public.finance_clients(id,workspace_id,name,status,payload,created_at,updated_at)
select id,workspace_id,name,status,payload,created_at,updated_at from central_rollback_clients
on conflict(id) do update set name=excluded.name,status=excluded.status,payload=excluded.payload,updated_at=excluded.updated_at;
alter table public.finance_clients alter column name set not null, alter column status set not null, alter column status set default 'Ativo';
create index finance_clients_workspace_name_idx on public.finance_clients(workspace_id,name);
alter table public.finance_transactions add constraint finance_transactions_client_id_fkey foreign key(client_id) references public.finance_clients(id) on delete set null;
drop policy "workspace members read finance profiles" on public.finance_clients;
create policy "members manage clients" on public.finance_clients for all to authenticated
  using(public.is_finance_workspace_member(workspace_id)) with check(public.is_finance_workspace_member(workspace_id));
grant select,insert,update,delete on public.finance_clients to authenticated;

-- Remover funções dependentes antes das tabelas. As definições originais vêm do backup.
drop function public.save_base_client(uuid,uuid,jsonb,text,boolean,bigint);
drop table public.base_clients;
drop table public.base_app_members;
drop policy "members read workspaces" on public.finance_workspaces;
create policy "members read workspaces" on public.finance_workspaces for select to authenticated using(public.is_finance_workspace_member(id));
drop policy "members read memberships" on public.finance_workspace_members;
create policy "members read memberships" on public.finance_workspace_members for select to authenticated using(public.is_finance_workspace_member(workspace_id));
drop function public.base_client_fields(jsonb);
-- is_base_workspace_member é removida APÓS restaurar is_finance_workspace_member.
delete from public.base_schema_migrations where version='202608300001_central_clientes';
-- Anexar aqui bootstrap_finance_workspace, is_finance_workspace_member e save_finance_state do backup.
-- Depois: drop function public.is_base_workspace_member(uuid); commit;
