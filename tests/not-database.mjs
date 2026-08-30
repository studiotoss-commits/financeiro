import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
export const notMigration=await fs.readFile(new URL('../supabase/migrations/202608300002_not_mvp.sql',import.meta.url),'utf8');
export const ids={owner:'10000000-0000-0000-0000-000000000011',other:'10000000-0000-0000-0000-000000000012',member:'10000000-0000-0000-0000-000000000013',solo:'10000000-0000-0000-0000-000000000014',workspace:'20000000-0000-0000-0000-000000000011',second:'20000000-0000-0000-0000-000000000012',client:'30000000-0000-0000-0000-000000000011',otherClient:'30000000-0000-0000-0000-000000000012',service:'40000000-0000-0000-0000-000000000011'};
export async function makeDatabase({seed=true,migrate=true}={}){
  const db=new PGlite();
  await db.exec(`create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec((await fs.readFile(new URL('../apps/financeiro/supabase/migrations/202608090001_financeiro_mvp.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
  if(seed){
    for(const id of [ids.owner,ids.other,ids.member,ids.solo])await db.query('insert into auth.users values($1)',[id]);
    await db.query('insert into finance_workspaces(id,name,created_by) values($1,$2,$3),($4,$5,$6)',[ids.workspace,'Empresa Exemplo',ids.owner,ids.second,'Outra Empresa',ids.other]);
    await db.query("insert into finance_workspace_members(workspace_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner'),($1,$5,'member')",[ids.workspace,ids.owner,ids.second,ids.other,ids.member]);
    await db.query("insert into finance_clients(id,workspace_id,name,status,payload) values($1,$2,'Cliente Exemplo','Ativo',$3),($4,$5,'Outro Cliente','Ativo',$6)",[ids.client,ids.workspace,{id:ids.client,name:'Cliente Exemplo',fin:{name:'Maria',email:'maria@example.test'},contracts:[{amount:150}]},ids.otherClient,ids.second,{id:ids.otherClient,name:'Outro Cliente'}]);
  }
  await db.exec(await fs.readFile(new URL('../supabase/migrations/202608300001_central_clientes.sql',import.meta.url),'utf8'));
  if(migrate)await db.exec(notMigration);
  return db;
}
export async function asUser(db,id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
export const serviceData={client_id:ids.client,name:'Domínio institucional',kind:'domain',identifier:'exemplo.com.br',provider:'Registro.br',payee:'Registro.br',amount_cents:4000,recurrence_months:12,due_date:'2026-09-29',status:'active',payment_url:'https://registro.br/',panel_url:'https://registro.br/login/',document_url:'https://drive.google.com/file/d/exemplo',contact_name:'',contact_email:'',contact_whatsapp:'',reminder_days:[30,15,2],message_template:'',notes:'Sem senhas neste cadastro.'};
