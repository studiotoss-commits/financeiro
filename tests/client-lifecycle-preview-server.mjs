// Apenas desenvolvimento local: banco descartável com dados fictícios; nunca chama Supabase.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {makeDatabase,asUser,ids,serviceData} from './not-database.mjs';
import {todayISO,addDays} from '../apps/notificacoes-vencimentos/src/domain.js';
const db=await makeDatabase();
await db.exec(await fs.readFile(new URL('../supabase/migrations/202608300003_not_incomplete_services.sql',import.meta.url),'utf8'));
await db.exec(await fs.readFile(new URL('../supabase/migrations/202608300004_client_lifecycle.sql',import.meta.url),'utf8'));
await asUser(db,ids.owner);
await db.query('select activate_not_workspace($1)',[ids.workspace]);
for(const [index,days,kind,name] of [[1,-4,'hosting','Hospedagem institucional'],[2,2,'domain','Domínio principal'],[3,15,'email','E-mail da equipe'],[4,45,'toss','Suporte TOSS']]){
  await db.query('select save_not_service($1,$2,$3,$4)',[ids.workspace,`40000000-0000-0000-0000-${String(index).padStart(12,'0')}`,{...serviceData,kind,name,due_date:addDays(todayISO(),days),amount_cents:kind==='domain'?4000:kind==='email'?null:24900},0]);
}

const user={id:ids.owner,aud:'authenticated',role:'authenticated',email:'teste@example.test',user_metadata:{name:'Teste NOT'},created_at:new Date().toISOString()};
const token=`${Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:ids.owner,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.local-test-only`;
const session={access_token:token,refresh_token:'local-test',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
const tables=new Set(['finance_workspaces','finance_workspace_members','base_app_members','base_clients','not_services','not_service_events','base_client_app_state']);
const rpcArgs={bootstrap_finance_workspace:['workspace_name'],load_finance_snapshot:['p_workspace_id'],save_finance_state:['p_workspace_id','p_state','p_expected_revision'],set_client_app_archived:['p_workspace_id','p_client_id','p_app_id','p_archived','p_expected_revision'],client_delete_preview:['p_workspace_id','p_client_id'],delete_client_from_central:['p_workspace_id','p_client_id','p_token','p_confirmation'],activate_not_workspace:['p_workspace_id','p_name'],save_base_client:['p_workspace_id','p_client_id','p_payload','p_status','p_archived','p_expected_revision'],save_not_service:['p_workspace_id','p_id','p_data','p_expected_revision'],renew_not_service:['p_workspace_id','p_id','p_expected_revision','p_paid_on','p_next_due','p_amount_cents']};
const root=path.resolve('.local-backups/client-lifecycle-ui');
http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5187');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value,(key,item)=>key==='due_date'&&typeof item==='string'?item.slice(0,10):item));};
  try{
    const url=new URL(req.url,'http://127.0.0.1:5187');
    if(url.pathname.startsWith('/auth/v1/token'))return send(session);
    if(url.pathname==='/auth/v1/user')return send(user);
    if(url.pathname==='/auth/v1/logout')return send({});
    if(url.pathname.startsWith('/rest/v1/rpc/')){
      const name=url.pathname.split('/').pop();if(!rpcArgs[name])return send({message:'RPC unavailable'},404);
      let body='';for await(const chunk of req)body+=chunk;const args=JSON.parse(body);const keys=rpcArgs[name];
      const result=await db.query(`select to_jsonb(${name}(${keys.map((_,i)=>`$${i+1}`).join(',')})) as data`,keys.map(k=>args[k]??null));return send(result.rows[0].data);
    }
    if(url.pathname.startsWith('/rest/v1/')){
      const name=url.pathname.split('/').pop();if(!tables.has(name))return send({message:'Table unavailable'},404);
      const where=[],values=[];for(const [key,value] of url.searchParams)if(['user_id','workspace_id','service_id','app_id'].includes(key)&&value.startsWith('eq.')){values.push(value.slice(3));where.push(`${key}=$${values.length}`);}
      let rows=(await db.query(`select * from ${name}${where.length?' where '+where.join(' and '):''}`,values)).rows;
      const [order,direction]=String(url.searchParams.get('order')||'').split('.');if(['name','created_at','due_date'].includes(order))rows.sort((a,b)=>String(a[order]).localeCompare(String(b[order]))*(direction==='desc'?-1:1));
      return send(rows);
    }
    let relative=decodeURIComponent(url.pathname).replace(/^\//,'');if(!relative||!path.extname(relative))relative=url.pathname.startsWith('/not')?'not/index.html':'index.html';
    const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)&&file!==root)return send({},403);
    const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(content);
  }catch(error){send({message:error.message},400);}
}).listen(5187,'127.0.0.1',()=>console.log('NOT local: http://127.0.0.1:5187/not/ · teste@example.test · senha fictícia'));
