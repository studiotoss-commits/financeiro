import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {makeDatabase,asUser,ids,serviceData} from './not-database.mjs';
import {operationalEntries,splitClient} from '../apps/financeiro/src/services/clientModel.js';
import {reminders,urgency} from '../apps/notificacoes-vencimentos/src/domain.js';
export const lifecycleSql=await fs.readFile(new URL('../supabase/migrations/202608300004_client_lifecycle.sql',import.meta.url),'utf8');

test('arquivamento por app e exclusão central respeitam escopo, histórico e concorrência',async t=>{
  const db=await makeDatabase();t.after(()=>db.close());
  await db.exec(lifecycleSql);
  await asUser(db,ids.owner);await db.query('select activate_not_workspace($1)',[ids.workspace]);
  await db.query('select save_not_service($1,$2,$3,0)',[ids.workspace,ids.service,serviceData]);
  const entry={id:'50000000-0000-0000-0000-000000000011',clientId:ids.client,type:'income',desc:'Serviço',amount:100,date:'2026-08-30',dueDate:'2026-09-01',status:'A receber'};
  const state={version:3,entries:[entry],suppliers:[],clientChanges:[],settings:{}};
  await db.query('select save_finance_state($1,$2,0)',[ids.workspace,state]);
  const initialClient=(await db.query('select to_jsonb(c) c from base_clients c where id=$1',[ids.client])).rows[0].c;
  await t.test('arquivar NOT preserva cliente e financeiro, bloqueia novas gravações/renovações e restaura a situação',async()=>{
    await db.query("select set_client_app_archived($1,$2,'not',true,0)",[ids.workspace,ids.client]);
    assert.deepEqual((await db.query('select to_jsonb(c) c from base_clients c where id=$1',[ids.client])).rows[0].c,initialClient);
    assert.equal((await db.query('select payload from finance_transactions')).rows[0].payload.amount,100);
    const service=(await db.query('select to_jsonb(s) s from not_services s')).rows[0].s;
    assert.equal(service.status,'active');assert.equal(service.revision,2);
    await assert.rejects(db.query('select save_not_service($1,$2,$3,2)',[ids.workspace,ids.service,serviceData]),/archived in NOT/);
    await assert.rejects(db.query("select renew_not_service($1,$2,2,'2026-01-01','2027-09-01',100)",[ids.workspace,ids.service]),/archived in NOT/);
    assert.equal((await db.query('select count(*)::int n from not_service_events')).rows[0].n,1);
    await assert.rejects(db.query("select set_client_app_archived($1,$2,'not',false,0)",[ids.workspace,ids.client]),/changed/);
    await db.query("select set_client_app_archived($1,$2,'not',false,1)",[ids.workspace,ids.client]);
    await assert.rejects(db.query('select save_not_service($1,$2,$3,1)',[ids.workspace,ids.service,serviceData]),/changed/);
    assert.equal((await db.query('select status from not_services')).rows[0].status,'active');
  });
  await t.test('arquivar Financeiro protege lançamentos de omissão/alteração e mantém NOT operacional',async()=>{
    await db.query("select set_client_app_archived($1,$2,'financeiro',true,0)",[ids.workspace,ids.client]);
    assert.equal((await db.query("select is_client_archived_in_app($1,$2,'not') as value",[ids.workspace,ids.client])).rows[0].value,false);
    await assert.rejects(db.query('select save_finance_state($1,$2,1)',[ids.workspace,state]),/changed/);
    await db.query('select save_finance_state($1,$2,2)',[ids.workspace,{...state,entries:[]}]);
    assert.deepEqual((await db.query('select payload from finance_transactions')).rows[0].payload,entry);
    await db.query('select save_finance_state($1,$2,3)',[ids.workspace,{...state,entries:[{...entry,amount:999}]}]);
    assert.equal((await db.query('select amount from finance_transactions')).rows[0].amount,'100.00');
    await assert.rejects(db.query('select save_finance_state($1,$2,4)',[ids.workspace,{...state,entries:[{...entry,id:'50000000-0000-0000-0000-000000000012'}]}]),/Archived client/);
    await db.query("select set_client_app_archived($1,$2,'financeiro',false,1)",[ids.workspace,ids.client]);
    await assert.rejects(db.query('select save_finance_state($1,$2,5)',[ids.workspace,{...state,version:2}]),/BASE updated/);
  });
  await t.test('membro comum, NOT-only, anônimo e outra empresa não podem excluir globalmente nem burlar RPCs',async()=>{
    await asUser(db,ids.member);
    await assert.rejects(db.query('select client_delete_preview($1,$2)',[ids.workspace,ids.client]),/Central owner/);
    await assert.rejects(db.query("select set_client_app_archived($1,$2,'not',true,2)",[ids.workspace,ids.client]),/App access/);
    await asUser(db,ids.solo);const solo=(await db.query("select activate_not_workspace(null,'NOT-only') id")).rows[0].id;
    await assert.rejects(db.query('select client_delete_preview($1,$2)',[solo,ids.client]),/Central owner/);
    await asUser(db,ids.other);
    assert.equal((await db.query('select count(*)::int n from base_client_app_state')).rows[0].n,0);
    await assert.rejects(db.query("select set_client_app_archived($1,$2,'financeiro',true,0)",[ids.workspace,ids.client]),/App access/);
    await assert.rejects(db.query('select client_delete_preview($1,$2)',[ids.workspace,ids.client]),/Central owner/);
    await asUser(db,ids.owner);
    await assert.rejects(db.query('delete from base_clients where id=$1',[ids.client]),/permission denied/);
    await assert.rejects(db.query('delete from base_client_actions'),/permission denied/);
    await assert.rejects(db.query('select _save_not_service_before_lifecycle($1,$2,$3,3)',[ids.workspace,ids.service,serviceData]),/permission denied/);
    await db.exec('reset role;set role anon');
    await assert.rejects(db.query('select client_delete_preview($1,$2)',[ids.workspace,ids.client]),/permission denied/);
    await asUser(db,ids.owner);
  });
  await t.test('exclusão exige nome exato e confirmação atual; remove só o cliente e bloqueia ressurreição',async()=>{
    let preview=(await db.query('select client_delete_preview($1,$2) p',[ids.workspace,ids.client])).rows[0].p;
    assert.equal(preview.finance_entries,1);assert.equal(preview.not_services,1);assert.equal(preview.not_events,1);
    await assert.rejects(db.query('select delete_client_from_central($1,$2,$3,$4)',[ids.workspace,ids.client,preview.token,'outro']),/exact client name/);
    await db.query('select save_not_service($1,$2,$3,3)',[ids.workspace,ids.service,{...serviceData,notes:'Dado novo após prévia'}]);
    await assert.rejects(db.query('select delete_client_from_central($1,$2,$3,$4)',[ids.workspace,ids.client,preview.token,preview.name]),/impact changed/);
    preview=(await db.query('select client_delete_preview($1,$2) p',[ids.workspace,ids.client])).rows[0].p;
    await db.query('select delete_client_from_central($1,$2,$3,$4)',[ids.workspace,ids.client,preview.token,preview.name]);
    for(const table of ['base_clients','finance_client_profiles','finance_transactions','not_services','not_service_events','base_client_app_state'])assert.equal((await db.query('select count(*)::int n from '+table+' where workspace_id=$1',[ids.workspace])).rows[0].n,0,table);
    await assert.rejects(db.query("select save_base_client($1,$2,$3,'Ativo',false,0)",[ids.workspace,ids.client,initialClient.payload]),/permanently deleted/);
    await assert.rejects(db.query('select save_finance_state($1,$2,5)',[ids.workspace,state]),/changed/);
    await asUser(db,ids.other);assert.equal((await db.query('select count(*)::int n from base_clients')).rows[0].n,1);
  });
});

test('filtros operacionais mantêm arquivo na persistência e removem lembretes de clientes arquivados',()=>{
  const entries=[{id:'a',clientId:'c'},{id:'b',sourceEntryId:'a'},{id:'d',clientId:'other'}];
  const clients=[{id:'c',appArchivedAt:'2026-08-30'}];
  assert.deepEqual(operationalEntries(entries,clients),[entries[2]]);assert.equal(entries.length,3);
  const service={...serviceData,client_archived_at:'2026-08-30'};
  assert.deepEqual(reminders(service),[]);assert.equal(urgency(service).group,'archived');
  assert.deepEqual(splitClient({id:'c',name:'Cliente',appArchivedAt:'today',_appRevision:2}).finance,{});
});


test('exclusão inclui derivados legítimos e bloqueia dependências de outro cliente/empresa',async t=>{
  const db=await makeDatabase();t.after(()=>db.close());await db.exec(lifecycleSql);
  const parent='60000000-0000-0000-0000-000000000011',child='60000000-0000-0000-0000-000000000012';
  await db.query("insert into finance_transactions(id,workspace_id,kind,description,amount,due_date,status,client_id,payload) values($1,$2,'income','Original',100,'2026-09-01','Pendente',$3,$4)",[parent,ids.workspace,ids.client,{id:parent,clientId:ids.client,type:'income',desc:'Original',amount:100,date:'2026-09-01'}]);
  await db.query("insert into finance_transactions(id,workspace_id,kind,description,amount,due_date,status,client_id,source_entry_id,payload) values($1,$2,'expense','Derivado',10,'2026-09-01','Pendente',$3,$4,$5)",[child,ids.second,ids.otherClient,parent,{id:child,clientId:ids.otherClient,type:'expense',desc:'Derivado',amount:10,date:'2026-09-01',sourceEntryId:parent,isTaxForecast:true}]);
  await asUser(db,ids.owner);
  await assert.rejects(db.query('select client_delete_preview($1,$2)',[ids.workspace,ids.client]),/Cross-client dependency/);
  assert.equal((await db.query('select count(*)::int n from finance_transactions')).rows[0].n,1);
  await db.exec('reset role');
  await db.query("update finance_transactions set workspace_id=$1,client_id=null,payload=payload||jsonb_build_object('clientId',null) where id=$2",[ids.workspace,child]);
  await asUser(db,ids.owner);
  const preview=(await db.query('select client_delete_preview($1,$2) p',[ids.workspace,ids.client])).rows[0].p;
  assert.equal(preview.finance_entries,2);
  await db.query('select delete_client_from_central($1,$2,$3,$4)',[ids.workspace,ids.client,preview.token,preview.name]);
  assert.equal((await db.query('select count(*)::int n from finance_transactions')).rows[0].n,0);
});
