// Servidor de teste local. Nunca aponta para Supabase nem carrega dados reais.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();
const root=path.resolve('.local-backups/central-ui');
const user={id:'10000000-0000-0000-0000-000000000001',email:'teste@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{name:'Teste local'},created_at:new Date().toISOString()};
await db.exec(`create role authenticated; create role anon; create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select '${user.id}'::uuid$$;
grant usage on schema auth,public to authenticated; grant execute on function auth.uid() to authenticated;`);
await db.exec((await fs.readFile('apps/financeiro/supabase/migrations/202608090001_financeiro_mvp.sql','utf8')).replace('create extension if not exists pgcrypto;',''));
await db.query('insert into auth.users values($1)',[user.id]);
const workspace=(await db.query("select bootstrap_finance_workspace('BASE — Teste local') as id")).rows[0].id;
const client={id:'30000000-0000-0000-0000-000000000001',name:'Empresa Exemplo',tradeName:'Exemplo',status:'Ativo',cnpj:'',segment:'Teste',since:'2026-08',resp:{name:'Contato fictício',email:'contato@example.test'},contracts:[],renewals:[],interactions:[]};
await db.query('insert into finance_clients(id,workspace_id,name,payload) values($1,$2,$3,$4)',[client.id,workspace,client.name,client]);
await db.exec(await fs.readFile('supabase/migrations/202608300001_central_clientes.sql','utf8'));
await db.exec('set role authenticated');
const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+86400})+'.local-test-signature';
const server=http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5186');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  try{
    const url=new URL(req.url,'http://127.0.0.1:5186');
    if(url.pathname.startsWith('/auth/v1/token')){send({access_token:token,token_type:'bearer',expires_in:86400,refresh_token:'local-refresh',user});return;}
    if(url.pathname==='/auth/v1/user'){send(user);return;}
    if(url.pathname==='/auth/v1/logout'){send({});return;}
    if(url.pathname.startsWith('/rest/v1/rpc/')){
      if(req.headers.authorization!==`Bearer ${token}`){send({message:'Local authentication required'},401);return;}
      const chunks=[];for await(const chunk of req)chunks.push(chunk);const args=JSON.parse(Buffer.concat(chunks).toString()||'{}');
      const rpc=url.pathname.split('/').pop();
      const contract={bootstrap_finance_workspace:['workspace_name'],load_finance_snapshot:['p_workspace_id'],save_finance_state:['p_workspace_id','p_state','p_expected_revision']}[rpc];
      if(!contract){send({message:'Unknown test RPC'},404);return;}
      const result=await db.query(`select public.${rpc}(${contract.map((k,i)=>'$'+(i+1)).join(',')}) as data`,contract.map(k=>args[k]));
      send(result.rows[0].data);return;
    }
    const candidate=path.resolve(root,'.'+url.pathname);if(!candidate.startsWith(root+path.sep)&&candidate!==root){send({},403);return;}
    let file=candidate;try{if(!(await fs.stat(file)).isFile())file=path.join(root,'index.html');}catch{file=path.join(root,'index.html');}
    const types={'.html':'text/html','.js':'application/javascript','.css':'text/css'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(await fs.readFile(file));
  }catch(error){send({message:error.message,code:'TEST_ERROR'},400);}
});
server.listen(5186,'127.0.0.1',()=>console.log('Prévia isolada: http://127.0.0.1:5186 — dados fictícios; login teste@example.test'));
