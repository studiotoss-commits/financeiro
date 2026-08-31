import React,{useRef,useState} from 'react';
import {supabase} from '../../services/supabase';
import Icon from '../../components/Icon';

export default function ClientActions({client,workspaceId,canDelete,enabled,onClose,onApplied}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState(null),[confirmation,setConfirmation]=useState('');
  const dialogRef=useRef(null);
  function keyboard(event){if(event.key==='Escape'&&!busy){event.preventDefault();onClose();}if(event.key==='Tab'){const items=[...dialogRef.current.querySelectorAll('button:not([disabled]),input:not([disabled])')];const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}
  const restoring=!!client.appArchivedAt;
  async function request(name,args){const result=await supabase.rpc(name,args);if(result.error)throw result.error;return result.data;}
  async function run(action){
    if(!enabled||busy||error)return;
    setBusy(true);
    try{await action();}
    catch(e){setError(/impact changed/i.test(e.message)?'Os registros mudaram desde a conferência. Feche esta janela e confira o impacto novamente.':/owner|access/i.test(e.message)?'Somente o proprietário com acesso ao Financeiro pode excluir pela central.':'Não foi possível confirmar a operação. Atualize os dados antes de tentar novamente.');}
    finally{setBusy(false);}
  }
  const archive=()=>run(async()=>{await request('set_client_app_archived',{p_workspace_id:workspaceId,p_client_id:client.id,p_app_id:'financeiro',p_archived:!restoring,p_expected_revision:client._appRevision||0});await onApplied();});
  const inspect=()=>run(async()=>{setPreview(await request('client_delete_preview',{p_workspace_id:workspaceId,p_client_id:client.id}));setConfirmation('');});
  const permanentlyDelete=()=>run(async()=>{await request('delete_client_from_central',{p_workspace_id:workspaceId,p_client_id:client.id,p_token:preview.token,p_confirmation:confirmation});await onApplied();});
  return <div className="fx-overlay"><div className="fx-modal fx-client-actions" ref={dialogRef} onKeyDown={keyboard} role="dialog" aria-modal="true" aria-labelledby="client-actions-title" style={{width:'min(540px,100%)'}}>
    <div className="fx-modal-body">
      <h2 id="client-actions-title">{preview?'Excluir definitivamente da central?':restoring?'Restaurar cliente no Financeiro?':'Arquivar cliente no Financeiro?'}</h2>
      <p><strong>{client.tradeName||client.name}</strong></p>
      {!preview?<><p>{restoring?'O cadastro, contratos e lançamentos voltarão às telas do Financeiro, com os dados anteriores.':'O cadastro, contratos e lançamentos serão arquivados somente no Financeiro e sairão das telas operacionais e dos totais.'}</p><p>Nada será apagado. O cliente continuará na central e os registros do NOT e dos demais apps não serão alterados.</p>{canDelete&&<div style={{borderTop:'1px solid var(--line)',paddingTop:16,marginTop:8}}><strong>Exclusão definitiva · Central BASE</strong><p>Apaga o cadastro e os registros vinculados de todos os apps conectados. Disponível somente aqui, para o proprietário.</p><button className="fx-btn danger-outline" disabled={!enabled||busy||!!error} onClick={inspect}>Conferir exclusão definitiva</button></div>}</>:<><p>Esta ação não pode ser desfeita pelo sistema. Serão excluídos:</p><ul><li>O cadastro compartilhado do cliente.</li><li>{preview.finance_entries} lançamentos do Financeiro, incluindo registros derivados.</li><li>{preview.finance_profiles} perfil financeiro, com seus contratos e histórico comercial.</li><li>{preview.not_services} serviços e {preview.not_events} eventos de histórico do NOT.</li></ul><p>Os outros clientes e os fornecedores serão preservados. Links para documentos externos serão removidos do cadastro; os arquivos externos não serão apagados.</p><label className="fx-field">Digite exatamente o nome abaixo para confirmar:<strong>{preview.name}</strong><input className="fx-input" aria-label="Nome do cliente para excluir definitivamente" autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)} onInput={e=>setConfirmation(e.target.value)}/></label></>}
      {!enabled&&<p role="status">Aguarde a sincronização das alterações do Financeiro antes de continuar.</p>}
      {error&&<p role="alert">{error}</p>}
    </div><div className="fx-modal-foot"><button className="fx-modal-cancel" autoFocus disabled={busy} onClick={onClose}>Cancelar</button>{error?<button className="fx-modal-save" onClick={async()=>{setBusy(true);try{await onApplied();}catch{setError('A atualização falhou. Tente atualizar os dados novamente.');}finally{setBusy(false);}}} disabled={busy}>Atualizar dados</button>:preview?<button className="fx-modal-save danger" disabled={!enabled||busy||confirmation!==preview.name} onClick={permanentlyDelete}>{busy?'Excluindo…':'Excluir de todos os apps'}</button>:<button className="fx-modal-save" disabled={!enabled||busy} onClick={archive}><Icon name={restoring?'refresh':'trash'} size={16}/>{busy?'Aguarde…':restoring?'Restaurar no Financeiro':'Arquivar só no Financeiro'}</button>}</div>
  </div></div>;
}
