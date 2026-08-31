import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {makeDatabase,asUser,ids,serviceData} from './not-database.mjs';
import {dateBR,reminders,needsReview,compareServices} from '../apps/notificacoes-vencimentos/src/domain.js';

test('incomplete imports stay paused until their schedule is confirmed',async()=>{
  const db=await makeDatabase();
  try{
    await db.exec(await fs.readFile(new URL('../supabase/migrations/202608300003_not_incomplete_services.sql',import.meta.url),'utf8'));
    await asUser(db,ids.owner);
    await db.query('select activate_not_workspace($1)',[ids.workspace]);
    const incomplete={...serviceData,due_date:null,recurrence_months:null,status:'paused'};
    const saved=(await db.query('select save_not_service($1,$2,$3,0) as result',[ids.workspace,ids.service,incomplete])).rows[0].result;
    assert.equal(saved.due_date,null);assert.equal(saved.recurrence_months,null);
    assert.equal(saved.status,'paused');assert.deepEqual(reminders(saved),[]);
    assert.equal(dateBR(saved.due_date),'A confirmar');assert(needsReview(saved));
    for(const invalid of [{status:'active'},{status:'active',due_date:'2026-12-15'},{status:'active',recurrence_months:12}]){
      await assert.rejects(db.query('select save_not_service($1,$2,$3,1)',[ids.workspace,ids.service,{...incomplete,...invalid}]),/not_services_schedule_required/);
    }
    await assert.rejects(db.query("select renew_not_service($1,$2,1,'2026-01-01','2027-01-01',null)",[ids.workspace,ids.service]),/Only active/);
    await db.query('select save_not_service($1,$2,$3,1)',[ids.workspace,ids.service,serviceData]);
    assert.equal((await db.query('select count(*)::int as n from not_service_events')).rows[0].n,2);
    await asUser(db,ids.other);
    assert.equal((await db.query('select count(*)::int as n from not_services')).rows[0].n,0);
  }finally{await db.close();}
});

test('review marker and ordering support imported records without losing unknown dates',()=>{
  const known={name:'Known',due_date:'2026-09-01',recurrence_months:12,notes:''};
  const unknown={...known,name:'Unknown',due_date:null};
  assert.deepEqual([unknown,known].sort(compareServices),[known,unknown]);
  assert(!needsReview(known));assert(needsReview({...known,notes:'[REVISAR] Conferir origem'}));
  assert.deepEqual(reminders({...known,status:'active',due_date:null}),[]);
});
