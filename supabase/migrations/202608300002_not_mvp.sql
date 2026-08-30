-- NOT: serviços e histórico isolados do Financeiro. Nenhum envio é habilitado.
begin;
create function public.is_not_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_base_workspace_member(target_workspace) and exists(
    select 1 from public.base_app_members where workspace_id=target_workspace and user_id=(select auth.uid()) and app_id='not');
$$;
revoke all on function public.is_not_workspace_member(uuid) from public;
grant execute on function public.is_not_workspace_member(uuid) to authenticated;

create function public.activate_not_workspace(p_workspace_id uuid default null, p_name text default 'BASE')
returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); target uuid:=p_workspace_id;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  if target is null then
    if exists(select 1 from public.finance_workspace_members where user_id=uid) then raise exception 'Select existing workspace'; end if;
    if coalesce(length(trim(p_name)),0) not between 1 and 120 then raise exception 'Workspace name required'; end if;
    insert into public.finance_workspaces(name,created_by) values(trim(p_name),uid) returning id into target;
    insert into public.finance_workspace_members(workspace_id,user_id,role) values(target,uid,'owner');
  elsif public.is_not_workspace_member(target) then return target;
  elsif not exists(select 1 from public.finance_workspace_members where workspace_id=target and user_id=uid and role='owner') then
    raise exception 'Only workspace owner can activate NOT';
  end if;
  insert into public.base_app_members(workspace_id,user_id,app_id) values(target,uid,'not') on conflict do nothing;
  return target;
end;
$$;
revoke all on function public.activate_not_workspace(uuid,text) from public;
grant execute on function public.activate_not_workspace(uuid,text) to authenticated;

create table public.not_services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.finance_workspaces(id),
  client_id uuid not null,
  name text not null check(length(trim(name)) between 1 and 160),
  kind text not null check(kind in ('domain','hosting','email','toss','other')),
  identifier text not null default '' check(length(identifier)<=250),
  provider text not null default '' check(length(provider)<=160),
  payee text not null default '' check(length(payee)<=160),
  amount_cents bigint check(amount_cents between 0 and 99999999999),
  recurrence_months integer not null default 12 check(recurrence_months in (0,1,3,6,12,24,36)),
  due_date date not null check(due_date between date '2000-01-01' and date '2200-12-31'),
  status text not null default 'active' check(status in ('active','paused','canceled','completed')),
  payment_url text not null default '', panel_url text not null default '', document_url text not null default '',
  contact_name text not null default '' check(length(contact_name)<=160),
  contact_email text not null default '' check(length(contact_email)<=254),
  contact_whatsapp text not null default '' check(length(contact_whatsapp)<=40),
  reminder_days integer[] not null default array[30,15,2],
  message_template text not null default '' check(length(message_template)<=5000),
  notes text not null default '' check(length(notes)<=4000),
  revision bigint not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(workspace_id,id),
  foreign key(workspace_id,client_id) references public.base_clients(workspace_id,id) on delete restrict
);
create index not_services_due_idx on public.not_services(workspace_id,status,due_date);
create index not_services_client_idx on public.not_services(workspace_id,client_id);
create table public.not_service_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null,
  service_id uuid not null, kind text not null check(kind in ('created','updated','renewed')),
  actor_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
  payload jsonb not null,
  foreign key(workspace_id,service_id) references public.not_services(workspace_id,id) on delete restrict
);
create index not_events_service_idx on public.not_service_events(workspace_id,service_id,created_at desc);
alter table public.not_services enable row level security;
alter table public.not_service_events enable row level security;
revoke all on public.not_services,public.not_service_events from anon,authenticated;
grant select on public.not_services,public.not_service_events to authenticated;
create policy "NOT members read services" on public.not_services for select to authenticated using(public.is_not_workspace_member(workspace_id));
create policy "NOT members read history" on public.not_service_events for select to authenticated using(public.is_not_workspace_member(workspace_id));

create function public.save_not_service(p_workspace_id uuid,p_id uuid,p_data jsonb,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare previous public.not_services; result public.not_services; data public.not_services; url text; offsets integer[];
begin
  if not public.is_not_workspace_member(p_workspace_id) then raise exception 'NOT access denied'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or p_id is null or p_expected_revision is null or p_expected_revision<0 then raise exception 'Invalid service data'; end if;
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  select * into previous from public.not_services where id=p_id for update;
  if previous.id is not null and previous.workspace_id<>p_workspace_id then raise exception 'NOT access denied'; end if;
  if coalesce(previous.revision,0)<>p_expected_revision then raise exception 'Service changed. Reload before saving.'; end if;
  select * into data from jsonb_populate_record(null::public.not_services,p_data);
  if not exists(select 1 from public.base_clients where id=data.client_id and workspace_id=p_workspace_id
    and (archived_at is null or previous.client_id=id)) then raise exception 'Select an active central client'; end if;
  if data.contact_email<>'' and data.contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
  foreach url in array array[data.payment_url,data.panel_url,data.document_url] loop
    if url is null or length(url)>2000 or (url<>'' and (url !~ '^https://[^/[:space:]@]+([/?#][^[:space:]]*)?$')) then raise exception 'Use a complete HTTPS link without credentials'; end if;
  end loop;
  if coalesce(cardinality(data.reminder_days),0) not between 1 and 6 or exists(select 1 from unnest(data.reminder_days) d where d is null or d not between 1 and 90) then raise exception 'Reminders must be 1 to 90 days'; end if;
  select array_agg(distinct d order by d desc) into offsets from unnest(data.reminder_days) d;
  if cardinality(offsets)<>cardinality(data.reminder_days) then raise exception 'Duplicate reminder days'; end if;
  insert into public.not_services(id,workspace_id,client_id,name,kind,identifier,provider,payee,amount_cents,recurrence_months,due_date,status,
    payment_url,panel_url,document_url,contact_name,contact_email,contact_whatsapp,reminder_days,message_template,notes)
  values(p_id,p_workspace_id,data.client_id,trim(data.name),data.kind,trim(data.identifier),trim(data.provider),trim(data.payee),data.amount_cents,
    data.recurrence_months,data.due_date,data.status,data.payment_url,data.panel_url,data.document_url,trim(data.contact_name),trim(data.contact_email),
    trim(data.contact_whatsapp),offsets,data.message_template,data.notes)
  on conflict(id) do update set client_id=excluded.client_id,name=excluded.name,kind=excluded.kind,identifier=excluded.identifier,
    provider=excluded.provider,payee=excluded.payee,amount_cents=excluded.amount_cents,recurrence_months=excluded.recurrence_months,
    due_date=excluded.due_date,status=excluded.status,payment_url=excluded.payment_url,panel_url=excluded.panel_url,document_url=excluded.document_url,
    contact_name=excluded.contact_name,contact_email=excluded.contact_email,contact_whatsapp=excluded.contact_whatsapp,
    reminder_days=excluded.reminder_days,message_template=excluded.message_template,notes=excluded.notes,
    revision=not_services.revision+1,updated_at=now()
  returning * into result;
  insert into public.not_service_events(workspace_id,service_id,kind,actor_id,payload)
  values(p_workspace_id,p_id,case when previous.id is null then 'created' else 'updated' end,auth.uid(),jsonb_build_object('before',to_jsonb(previous),'after',to_jsonb(result)));
  return to_jsonb(result);
end;
$$;
revoke all on function public.save_not_service(uuid,uuid,jsonb,bigint) from public;
grant execute on function public.save_not_service(uuid,uuid,jsonb,bigint) to authenticated;

create function public.renew_not_service(p_workspace_id uuid,p_id uuid,p_expected_revision bigint,p_paid_on date,p_next_due date,p_amount_cents bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare previous public.not_services; result public.not_services;
begin
  if not public.is_not_workspace_member(p_workspace_id) then raise exception 'NOT access denied'; end if;
  perform 1 from public.finance_workspaces where id=p_workspace_id for update;
  select * into previous from public.not_services where id=p_id and workspace_id=p_workspace_id for update;
  if previous.id is null or p_expected_revision is null or previous.revision<>p_expected_revision then raise exception 'Service changed. Reload before saving.'; end if;
  if previous.status<>'active' then raise exception 'Only active services can be renewed'; end if;
  if p_paid_on is null or p_paid_on>timezone('America/Sao_Paulo',now())::date or p_paid_on<date '2000-01-01' then raise exception 'Invalid payment date'; end if;
  if p_amount_cents is not null and p_amount_cents not between 0 and 99999999999 then raise exception 'Invalid amount'; end if;
  if (previous.recurrence_months>0 and p_next_due is null) or (p_next_due is not null and (p_next_due<=previous.due_date or p_next_due>date '2200-12-31')) then raise exception 'Next due date must be after current due date'; end if;
  update public.not_services set due_date=coalesce(p_next_due,due_date),status=case when p_next_due is null then 'completed' else 'active' end,
    revision=revision+1,updated_at=now() where id=p_id returning * into result;
  insert into public.not_service_events(workspace_id,service_id,kind,actor_id,payload)
  values(p_workspace_id,p_id,'renewed',auth.uid(),jsonb_build_object('previous_due',previous.due_date,'next_due',p_next_due,'paid_on',p_paid_on,'amount_cents',p_amount_cents,'service_name',previous.name));
  return to_jsonb(result);
end;
$$;
revoke all on function public.renew_not_service(uuid,uuid,bigint,date,date,bigint) from public;
grant execute on function public.renew_not_service(uuid,uuid,bigint,date,date,bigint) to authenticated;
insert into public.base_schema_migrations(version) values('202608300002_not_mvp');
commit;
