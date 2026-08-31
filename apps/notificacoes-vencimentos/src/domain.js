export const KINDS={domain:'Domínio',hosting:'Hospedagem',email:'E-mail',toss:'Serviço TOSS',other:'Outro serviço'};
export const CADENCES={0:'Pontual',1:'Mensal',3:'Trimestral',6:'Semestral',12:'Anual',24:'A cada 2 anos',36:'A cada 3 anos'};
export const STATUSES={active:'Ativo',paused:'Pausado',canceled:'Cancelado',completed:'Concluído'};
export const DEFAULT_TEMPLATE='Olá, {contato}!\n\nLembramos que {servico} ({identificador}) vence em {vencimento}.\nValor previsto: {valor}.\nPagamento para: {beneficiario}.\nFornecedor: {fornecedor}.\n\n{link_pagamento}\n{link_painel}\n\nSe já realizou o pagamento, por favor confirme com a TOSS para atualizarmos o controle.\n\nEquipe TOSS';
export const todayISO=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const utcDay=s=>new Date(`${s}T12:00:00Z`);
export const dateBR=s=>s?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(utcDay(s)):'A confirmar';
export const needsReview=service=>!service.due_date||service.recurrence_months==null||service.notes?.includes('[REVISAR]');
export const compareServices=(a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999')||a.name.localeCompare(b.name);
export const money=cents=>cents===null||cents===undefined?'A confirmar':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const daysUntil=(date,today=todayISO())=>Math.round((utcDay(date)-utcDay(today))/86400000);
export function addDays(date,days){const d=utcDay(date);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function addMonths(date,months){const d=utcDay(date);const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+Number(months));const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,end));return d.toISOString().slice(0,10);}
export function parseMoney(value){if(value.trim()==='')return null;if(!/^\d+(?:,\d{1,2})?$/.test(value.trim()))throw new Error('Informe o valor sem pontos de milhar, por exemplo: 149,90.');const [whole,decimal='']=value.trim().split(',');const cents=Number(whole)*100+Number(decimal.padEnd(2,'0'));if(!Number.isSafeInteger(cents)||cents>99999999999)throw new Error('Valor acima do limite permitido.');return cents;}
export function urgency(service,today=todayISO()){
  if(service.client_archived_at)return {label:'Arquivado no NOT',tone:'muted',group:'archived'};
  if(service.status!=='active')return {label:STATUSES[service.status],tone:'muted',group:'inactive'};
  const days=daysUntil(service.due_date,today);
  if(days<0)return {label:`Vencido há ${-days} dia${days===-1?'':'s'}`,tone:'danger',group:'overdue'};
  if(days===0)return {label:'Vence hoje',tone:'danger',group:'urgent'};
  return {label:`Em ${days} dia${days===1?'':'s'}`,tone:days<=2?'danger':days<=15?'warning':days<=30?'accent':'success',group:days<=2?'urgent':days<=30?'upcoming':'later'};
}
export function reminders(service,today=todayISO()){
  if(service.client_archived_at||service.status!=='active'||!service.due_date||service.recurrence_months==null)return [];
  return service.reminder_days.map(days=>{const date=addDays(service.due_date,-days);return {days,date,label:date===today?'Previsto para hoje':date<today?'Data já passou · sem envio':'Prévia programada'};});
}
export function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function contactFor(service,client){const p=client?.payload||{};return {name:service.contact_name||p.fin?.name||p.resp?.name||client?.name||'cliente',email:service.contact_email||p.fin?.email||p.email||p.resp?.email||'',whatsapp:service.contact_whatsapp||p.fin?.whatsapp||p.fin?.phone||p.whatsapp||p.phone||''};}
export function messagePreview(service,client,includeDocument=false){
  const contact=contactFor(service,client);
  const values={cliente:client?.name||'Cliente',contato:contact.name,servico:service.name,identificador:service.identifier||KINDS[service.kind],vencimento:dateBR(service.due_date),valor:money(service.amount_cents),beneficiario:service.payee||'A confirmar',fornecedor:service.provider||'A confirmar',link_pagamento:safeLink(service.payment_url)?`Pagamento: ${service.payment_url}`:'Link de pagamento: a confirmar',link_painel:safeLink(service.panel_url)?`Painel: ${service.panel_url}`:''};
  let body=(service.message_template||DEFAULT_TEMPLATE).replace(/\{([a-z_]+)\}/g,(match,key)=>values[key]??match);
  if(includeDocument&&safeLink(service.document_url))body+=`\n\nDocumento de acessos (verifique a permissão no Drive): ${service.document_url}`;
  return {subject:`Lembrete de vencimento · ${service.name} · ${dateBR(service.due_date)}`,body,contact};
}
export const emptyService=()=>({id:crypto.randomUUID(),client_id:'',name:'',kind:'domain',identifier:'',provider:'',payee:'',amount_cents:null,recurrence_months:12,due_date:'',status:'active',payment_url:'',panel_url:'',document_url:'',contact_name:'',contact_email:'',contact_whatsapp:'',reminder_days:[30,15,2],message_template:'',notes:'',revision:0});
export function userError(error){const text=String(error?.message||error);if(/changed|revision/i.test(text))return 'Este registro mudou em outra sessão. Recarregue os dados antes de tentar novamente; seu formulário continua aberto.';if(/document already/i.test(text))return 'Já existe um cliente com esse CPF/CNPJ na central.';if(/active central client/i.test(text))return 'Escolha um cliente não arquivado da central.';if(/access denied|owner|permission/i.test(text))return 'Seu usuário não tem permissão para esta operação nesta empresa.';if(/HTTPS/i.test(text))return 'Use links HTTPS completos e sem usuário ou senha na URL.';if(/Next due/i.test(text))return 'O próximo vencimento precisa ser posterior ao atual.';if(/payment date/i.test(text))return 'Informe a data do pagamento, sem usar uma data futura.';if(/schema cache|does not exist/i.test(text))return 'O NOT ainda não foi habilitado neste ambiente. Solicite a atualização do banco.';return 'Não foi possível concluir a operação. Se houver alterações no formulário, baixe o rascunho antes de recarregar.';}
