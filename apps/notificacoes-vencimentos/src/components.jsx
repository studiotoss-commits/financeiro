import React,{useEffect,useRef,useState} from 'react';
import {Icon} from '@base/design-system';
import * as repo from './repository';
import {KINDS,CADENCES,STATUSES,DEFAULT_TEMPLATE,emptyService,parseMoney,money,dateBR,todayISO,addMonths,safeLink,reminders,messagePreview,userError} from './domain';

export function Modal({title,subtitle,onClose,children,wide=false}){
  const ref=useRef(null);
  useEffect(()=>{const element=ref.current;element.showModal();return()=>element.close();},[]);
  return <dialog ref={ref} className={`not-modal ${wide?'wide':''}`} onCancel={event=>{event.preventDefault();onClose();}}>
    <header><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="not-icon" aria-label="Fechar janela" onClick={onClose}><Icon name="x"/></button></header>{children}
  </dialog>;
}
export function Field({label,children,wide=false,hint}){return <label className={`not-field ${wide?'wide':''}`}><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function Empty({title,children,action}){return <div className="not-empty"><span className="not-empty-icon"><Icon name="bell" size={30}/></span><h3>{title}</h3><p>{children}</p>{action}</div>;}
export function ErrorBox({error,draft}){
  const download=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='not-rascunho.json';a.click();URL.revokeObjectURL(url);};
  return error?<div className="not-error" role="alert"><p>{error}</p>{draft&&<button type="button" className="not-button secondary" onClick={download}>Baixar rascunho</button>}</div>:null;
}
const discard=onClose=>()=>{if(window.confirm('Fechar este formulário? Alterações não salvas serão descartadas.'))onClose();};
export function ClientForm({workspace,client,onClose,onSaved}){
  const [form,setForm]=useState(()=>client||{id:crypto.randomUUID(),payload:{name:'',cnpj:'',email:'',phone:'',fin:{name:'',email:''}},revision:0,status:'Ativo'});
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const change=key=>e=>setForm(c=>({...c,payload:{...c.payload,[key]:e.target.value}}));
  const contact=key=>e=>setForm(c=>({...c,payload:{...c.payload,fin:{...c.payload.fin,[key]:e.target.value}}}));
  async function submit(event){event.preventDefault();setBusy(true);setError('');try{onSaved(await repo.saveClient(workspace.id,form));}catch(e){setError(userError(e));}finally{setBusy(false);}}
  const close=()=>{if(!busy)discard(onClose)();};
  return <Modal title={client?'Editar cliente do BASE':'Novo cliente do BASE'} subtitle="Cadastro compartilhado. Não cria uma cópia no NOT." onClose={close}><form onSubmit={submit}><div className="not-modal-body not-form-grid">
    <Field label="Nome / razão social *" wide><input required maxLength={160} value={form.payload.name||''} onChange={change('name')} autoFocus/></Field>
    <Field label="Nome fantasia"><input maxLength={160} value={form.payload.tradeName||''} onChange={change('tradeName')}/></Field>
    <Field label="CPF/CNPJ"><input value={form.payload.cnpj||''} onChange={change('cnpj')} maxLength={20}/></Field>
    <Field label="E-mail principal"><input type="email" value={form.payload.email||''} onChange={change('email')}/></Field>
    <Field label="Telefone / WhatsApp"><input type="tel" value={form.payload.phone||''} onChange={change('phone')} maxLength={40}/></Field>
    <Field label="Contato financeiro"><input value={form.payload.fin?.name||''} onChange={contact('name')} maxLength={160}/></Field>
    <Field label="E-mail financeiro"><input type="email" value={form.payload.fin?.email||''} onChange={contact('email')}/></Field>
    <div className="wide"><ErrorBox error={error} draft={form}/></div>
  </div><footer><button type="button" className="not-button secondary" onClick={close} disabled={busy}>Cancelar</button><button className="not-button" disabled={busy}>{busy?'Salvando…':'Salvar na central'}</button></footer></form></Modal>;
}

export function ServiceForm({workspace,service,clients,onClientSaved,onClose,onSaved}){
  const [form,setForm]=useState(()=>service||emptyService());
  const [amount,setAmount]=useState(()=>service?.amount_cents==null?'':(service.amount_cents/100).toFixed(2).replace('.',','));
  const [days,setDays]=useState(()=>(service?.reminder_days||[30,15,2]).join(', '));
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[newClient,setNewClient]=useState(false);
  const change=key=>e=>setForm(c=>({...c,[key]:e.target.value}));
  const available=clients.filter(c=>!c.archived_at||c.id===form.client_id);
  const close=()=>{if(!busy)discard(onClose)();};
  async function submit(event){
    event.preventDefault();setError('');
    let record;
    try{
      const offsets=days.split(',').map(s=>Number(s.trim()));
      if(offsets.length<1||offsets.length>6||offsets.some(n=>!Number.isInteger(n)||n<1||n>90)||new Set(offsets).size!==offsets.length)throw new Error('Informe de 1 a 6 avisos diferentes, entre 1 e 90 dias, separados por vírgula.');
      for(const key of ['payment_url','panel_url','document_url'])if(form[key]&&!safeLink(form[key]))throw new Error('Use links HTTPS completos, sem usuário ou senha na URL.');
      record={...form,amount_cents:parseMoney(amount),recurrence_months:Number(form.recurrence_months),reminder_days:offsets.sort((a,b)=>b-a)};
    }catch(e){setError(e.message);return;}
    setBusy(true);try{onSaved(await repo.saveService(workspace.id,record));}catch(e){setError(userError(e));}finally{setBusy(false);}
  }
  return <><Modal title={service?'Editar serviço':'Novo serviço'} subtitle="Um serviço, um vencimento e o cliente da central BASE." onClose={close} wide><form onSubmit={submit}>
    <div className="not-modal-body not-form-grid">
      <div className="wide not-client-select"><Field label="Cliente *"><select required value={form.client_id} onChange={change('client_id')} autoFocus><option value="">Selecione um cliente do BASE</option>{available.map(c=><option key={c.id} value={c.id}>{c.payload.tradeName||c.name}{c.archived_at?' · arquivado':''}</option>)}</select></Field><button type="button" className="not-button secondary" onClick={()=>setNewClient(true)}><Icon name="plus" size={16}/>Novo cliente</button></div>
      <Field label="Serviço *"><input required value={form.name} onChange={change('name')} maxLength={160} placeholder="Renovação do domínio institucional"/></Field>
      <Field label="Tipo"><select value={form.kind} onChange={change('kind')}>{Object.entries(KINDS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>
      <Field label="Domínio / identificação"><input value={form.identifier} onChange={change('identifier')} maxLength={250} placeholder="cliente.com.br"/></Field>
      <Field label="Fornecedor"><input value={form.provider} onChange={change('provider')} maxLength={160} placeholder="Registro.br, Hostinger, TOSS…"/></Field>
      <Field label="Pagamento para"><input value={form.payee} onChange={change('payee')} maxLength={160} placeholder="TOSS ou nome da empresa responsável"/></Field>
      <Field label="Valor previsto (R$)" hint="Deixe vazio se ainda precisa confirmar."><input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="149,90"/></Field>
      <Field label="Próximo vencimento *"><input type="date" required min="2000-01-01" max="2200-12-31" value={form.due_date} onChange={change('due_date')} onInput={change('due_date')}/></Field>
      <Field label="Recorrência"><select value={form.recurrence_months} onChange={change('recurrence_months')}>{Object.entries(CADENCES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>
      <Field label="Situação do serviço"><select value={form.status} onChange={change('status')}>{Object.entries(STATUSES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>
      <Field label="Avisar quantos dias antes?" hint="Até 6 prazos, de 1 a 90 dias. Exemplo: 30, 15, 2."><input required value={days} onChange={e=>setDays(e.target.value)}/></Field>
      <Field label="Link de pagamento" wide><input type="url" value={form.payment_url} onChange={change('payment_url')} maxLength={2000} placeholder="https://…"/></Field>
      <Field label="Link do painel" wide><input type="url" value={form.panel_url} onChange={change('panel_url')} maxLength={2000} placeholder="https://…"/></Field>
      <Field label="Documento de acessos no Drive" wide hint="Salve apenas o link. Não cadastre senhas. O documento não entra na mensagem por padrão."><input type="url" value={form.document_url} onChange={change('document_url')} maxLength={2000} placeholder="https://drive.google.com/…"/></Field>
      <div className="not-section-label wide">Contato específico deste serviço <small>Campos vazios usam o contato financeiro da central.</small></div>
      <Field label="Nome do contato"><input value={form.contact_name} onChange={change('contact_name')} maxLength={160}/></Field>
      <Field label="E-mail do contato"><input type="email" value={form.contact_email} onChange={change('contact_email')} maxLength={254}/></Field>
      <Field label="WhatsApp do contato"><input type="tel" value={form.contact_whatsapp} onChange={change('contact_whatsapp')} maxLength={40}/></Field>
      <Field label="Observações internas" wide><textarea rows={3} value={form.notes} onChange={change('notes')} maxLength={4000}/></Field>
      <details className="wide not-template"><summary>Personalizar mensagem</summary><p>Use {'{cliente}, {contato}, {servico}, {identificador}, {vencimento}, {valor}, {beneficiario}, {fornecedor}, {link_pagamento}, {link_painel}'}. Deixe vazio para usar o modelo TOSS.</p><textarea aria-label="Modelo personalizado" rows={8} maxLength={5000} value={form.message_template} placeholder={DEFAULT_TEMPLATE} onChange={change('message_template')}/></details>
      <div className="wide"><ErrorBox error={error} draft={{...form,amount,days}}/></div>
    </div><footer><span className="not-foot-note">Nenhuma mensagem será enviada.</span><button type="button" className="not-button secondary" onClick={close} disabled={busy}>Cancelar</button><button className="not-button" disabled={busy}>{busy?'Salvando…':'Salvar serviço'}</button></footer>
  </form></Modal>{newClient&&<ClientForm workspace={workspace} onClose={()=>setNewClient(false)} onSaved={client=>{onClientSaved(client);setForm(f=>({...f,client_id:client.id}));setNewClient(false);}}/>}</>;
}

export function RenewalForm({workspace,service,onClose,onSaved}){
  const [paidOn,setPaidOn]=useState(todayISO()),[nextDue,setNextDue]=useState(service.recurrence_months?addMonths(service.due_date,service.recurrence_months):'');
  const [amount,setAmount]=useState(service.amount_cents==null?'':(service.amount_cents/100).toFixed(2).replace('.',','));
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(event){event.preventDefault();let cents;try{cents=parseMoney(amount);}catch(e){setError(e.message);return;}setBusy(true);setError('');try{onSaved(await repo.renew(workspace.id,service,paidOn,nextDue,cents));}catch(e){setError(userError(e));}finally{setBusy(false);}}
  return <Modal title="Confirmar pagamento / renovação" subtitle={service.name} onClose={()=>!busy&&onClose()}><form onSubmit={submit}><div className="not-modal-body not-form-grid">
    <p className="wide not-hint">Vencimento atual: <strong>{dateBR(service.due_date)}</strong>. Esta confirmação registra o histórico no NOT; não lança pagamento no Financeiro.</p>
    <Field label="Data do pagamento *"><input type="date" min="2000-01-01" max={todayISO()} required value={paidOn} onChange={e=>setPaidOn(e.target.value)} onInput={e=>setPaidOn(e.target.value)}/></Field>
    <Field label="Valor pago (R$)"><input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="A confirmar"/></Field>
    <Field label="Próximo vencimento" wide hint={service.recurrence_months?'Confira a data sugerida antes de confirmar.':'Deixe vazio para concluir o serviço pontual.'}><input type="date" required={service.recurrence_months>0} max="2200-12-31" value={nextDue} onChange={e=>setNextDue(e.target.value)} onInput={e=>setNextDue(e.target.value)}/></Field>
    <div className="wide"><ErrorBox error={error} draft={{paidOn,nextDue,amount}}/></div>
  </div><footer><button type="button" className="not-button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="not-button" disabled={busy}>{busy?'Registrando…':'Confirmar e registrar'}</button></footer></form></Modal>;
}

export function ServiceDetail({workspace,service,client,onClose,onEdit,onRenew}){
  const [events,setEvents]=useState([]),[historyError,setHistoryError]=useState(''),[includeDoc,setIncludeDoc]=useState(false);
  useEffect(()=>{let active=true;repo.history(workspace.id,service.id).then(rows=>active&&setEvents(rows)).catch(()=>active&&setHistoryError('Não foi possível carregar o histórico. Feche e abra novamente.'));return()=>{active=false;};},[workspace.id,service.id,service.revision]);
  const preview=messagePreview(service,client,includeDoc);
  return <Modal title={service.name} subtitle={`${client?.payload.tradeName||client?.name||'Cliente'} · ${KINDS[service.kind]}`} onClose={onClose} wide>
    <div className="not-modal-body">
      <div className="not-detail-grid"><div><small>Vencimento</small><strong>{dateBR(service.due_date)}</strong></div><div><small>Valor previsto</small><strong>{money(service.amount_cents)}</strong></div><div><small>Fornecedor</small><strong>{service.provider||'A confirmar'}</strong></div><div><small>Pagamento para</small><strong>{service.payee||'A confirmar'}</strong></div></div>
      <div className="not-inline-links">{[['Pagamento',service.payment_url],['Painel do fornecedor',service.panel_url],['Documento de acessos',service.document_url]].filter(([,url])=>safeLink(url)).map(([label,url])=><a key={label} href={url} target="_blank" rel="noopener noreferrer">{label}<Icon name="arrow-up-right" size={15}/></a>)}</div>
      {client?.archived_at&&<p className="not-notice">Cliente arquivado na central. O serviço continua ativo até você pausá-lo ou cancelá-lo no NOT.</p>}
      {service.notes&&<section><h3>Observações internas</h3><p className="not-preserve">{service.notes}</p></section>}
      <section><h3>Prévias de lembretes</h3><p className="not-hint">Envios desativados. Datas passadas não significam que o cliente foi avisado.</p><div className="not-reminder-chips">{reminders(service).map(r=><div key={r.days}><strong>{r.days} dias antes</strong><span>{dateBR(r.date)}</span><small>{r.label}</small></div>)}{service.status!=='active'&&<p>Serviço {STATUSES[service.status].toLowerCase()}: sem lembretes previstos.</p>}</div></section>
      <section><h3>Mensagem personalizada</h3><p className="not-hint">E-mail: {preview.contact.email||'não informado'} · WhatsApp: {preview.contact.whatsapp||'não informado'}</p>{service.document_url&&<label className="not-check"><input type="checkbox" checked={includeDoc} onChange={e=>setIncludeDoc(e.target.checked)}/>Incluir link do documento nesta prévia (confira a permissão de acesso)</label>}<div className="not-message"><strong>{preview.subject}</strong><pre>{preview.body}</pre></div><p className="not-hint">Somente visualização. Nenhum envio ou agendamento externo foi realizado.</p></section>
      <section><h3>Histórico do serviço</h3><ErrorBox error={historyError}/>{!events.length&&!historyError&&<p className="not-hint">Carregando histórico…</p>}<ol className="not-history">{events.map(e=><li key={e.id}><strong>{e.kind==='renewed'?'Pagamento / renovação confirmado':e.kind==='created'?'Serviço cadastrado':'Serviço atualizado'}</strong><small>{new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(e.created_at))}</small>{e.kind==='renewed'&&<p>{dateBR(e.payload.previous_due)} → {e.payload.next_due?dateBR(e.payload.next_due):'Serviço concluído'} · {money(e.payload.amount_cents)} · pago em {dateBR(e.payload.paid_on)}</p>}</li>)}</ol></section>
    </div><footer><button className="not-button secondary" onClick={onEdit}><Icon name="pencil" size={16}/>Editar serviço</button>{service.status==='active'&&<button className="not-button" onClick={onRenew}><Icon name="circle-check" size={16}/>Confirmar renovação</button>}</footer>
  </Modal>;
}

