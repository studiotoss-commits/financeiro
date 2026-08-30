import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { splitClient, mergeClient } from '../apps/financeiro/src/services/clientModel.js';
import { createFinancePersistence } from '../apps/financeiro/src/services/financePersistence.js';

const initialSql = (await fs.readFile(new URL('../apps/financeiro/supabase/migrations/202608090001_financeiro_mvp.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;','');
const migration = await fs.readFile(new URL('../supabase/migrations/202608300001_central_clientes.sql',import.meta.url),'utf8');
const ids = { user:'10000000-0000-0000-0000-000000000001', other:'10000000-0000-0000-0000-000000000002', workspace:'20000000-0000-0000-0000-000000000001', second:'20000000-0000-0000-0000-000000000002', client:'30000000-0000-0000-0000-000000000001', extra:'30000000-0000-0000-0000-000000000002', entry:'40000000-0000-0000-0000-000000000001' };
async function database() {
  const db = new PGlite();
  await db.exec(`create role authenticated; create role anon; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
    grant usage on schema public,auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(initialSql);
  return db;
}
async function asUser(db,user) { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]); await db.exec('set role authenticated'); }
const original = { id:ids.client,name:'Cliente de teste',cnpj:'12.345.678/0001-90',status:'Ativo',resp:{name:'Contato',email:'teste@example.test'},contracts:[{id:'contrato',amount:500}],interactions:[{text:'Privado do Financeiro'}],customFinance:{preserve:true} };
const entry = {id:ids.entry,type:'income',desc:'Cobrança preservada',amount:500,date:'2026-08-30',status:'Recebido',clientId:ids.client};
test('migração, isolamento, concorrência e preservação de vínculos em PostgreSQL', async t => {
  const db = await database();
  t.after(()=>db.close());
  await db.query('insert into auth.users values($1),($2)',[ids.user,ids.other]);
  await db.query('insert into finance_workspaces(id,name,created_by) values($1,$2,$3),($4,$5,$6)',[ids.workspace,'Empresa A',ids.user,ids.second,'Empresa B',ids.other]);
  await db.query("insert into finance_workspace_members(workspace_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner')",[ids.workspace,ids.user,ids.second,ids.other]);
  await db.query('insert into finance_clients(id,workspace_id,name,status,payload) values($1,$2,$3,$4,$5)',[ids.client,ids.workspace,original.name,original.status,original]);
  await db.query('insert into finance_transactions(id,workspace_id,kind,description,amount,due_date,status,client_id,payload) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[entry.id,ids.workspace,entry.type,entry.desc,entry.amount,entry.date,entry.status,entry.clientId,entry]);
  const before = (await db.query('select * from finance_transactions')).rows;
  await db.exec(migration);
  await t.test('mantém IDs, valores, datas e dados financeiros; central não expõe contratos',async()=>{
    assert.deepEqual((await db.query('select * from finance_transactions')).rows,before);
    const central=(await db.query('select * from base_clients')).rows[0];
    assert.equal(central.id,ids.client);
    assert.equal(central.payload.contracts,undefined);
    assert.equal(central.payload.customFinance,undefined);
    const profile=(await db.query('select * from finance_client_profiles')).rows[0];
    assert.equal(profile.payload.resp,undefined);
    const restored=(await db.query('select payload from finance_clients')).rows[0].payload;
    delete restored.archivedAt;
    assert.deepEqual(restored,original);
  });
  await asUser(db,ids.other);
  await t.test('usuário de outra empresa não lê nem modifica cliente',async()=>{
    assert.equal((await db.query('select * from base_clients')).rows.length,0);
    await assert.rejects(db.query('select save_base_client($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.client,{name:'Ataque'},'Ativo',false,1]),/Workspace access denied/);
    assert.equal((await db.query('select load_finance_snapshot($1) as data',[ids.workspace])).rows[0].data,null);
  });
  await asUser(db,ids.user);
  const state={version:2,entries:[entry],suppliers:[],clientChanges:[],settings:{}};
  await t.test('cliente criado por outro app permanece após salvar o Financeiro',async()=>{
    await db.query('select save_base_client($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.extra,{name:'Cliente do NOT',contracts:[{secret:true}]},'Ativo',false,0]);
    await db.query('select save_finance_state($1,$2,$3)',[ids.workspace,state,0]);
    assert.equal((await db.query('select count(*)::int as n from base_clients')).rows[0].n,2);
    assert.equal((await db.query('select payload from base_clients where id=$1',[ids.extra])).rows[0].payload.contracts,undefined);
  });
  await t.test('edição externa não é sobrescrita por snapshot financeiro inalterado',async()=>{
    await db.query('select save_base_client($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.client,{...splitClient(original).data,name:'Nome atualizado no outro app'},'Ativo',false,1]);
    await db.query('select save_finance_state($1,$2,$3)',[ids.workspace,state,1]);
    assert.equal((await db.query('select name from base_clients where id=$1',[ids.client])).rows[0].name,'Nome atualizado no outro app');
  });
  await t.test('conflito de cliente desfaz toda a gravação financeira',async()=>{
    const changed={...state,entries:[{...entry,amount:999}],clientChanges:[{...splitClient(original),expectedRevision:1}]};
    await assert.rejects(db.query('select save_finance_state($1,$2,$3)',[ids.workspace,changed,2]),/Client changed/);
    assert.equal(Number((await db.query('select amount from finance_transactions')).rows[0].amount),500);
  });
  await t.test('rejeita versão antiga, revisão financeira antiga e referência entre empresas',async()=>{
    await assert.rejects(db.query('select save_finance_state($1,$2,$3)',[ids.workspace,{...state,version:1},2]),/BASE updated/);
    await assert.rejects(db.query('select save_finance_state($1,$2,$3)',[ids.workspace,state,1]),/Finance state changed/);
    await asUser(db,ids.other);
    await assert.rejects(db.query('select save_finance_state($1,$2,$3)',[ids.second,state,0]),/Workspace access denied|Client does not belong/);
    await asUser(db,ids.user);
  });
  await t.test('arquivar e restaurar preservam vínculos; exclusão direta é proibida',async()=>{
    const central=(await db.query('select * from base_clients where id=$1',[ids.client])).rows[0];
    await db.query('select save_base_client($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.client,central.payload,'Ativo',true,2]);
    assert.ok((await db.query('select archived_at from base_clients where id=$1',[ids.client])).rows[0].archived_at);
    assert.equal((await db.query('select client_id from finance_transactions')).rows[0].client_id,ids.client);
    await assert.rejects(db.query('select save_finance_state($1,$2,$3)',[ids.workspace,{...state,entries:[entry,{...entry,id:'40000000-0000-0000-0000-000000000002'}]},2]),/Archived client/);
    await assert.rejects(db.query('delete from base_clients where id=$1',[ids.client]),/permission denied/);
    await db.query('select save_base_client($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.client,central.payload,'Ativo',false,3]);
    assert.equal((await db.query('select archived_at from base_clients where id=$1',[ids.client])).rows[0].archived_at,null);
  });
  await t.test('impede novo CPF/CNPJ duplicado sem alterar o existente',async()=>{
    await assert.rejects(db.query('select save_base_client($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.extra,{name:'Duplicado',cnpj:'12345678000190'},'Ativo',false,1]),/document already registered/);
  });
  await t.test('anônimo não tem acesso à central',async()=>{
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from base_clients'),/permission denied/);
    await assert.rejects(db.query('select save_base_client($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.extra,{name:'Teste'},'Ativo',false,0]),/permission denied/);
  });
  await t.test('membro só do NOT acessa cadastro, mas não dados nem gravação financeira',async()=>{
    await db.exec('reset role');
    const notUser='10000000-0000-0000-0000-000000000003';
    await db.query('insert into auth.users values($1)',[notUser]);
    await db.query("insert into finance_workspace_members(workspace_id,user_id) values($1,$2)",[ids.workspace,notUser]);
    await db.query("insert into base_app_members values($1,$2,'not')",[ids.workspace,notUser]);
    await asUser(db,notUser);
    assert.equal((await db.query('select count(*)::int as n from base_clients')).rows[0].n,2);
    assert.equal((await db.query('select * from finance_client_profiles')).rows.length,0);
    assert.equal((await db.query('select * from finance_transactions')).rows.length,0);
    assert.equal((await db.query('select * from finance_settings')).rows.length,0);
    await assert.rejects(db.query('select save_finance_state($1,$2,$3)',[ids.workspace,state,2]),/Workspace access denied/);
    await assert.rejects(db.query('select bootstrap_finance_workspace()'),/Finance access denied/);
  });
});

test('fila envia só clientes alterados e não repete gravação após erro',async()=>{
  const calls=[];
  const fake={rpc:async(name,args)=>{calls.push(args);return {data:calls.length,error:null};}};
  const client={...original,_baseRevision:1};
  const persistence=createFinancePersistence(fake,ids.workspace,0,[client]);
  const state={workspaceId:ids.workspace,clients:[client],entries:[],suppliers:[],categories:{},taxRate:0,account:{}};
  await persistence.save(state);
  assert.equal(calls[0].p_state.clientChanges.length,0);
  await persistence.save({...state,clients:[{...client,name:'Editado'}]});
  assert.equal(calls[1].p_state.clientChanges[0].expectedRevision,1);
  await persistence.save({...state,clients:[{...client,name:'Editado de novo'}]});
  assert.equal(calls[2].p_state.clientChanges[0].expectedRevision,2);
  assert.equal(calls[2].p_expected_revision,2);
  fake.rpc=async()=>({error:new Error('Client changed in another session')});
  await assert.rejects(persistence.save(state),/Client changed/);
  fake.rpc=async()=>{throw new Error('NÃO DEVE REENVIAR');};
  await assert.rejects(persistence.save(state),/Client changed/);
});

test('resultado de rede incerto bloqueia os próximos salvamentos',async()=>{
  let calls=0;
  const fake={rpc:async()=>{calls++;throw new Error('Network unavailable');}};
  const persistence=createFinancePersistence(fake,ids.workspace,0,[]);
  const state={workspaceId:ids.workspace,clients:[],entries:[],suppliers:[],categories:{},taxRate:0,account:{}};
  await assert.rejects(persistence.save(state),/Network unavailable/);
  await assert.rejects(persistence.save(state),/Network unavailable/);
  assert.equal(calls,1);
});

test('restaura backup real e ensaia migração sem perder dados', {skip:!process.env.BASE_MIGRATION_BACKUP}, async t=>{
  const backup=JSON.parse(await fs.readFile(process.env.BASE_MIGRATION_BACKUP,'utf8'));
  const db=await database();t.after(()=>db.close());
  const users=new Set(backup.tables.finance_workspaces.map(w=>w.created_by).concat(backup.tables.finance_workspace_members.map(m=>m.user_id)));
  for(const id of users)await db.query('insert into auth.users values($1)',[id]);
  for(const table of ['finance_workspaces','finance_workspace_members','finance_clients','finance_suppliers','finance_transactions','finance_settings']) {
    const rows=backup.tables[table];
    for(const row of rows.sort((a,b)=>Number(!!a.source_entry_id)-Number(!!b.source_entry_id)))
      await db.query(`insert into public.${table} select * from jsonb_populate_record(null::public.${table},$1::jsonb)`,[row]);
  }
  for(const f of backup.functions)await db.exec(f.definition);
  const before=(await db.query('select * from finance_transactions order by id')).rows;
  await db.exec(migration);
  assert.deepEqual((await db.query('select * from finance_transactions order by id')).rows,before);
  const after=(await db.query('select id,payload from finance_clients')).rows;
  assert.equal(after.length,backup.tables.finance_clients.length);
  for(const c of after){delete c.payload.archivedAt;assert.deepEqual(c.payload,backup.tables.finance_clients.find(x=>x.id===c.id).payload);}
  assert.equal((await db.query('select count(*)::int as n from finance_workspaces')).rows[0].n,backup.tables.finance_workspaces.length);
  const rollback=await fs.readFile(new URL('../supabase/ops/rollback-central-clients.sql',import.meta.url),'utf8');
  await db.exec(rollback+'\n'+backup.functions.map(f=>f.definition+';').join('\n')+'\ndrop function public.is_base_workspace_member(uuid); commit;');
  assert.deepEqual((await db.query('select * from finance_transactions order by id')).rows,before);
  assert.equal((await db.query('select count(*)::int as n from finance_clients')).rows[0].n,backup.tables.finance_clients.length);
});
