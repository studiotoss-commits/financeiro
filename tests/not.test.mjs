import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {makeDatabase,asUser,ids,serviceData,notMigration} from './not-database.mjs';
import {addMonths,daysUntil,parseMoney,reminders,messagePreview,urgency,safeLink} from '../apps/notificacoes-vencimentos/src/domain.js';

test('datas e mensagens do NOT não simulam envio nem expõem documento por padrão',()=>{
  assert.equal(addMonths('2024-02-29',12),'2025-02-28');assert.equal(addMonths('2026-01-31',1),'2026-02-28');
  assert.equal(daysUntil('2026-09-01','2026-08-30'),2);
  assert.equal(parseMoney('149,90'),14990);assert.equal(parseMoney(''),null);assert.equal(parseMoney('0'),0);
  for(const value of ['-1','1.234,56','1,999','1e3','a'])assert.throws(()=>parseMoney(value));
  const list=reminders(serviceData,'2026-08-30');assert.deepEqual(list.map(x=>x.date),['2026-08-30','2026-09-14','2026-09-27']);
  assert.equal(list[0].label,'Previsto para hoje');assert.equal(reminders({...serviceData,status:'paused'}).length,0);
  const client={name:'Exemplo',payload:{fin:{name:'Maria',email:'maria@example.test'}}};
  const preview=messagePreview(serviceData,client);assert.equal(preview.contact.email,'maria@example.test');assert.ok(preview.body.includes('Olá, Maria'));assert.ok(!preview.body.includes('drive.google.com'));
  assert.ok(messagePreview(serviceData,client,true).body.includes('drive.google.com'));assert.ok(!preview.body.includes('undefined'));
  for(const link of ['javascript:alert(1)','http://site.com','https://user:senha@site.com'])assert.equal(safeLink(link),null);
  assert.equal(urgency(serviceData,'2026-09-30').group,'overdue');assert.equal(urgency(serviceData,'2026-09-29').label,'Vence hoje');
});

test('NOT: permissões, compartilhamento, concorrência e renovação em PostgreSQL',async t=>{
  const db=await makeDatabase();t.after(()=>db.close());
  await asUser(db,ids.owner);
  await t.test('somente proprietário ativa NOT; ativação é idempotente',async()=>{
    await assert.rejects(db.query('select save_not_service($1,$2,$3,$4)',[ids.workspace,ids.service,serviceData,0]),/NOT access denied/);
    await asUser(db,ids.member);await assert.rejects(db.query('select activate_not_workspace($1)',[ids.workspace]),/Only workspace owner/);
    await asUser(db,ids.owner);await db.query('select activate_not_workspace($1)',[ids.workspace]);await db.query('select activate_not_workspace($1)',[ids.workspace]);
    assert.equal((await db.query("select count(*)::int n from base_app_members where app_id='not'")).rows[0].n,1);
  });
  await t.test('cadastro usa cliente central, registra histórico e bloqueia outra empresa',async()=>{
    await db.query('select save_not_service($1,$2,$3,$4)',[ids.workspace,ids.service,serviceData,0]);
    assert.equal((await db.query('select count(*)::int n from not_service_events')).rows[0].n,1);
    assert.equal((await db.query('select client_id from not_services')).rows[0].client_id,ids.client);
    await asUser(db,ids.other);await db.query('select activate_not_workspace($1)',[ids.second]);
    assert.equal((await db.query('select * from not_services')).rows.length,0);
    assert.equal((await db.query('select * from not_service_events')).rows.length,0);
    await assert.rejects(db.query('select save_not_service($1,$2,$3,$4)',[ids.second,ids.service,{...serviceData,client_id:ids.otherClient},1]),/NOT access denied/);
    await assert.rejects(db.query('select save_not_service($1,$2,$3,$4)',[ids.second,'40000000-0000-0000-0000-000000000019',serviceData,0]),/active central client/);
    await asUser(db,ids.owner);
  });
  await t.test('valida links, valores, prazos e revisões sem gravação parcial',async()=>{
    for(const patch of [{payment_url:'javascript:alert(1)'},{panel_url:'https://user:pass@site.test'},{amount_cents:-1},{reminder_days:[]},{reminder_days:[30,30]},{reminder_days:[0]},{due_date:'1999-01-01'}])await assert.rejects(db.query('select save_not_service($1,$2,$3,$4)',[ids.workspace,ids.service,{...serviceData,...patch},1]));
    await assert.rejects(db.query('select save_not_service($1,$2,$3,$4)',[ids.workspace,ids.service,serviceData,0]),/Service changed/);
    assert.equal((await db.query('select revision from not_services')).rows[0].revision,1);
    await assert.rejects(db.query('delete from not_services'),/permission denied/);
    await assert.rejects(db.query("update not_services set name='fraude'"),/permission denied/);
    await assert.rejects(db.query('delete from not_service_events'),/permission denied/);
  });
  await t.test('renovar registra ciclo, avança data e não cria lançamentos financeiros',async()=>{
    const before=(await db.query('select * from finance_transactions')).rows;
    await assert.rejects(db.query('select renew_not_service($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.service,1,'2026-08-30','2026-09-29',4000]),/Next due/);
    await db.query('select renew_not_service($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.service,1,'2026-08-30','2027-09-29',4000]);
    await assert.rejects(db.query('select renew_not_service($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.service,1,'2026-08-30','2028-09-29',4000]),/Service changed/);
    const event=(await db.query("select payload from not_service_events where kind='renewed'")).rows[0].payload;
    assert.equal(event.previous_due,'2026-09-29');assert.equal(event.next_due,'2027-09-29');assert.equal(event.amount_cents,4000);
    assert.deepEqual((await db.query('select * from finance_transactions')).rows,before);
  });
  await t.test('cliente arquivado mantém serviço existente, mas não aceita novo vínculo',async()=>{
    const c=(await db.query('select * from base_clients where id=$1',[ids.client])).rows[0];
    await db.query('select save_base_client($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.client,c.payload,'Ativo',true,c.revision]);
    await assert.rejects(db.query('select save_not_service($1,$2,$3,$4)',[ids.workspace,'40000000-0000-0000-0000-000000000018',serviceData,0]),/active central client/);
    await db.query('select save_not_service($1,$2,$3,$4)',[ids.workspace,ids.service,{...serviceData,due_date:'2027-09-29',status:'paused'},2]);
    await assert.rejects(db.query('select renew_not_service($1,$2,$3,$4,$5,$6)',[ids.workspace,ids.service,3,'2026-08-30','2028-09-29',4000]),/Only active/);
  });
  await t.test('usuário novo cria apenas acesso NOT, sem acesso automático ao Financeiro',async()=>{
    await asUser(db,ids.solo);const w=(await db.query("select activate_not_workspace(null,'Empresa nova') as id")).rows[0].id;
    assert.equal((await db.query('select is_finance_workspace_member($1) allowed',[w])).rows[0].allowed,false);
    await assert.rejects(db.query('select activate_not_workspace($1)',[ids.workspace]),/Only workspace owner/);
    await assert.rejects(db.query('select bootstrap_finance_workspace()'),/Finance access denied/);
  });
  await t.test('anônimo não lê nem grava NOT',async()=>{
    await db.exec('reset role;set role anon');
    await assert.rejects(db.query('select * from not_services'),/permission denied/);
    await assert.rejects(db.query('select activate_not_workspace(null)'),/permission denied/);
  });
});

test('migração NOT preserva os dados reais da central e do Financeiro',{skip:!process.env.BASE_NOT_BACKUP},async t=>{
  const backup=JSON.parse(await fs.readFile(process.env.BASE_NOT_BACKUP,'utf8'));
  const db=await makeDatabase({seed:false,migrate:false});t.after(()=>db.close());
  for(const id of new Set(backup.tables.finance_workspace_members.map(m=>m.user_id)))await db.query('insert into auth.users values($1)',[id]);
  const tables=['finance_workspaces','finance_workspace_members','base_app_members','base_clients','finance_client_profiles','finance_suppliers','finance_transactions','finance_settings'];
  const before={};
  for(const table of tables){for(const row of backup.tables[table].sort((a,b)=>Number(!!a.source_entry_id)-Number(!!b.source_entry_id)))await db.query(`insert into public.${table} select * from jsonb_populate_record(null::public.${table},$1)`,[row]);before[table]=(await db.query(`select * from ${table} order by to_jsonb(${table})::text`)).rows;}
  await db.exec(notMigration);
  for(const table of tables)assert.deepEqual((await db.query(`select * from ${table} order by to_jsonb(${table})::text`)).rows,before[table],table);
});
