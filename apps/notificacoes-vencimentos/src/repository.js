import { supabase } from '@base/autenticacao/supabase';
const checked=result=>{if(result.error){console.error('NOT: falha na operação',{code:result.error.code,message:result.error.message});throw result.error;}return result.data;};
export async function listWorkspaces(userId){
  const [workspaces,members,apps]=await Promise.all([
    supabase.from('finance_workspaces').select('id,name').order('created_at'),
    supabase.from('finance_workspace_members').select('workspace_id,role').eq('user_id',userId),
    supabase.from('base_app_members').select('workspace_id,app_id').eq('user_id',userId),
  ]);
  const memberships=checked(members),access=checked(apps);
  return checked(workspaces).map(w=>({...w,owner:memberships.some(m=>m.workspace_id===w.id&&m.role==='owner'),enabled:access.some(a=>a.workspace_id===w.id&&a.app_id==='not')}));
}
export async function activate(workspaceId,name){return checked(await supabase.rpc('activate_not_workspace',{p_workspace_id:workspaceId||null,p_name:name||'BASE'}));}
export async function loadNot(workspaceId){
  const [clients,services]=await Promise.all([
    supabase.from('base_clients').select('*').eq('workspace_id',workspaceId).order('name'),
    supabase.from('not_services').select('*').eq('workspace_id',workspaceId).order('due_date'),
  ]);
  return {clients:checked(clients),services:checked(services)};
}
export async function history(workspaceId,serviceId){return checked(await supabase.from('not_service_events').select('*').eq('workspace_id',workspaceId).eq('service_id',serviceId).order('created_at',{ascending:false}).limit(100));}
export async function saveService(workspaceId,service){return checked(await supabase.rpc('save_not_service',{p_workspace_id:workspaceId,p_id:service.id,p_data:service,p_expected_revision:service.revision}));}
export async function renew(workspaceId,service,paidOn,nextDue,amountCents){return checked(await supabase.rpc('renew_not_service',{p_workspace_id:workspaceId,p_id:service.id,p_expected_revision:service.revision,p_paid_on:paidOn,p_next_due:nextDue||null,p_amount_cents:amountCents}));}
export async function saveClient(workspaceId,client){
  const revision=checked(await supabase.rpc('save_base_client',{p_workspace_id:workspaceId,p_client_id:client.id,p_payload:client.payload,p_status:client.status||'Ativo',p_archived:!!client.archived_at,p_expected_revision:client.revision||0}));
  return {...client,revision,name:client.payload.name,workspace_id:workspaceId};
}
