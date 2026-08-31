import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import ConfirmDelete from './ClientActions';
import { brl0, CADENCE_LABEL, clientLTV, clientMRR, clientTicket, fmtSince } from '../../lib/core';

// clientes.jsx — BASE Financeiro: Cadastros › Clientes (ranking, lista, detalhe, modal).

const initials = (name) => name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const statusClass = (s) => s === 'Recorrente' ? 'indigo' : s === 'Ativo' ? 'pos' : s === 'Prospect' ? 'amber' : '';
const clientEntries = (client, entries = []) => entries.filter((e) => e.type === 'income' && (String(e.clientId) === String(client.id) || e.entity?.trim().toLowerCase() === client.name.trim().toLowerCase()));
const revenueStats = (client, entries) => {
  const rows = clientEntries(client, entries);
  const revenue = rows.reduce((sum, e) => sum + e.amount, 0);
  const products = rows.reduce((map, e) => { const key = e.service || e.desc; map[key] = (map[key] || 0) + 1; return map; }, {});
  return { revenue, orders: rows.length, ticket: rows.length ? revenue / rows.length : 0, top: Object.entries(products).sort((a, b) => b[1] - a[1])[0]?.[0] || '—', profile: rows.length > 1 ? 'Recorrente' : rows.length === 1 ? 'Pontual' : 'Sem receita' };
};

const rankedClients = (clients, entries) => clients.filter(c=>!c.appArchivedAt&&!c.archivedAt)
  .map((c) => { const stats = revenueStats(c, entries); return { c, ...stats, ltv: stats.revenue }; })
  .sort((a, b) => b.ltv - a.ltv || a.c.name.localeCompare(b.c.name, 'pt-BR'));

// ---------- ranking: clientes que mais compram ----------
function TopBuyers({ clients, entries, onOpen, onViewAll, full = false }) {
  const allRanked = rankedClients(clients, entries);
  const ranked = full ? allRanked : allRanked.slice(0, 5);
  const max = ranked.length && ranked[0].ltv > 0 ? ranked[0].ltv : 1;
  const medals = ['#e8930c', '#8a93a8', '#cd7f45', '#b9bdc9', '#b9bdc9'];

  return (
    <div className="fx-card fx-pad">
      <div className="fx-card-head">
        <div>
          <h3 className="fx-card-title">{full ? 'Ranking completo de clientes' : 'Clientes que mais compram'}</h3>
          <p className="fx-card-sub">{full ? 'Todos os clientes ordenados por LTV' : 'Ranking pela receita efetivamente registrada nas entradas'}</p>
        </div>
        <div className="fx-card-actions">
          {!full && <button className="fx-link" onClick={onViewAll}>Ver ranking completo<Icon name="chevron-right" size={15}/></button>}
          <span className="fx-chip indigo"><Icon name="flame" size={13}/>{full ? `${ranked.length} clientes` : `Top ${Math.min(5, ranked.length)}`}</span>
        </div>
      </div>
      <div className="fx-rank-list">
        {ranked.map((r, i) => (
          <button className="fx-rank" key={r.c.id} onClick={() => onOpen(r.c)}>
            <span className="fx-rank-pos" style={{ background: medals[i] || '#b9bdc9' }}>{i + 1}</span>
            <div className="fx-rank-main">
              <div className="fx-rank-name">{r.c.tradeName || r.c.name}</div>
              <div className="fx-rank-seg">{r.c.segment} · {r.orders} compra{r.orders !== 1 ? 's' : ''}</div>
              <div className="fx-rank-bar"><div className="fx-rank-fill" style={{ width: r.ltv ? Math.max(8, Math.round(r.ltv / max * 100)) + '%' : '0%' }}></div></div>
            </div>
            <div className="fx-rank-stats">
              <div className="fx-rank-ltv fx-num">{brl0(r.ltv)}</div>
              <div className="fx-rank-ticket">ticket médio <b className="fx-num">{brl0(r.ticket)}</b></div>
            </div>
          </button>
        ))}
      </div>
      {!full && <div className="fx-persona"><Icon name="sparkles" size={16}/><span>Padrão emergente: <b>serviços recorrentes mensais + licença anual</b> concentram a maior parte do LTV. Clientes de <b>Tecnologia</b> e <b>Serviços digitais</b> compram com maior frequência.</span></div>}
    </div>
  );
}
// ---------- lista ----------
function ClientList({ clients, entries, query, onOpen, onEdit, onDelete, onNew, onViewAll, full = false }) {
  const [archiveFilter, setArchiveFilter] = useState('todos');
  const [scope, setScope] = useState('todos');
  const filtered = clients.filter((c) => (archiveFilter==='todos'||(archiveFilter==='arquivados'?!!c.appArchivedAt:!c.appArchivedAt))
    && (scope==='todos'||(scope==='financeiro'?clientEntries(c,entries).length>0:clientEntries(c,entries).length===0))
    && (!query || (c.name + (c.tradeName||'') + c.segment + c.cnpj + (c.resp?.email || '') + (c.fin?.email||'')).toLowerCase().includes(query.toLowerCase())));
  const sorted = [...filtered].sort((a, b) => (a.tradeName || a.name).localeCompare(b.tradeName || b.name, 'pt-BR'));
  const rows = full ? sorted : sorted.slice(0, 5);
  return (
    <div className="fx-card fx-pad">
      <div className="fx-card-head">
        <div><h3 className="fx-card-title">Central de clientes do BASE</h3><p className="fx-card-sub">{full ? `${rows.length} cadastros em ordem alfabética` : `Exibindo ${rows.length} de ${sorted.length} cadastros`} · Cadastro único por empresa</p></div>
        <div className="fx-card-actions">{!full && <button className="fx-link" onClick={onViewAll}>Ver todos<Icon name="chevron-right" size={15}/></button>}<button className="fx-btn sm" onClick={onNew}><Icon name="plus" size={16}/>Novo cliente</button></div>
      </div>
      <div className="fx-central-filters"><label>Situação no Financeiro<select className="fx-select" value={archiveFilter} onChange={e=>setArchiveFilter(e.target.value)}><option value="ativos">Não arquivados</option><option value="arquivados">Arquivados</option><option value="todos">Todos os cadastros</option></select></label><label>Uso no Financeiro<select className="fx-select" value={scope} onChange={e=>setScope(e.target.value)}><option value="todos">Todos os clientes do BASE</option><option value="financeiro">Com lançamentos financeiros</option><option value="sem">Sem lançamentos financeiros</option></select></label></div>
      {rows.length ? rows.map((c) => {
        const ltv = revenueStats(c, entries).revenue;
        return <div className="fx-contact" key={c.id} onClick={() => onOpen(c)} style={{cursor:'pointer'}}><div className="fx-contact-ic">{initials(c.tradeName || c.name)}</div><div className="fx-contact-main"><p className="fx-contact-name">{c.tradeName || c.name}</p><p className="fx-contact-sub"><Icon name="briefcase" size={13}/>{c.segment} · desde {fmtSince(c.since)}</p></div><div className="fx-contact-right"><span className={'fx-badge ' + statusClass(c.status)}>{c.appArchivedAt ? 'Arquivado no Financeiro' : c.status}</span><div className="fx-contact-amt"><div className="lb">LTV</div><div className="vl fx-num">{ltv > 0 ? brl0(ltv) : '—'}</div></div><div className="fx-row-actions" onClick={(e)=>e.stopPropagation()}><button className="fx-icon sm" title="Visualizar" onClick={()=>onOpen(c)}><Icon name="search" size={15}/></button><button className="fx-icon sm" title="Editar" onClick={()=>onEdit(c)}><Icon name="pencil" size={16}/></button><button className="fx-icon sm danger" title={c.appArchivedAt ? 'Restaurar / excluir da central' : 'Arquivar / excluir da central'} onClick={()=>onDelete(c)}><Icon name="trash" size={16}/></button></div></div></div>;
      }) : <div className="fx-empty"><div className="ic"><Icon name="users" size={26}/></div><p>Nenhum cliente encontrado.</p></div>}
    </div>
  );
}
// ---------- detalhe ----------
function InfoField({ icon, label, value, sub }) {
  return (
    <div className="fx-info">
      <div className="fx-info-ic"><Icon name={icon} size={17} /></div>
      <div className="fx-info-body">
        <div className="fx-info-lb">{label}</div>
        <div className="fx-info-vl">{value || '—'}</div>
        {sub && <div className="fx-info-sub">{sub}</div>}
      </div>
    </div>
  );
}

const phoneHref = (value) => `tel:${String(value || '').replace(/[^\d+]/g, '')}`;
const whatsappHref = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`;
};

function ContactPerson({ icon, label, contact }) {
  const person = contact || {};
  const phone = person.phone && person.phone !== '—' ? person.phone : '';
  const mobile = person.mobile && person.mobile !== '—' ? person.mobile : '';
  const email = person.email && person.email !== '—' ? person.email : '';
  const hasContact = phone || mobile || email;
  return (
    <div className="fx-info fx-contact-person">
      <div className="fx-info-ic"><Icon name={icon} size={17} /></div>
      <div className="fx-info-body">
        <div className="fx-info-lb">{label}</div>
        <div className="fx-info-vl">{person.name || '—'}</div>
        {hasContact && <div className="fx-contact-chips">
          {phone && <a className="fx-contact-chip action" href={phoneHref(phone)}><b>Telefone</b>{phone} ↗</a>}
          {mobile && <a className="fx-contact-chip action" href={whatsappHref(mobile)} target="_blank" rel="noreferrer"><b>Celular / WhatsApp</b>{mobile} ↗</a>}
          {email && <a className="fx-contact-chip action" href={`mailto:${email}`}><b>E-mail</b>{email} ↗</a>}
        </div>}
      </div>
    </div>
  );
}

function ContractRow({ k }) {
  const [open, setOpen] = useState(false);
  const isRec = k.type === 'recorrente';
  const stClass = k.status === 'Ativo' ? 'pos' : k.status === 'Pausado' ? 'amber' : 'neutral';
  return (
    <div className="fx-contract" onClick={() => setOpen((v) => !v)} style={{cursor:'pointer', flexWrap:'wrap'}}>
      <div className={'fx-contract-ic ' + (k.kind === 'Produto' ? 'prod' : 'serv')}>
        <Icon name={k.kind === 'Produto' ? 'cash' : 'briefcase'} size={18} />
      </div>
      <div className="fx-contract-main">
        <div className="fx-contract-name">{k.name}</div>
        <div className="fx-contract-meta">
          <span className="fx-tag">{k.kind}</span>
          <span className={'fx-tag ' + (isRec ? 'rec' : 'pon')}>{isRec ? CADENCE_LABEL[k.cadence] : 'Pontual'}</span>
          <span className="fx-contract-since">desde {fmtSince(k.since)}</span>
        </div>
      </div>
      <div className="fx-contract-right">
        <div className="fx-contract-amt fx-num">{brl0(k.amount)}{isRec ? <span className="per">/{k.cadence === 'mensal' ? 'mês' : k.cadence === 'trimestral' ? 'trim' : 'ano'}</span> : null}</div>
        <span className={'fx-badge ' + stClass} style={{ marginTop: 6 }}>{k.status}</span>
      </div>
      {open && <div className="fx-contract-detail"><b>{k.description || k.name}</b><span>Pagamento: {k.paymentMethod || '—'} · {k.installments || 1} parcela(s)</span><span>Início: {k.startDate || k.since} · Término: {k.endDate || 'Não definido'}</span><span>Satisfação: {k.satisfaction || '—'}/5 · {k.notes || 'Sem observações'}</span></div>}
    </div>
  );
}

function ClientDetail({ client, entries, onBack, onEdit, onDelete }) {
  const c = client;
  const financialPhone = (c.phones || []).find((item) => /financ/i.test(item.tag || item.type || ''))?.value;
  const financialMobile = (c.whatsapps || []).find((item) => /financ/i.test(item.tag || item.type || ''))?.value;
  const responsible = { ...c.resp, phone: c.resp?.phone || c.phones?.[0]?.value || c.phone, mobile: c.resp?.mobile || c.whatsapps?.[0]?.value || c.whatsapp };
  const financial = { ...c.fin, phone: c.fin?.phone || financialPhone, mobile: c.fin?.mobile || financialMobile };
  const [tab, setTab] = useState('dados');
  const [contractQuery, setContractQuery] = useState('');
  const [contractStatus, setContractStatus] = useState('Todos');
  const actual = revenueStats(c, entries);
  const ltv = actual.revenue, mrr = clientMRR(c), ticket = actual.ticket;
  const recs = (c.contracts || []).filter((k) => k.type === 'recorrente').length;
  const pons = (c.contracts || []).filter((k) => k.type === 'pontual').length;
  const visibleContracts = (c.contracts || []).filter(k => (!contractQuery || (k.name + k.kind + k.type).toLowerCase().includes(contractQuery.toLowerCase())) && (contractStatus === 'Todos' || k.status === contractStatus));
  return (
    <div className="fx-detail">
      <div className="fx-detail-top">
        <button className="fx-back" onClick={onBack}><Icon name="arrow-left" size={18} />Clientes</button>
        <div className="fx-detail-actions">
          <button className="fx-btn ghost sm" onClick={() => onEdit(c)}><Icon name="pencil" size={16} />Editar</button>
          <button className="fx-btn danger-outline sm" onClick={() => onDelete(c)}><Icon name="users" size={16} />{c.appArchivedAt ? 'Restaurar / excluir da central' : 'Arquivar / excluir da central'}</button>
        </div>
      </div>

      <div className="fx-profile">
        <div className="fx-profile-ic">{initials(c.name)}</div>
        <div className="fx-profile-id">
          <div className="fx-profile-name">{c.name}</div>
          <div className="fx-profile-seg">{c.tradeName || c.name} · {c.segment}</div>
          <div className="fx-profile-tags">
            <span className="fx-badge indigo">Cadastro central BASE</span>{(c._appStates||[]).filter(a=>a.archived_at).map(a=><span className="fx-badge amber" key={a.app_id}>Arquivado no {a.app_id==='not'?'NOT':'Financeiro'}</span>)}{c.appArchivedAt && <span className="fx-badge amber">Arquivado</span>}
            <span className={'fx-badge ' + statusClass(c.status)}>{c.appArchivedAt ? 'Arquivado no Financeiro' : c.status}</span>
            <span className="fx-badge"><Icon name="calendar" size={12} />Cliente desde {fmtSince(c.since)}</span>
          </div>
        </div>
        <div className="fx-profile-stats">
          <div className="fx-pstat"><div className="lb">LTV total</div><div className="vl fx-num">{brl0(ltv)}</div></div>
          <div className="fx-pstat"><div className="lb">Receita recorrente</div><div className="vl fx-num">{mrr > 0 ? brl0(mrr) + '/mês' : '—'}</div></div>
          <div className="fx-pstat"><div className="lb">Ticket médio</div><div className="vl fx-num">{ticket > 0 ? brl0(ticket) : '—'}</div></div>
        </div>
      </div>

      <div className="fx-detail-tabs">{[['dados','Dados cadastrais'],['contracts','Serviços e contratações'],['finance','Financeiro'],['renewals','Renovações'],['relations','Relacionamento']].map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>

      {tab === 'dados' && <div className="fx-card fx-pad">
        <div className="fx-card-head"><div><h3 className="fx-card-title">Dados compartilhados do BASE</h3><p className="fx-card-sub">Editar estes dados atualiza o cadastro central. Contratos e lançamentos permanecem no Financeiro.</p></div></div>
        <div className="fx-info-grid">
          <InfoField icon="building" label="Empresa" value={c.name} sub={c.segment} />
          <InfoField icon="building-store" label="Nome fantasia" value={c.tradeName} />
          <InfoField icon="receipt" label="CPF/CNPJ" value={c.cnpj} />
          <InfoField icon="world" label="Endereço completo" value={c.address} />
          <ContactPerson icon="user-circle" label="Responsável" contact={responsible} />
          <InfoField icon="receipt" label="Inscrições" value={c.stateRegistration ? `IE: ${c.stateRegistration}` : 'IE: —'} sub={c.cityRegistration ? `IM: ${c.cityRegistration}` : 'IM: —'} />
          <InfoField icon="sparkles" label="Origem do cliente" value={c.origin} />
          <ContactPerson icon="briefcase" label="Responsável financeiro" contact={financial} />
          <ContactPerson icon="user-circle" label="Responsável técnico" contact={c.technical} />
          <InfoField icon="calendar" label="Cliente desde" value={fmtSince(c.since)} />
        </div>
      </div>}

      {tab === 'finance' && <div className="fx-card fx-pad"><div className="fx-card-head"><div><h3 className="fx-card-title">Financeiro do cliente</h3><p className="fx-card-sub">Calculado a partir dos lançamentos vinculados, sem duplicação</p></div><span className={'fx-badge ' + (actual.profile === 'Recorrente' ? 'indigo' : 'amber')}>{actual.profile}</span></div><div className="fx-summary"><div className="fx-sumcard accent"><div className="fx-sum-lb">Receita total</div><div className="fx-sum-vl fx-num">{brl0(actual.revenue)}</div></div><div className="fx-sumcard"><div className="fx-sum-lb">Ticket médio</div><div className="fx-sum-vl fx-num">{brl0(actual.ticket)}</div></div><div className="fx-sumcard"><div className="fx-sum-lb">A receber</div><div className="fx-sum-vl fx-num">{brl0(clientEntries(c, entries).filter(e=>/receber|prev/i.test(e.status)).reduce((s,e)=>s+e.amount,0))}</div></div></div><div style={{marginTop:18}}>{clientEntries(c, entries).map(e=><div className="fx-contract" key={e.id}><div className="fx-contract-main"><div className="fx-contract-name">{e.desc}</div><div className="fx-contract-meta"><span className="fx-tag">{e.incomeType || 'Entrada'}</span><span className="fx-contract-since">{new Date(e.date+'T12:00').toLocaleDateString('pt-BR')} · {e.status}</span></div></div><div className="fx-contract-amt fx-num">{brl0(e.amount)}</div></div>)}</div></div>}

      {tab === 'contracts' && <div className="fx-card fx-pad">
        <div className="fx-card-head">
          <div>
            <h3 className="fx-card-title">Histórico de contratações</h3>
            <p className="fx-card-sub">Serviços e produtos · base do LTV</p>
          </div>
          <div className="fx-contract-summary">
            <span className="fx-chip indigo">{recs} recorrente{recs !== 1 ? 's' : ''}</span>
            <span className="fx-chip neutral">{pons} pontua{pons !== 1 ? 'is' : 'l'}</span>
          </div>
        </div>
        <div className="fx-row2" style={{marginBottom:14}}><input className="fx-input" value={contractQuery} onChange={e=>setContractQuery(e.target.value)} placeholder="Filtrar por serviço ou tipo"/><select className="fx-select" value={contractStatus} onChange={e=>setContractStatus(e.target.value)}><option>Todos</option><option>Ativo</option><option>Concluído</option><option>Em andamento</option><option>Pausado</option><option>Cancelado</option></select></div>
        {visibleContracts.length
          ? visibleContracts.map((k, i) => <ContractRow k={k} key={i} />)
          : <div className="fx-empty"><div className="ic"><Icon name="receipt" size={26} /></div><p>Nenhuma contratação registrada ainda.</p></div>}
      </div>}
      {tab === 'renewals' && <div className="fx-card fx-pad"><div className="fx-card-head"><div><h3 className="fx-card-title">Renovações</h3><p className="fx-card-sub">Registros vinculados às contratações originais</p></div></div>{(c.renewals || []).map(r=><div className="fx-contract" key={r.id}><div className="fx-contract-main"><div className="fx-contract-name">{r.service}</div><div className="fx-contract-meta"><span className="fx-tag rec">{CADENCE_LABEL[r.cadence] || r.cadence}</span><span className="fx-contract-since">Próxima: {new Date(r.nextDate+'T12:00').toLocaleDateString('pt-BR')}</span></div></div><div className="fx-contract-right"><div className="fx-contract-amt fx-num">{brl0(r.amount)}</div><span className="fx-badge pos">{r.status}</span></div></div>)}</div>}
      {tab === 'relations' && <div className="fx-card fx-pad"><div className="fx-card-head"><div><h3 className="fx-card-title">Histórico de relacionamento</h3><p className="fx-card-sub">Contatos, necessidades e próximas oportunidades</p></div></div>{(c.interactions || []).length ? c.interactions.map(x=><div className="fx-contract" key={x.id}><div className="fx-contract-main"><div className="fx-contract-name">{x.type} · {x.summary}</div><div className="fx-contract-meta"><span className="fx-contract-since">{x.date} · Próximo contato: {x.nextContact || '—'}</span></div><p className="fx-card-sub">{x.needs || x.notes}</p></div></div>) : <div className="fx-empty"><div className="ic"><Icon name="users" size={26}/></div><p>Nenhum contato registrado ainda.</p></div>}</div>}
    </div>
  );
}

// ---------- modal criar/editar ----------
function ClienteModal({ initial, onClose, onSave }) {
  const isEdit = !!initial.id;
  const initialForm = {
    name: initial.name || '', cnpj: initial.cnpj || '', segment: initial.segment || '',
    tradeName: initial.tradeName || initial.name || '', stateRegistration: initial.stateRegistration || '', cityRegistration: initial.cityRegistration || '', origin: initial.origin || '',
    address: initial.address || '', status: initial.status || 'Ativo', since: initial.since || new Date().toISOString().slice(0,7),
    respName: initial.resp?.name || '', respPhone: initial.resp?.phone || initial.phones?.[0]?.value || initial.phone || '', respMobile: initial.resp?.mobile || initial.whatsapps?.[0]?.value || initial.whatsapp || '', respEmail: initial.resp?.email || initial.emails?.[0]?.value || '',
    finName: initial.fin?.name || '', finPhone: initial.fin?.phone || '', finMobile: initial.fin?.mobile || '', finEmail: initial.fin?.email || '',
    technicalName: initial.technical?.name || '', technicalMobile: initial.technical?.mobile || '', technicalEmail: initial.technical?.email || '',
  };
  const [f, setF] = useState(initialForm);
  const [err, setErr] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const requestClose = () => JSON.stringify(f) !== JSON.stringify(initialForm) ? setConfirmDiscard(true) : onClose();
  const save = () => {
    if (!f.name.trim()) { setErr(true); return; }
    onSave({
      ...initial, id: initial.id, contracts: initial.contracts || [], open: initial.open || 0,
      name: f.name.trim(), cnpj: f.cnpj.trim() || '—', segment: f.segment.trim() || 'Geral',
      tradeName: f.tradeName.trim() || f.name.trim(), stateRegistration: f.stateRegistration.trim(), cityRegistration: f.cityRegistration.trim(), origin: f.origin || 'Não informado',
      address: f.address.trim() || '—', status: f.status, since: f.since,
      resp: { name: f.respName.trim() || '—', phone: f.respPhone.trim(), mobile: f.respMobile.trim(), email: f.respEmail.trim() },
      fin: { name: f.finName.trim() || '—', phone: f.finPhone.trim(), mobile: f.finMobile.trim(), email: f.finEmail.trim() },
      technical: { ...initial.technical, name: f.technicalName.trim(), mobile: f.technicalMobile.trim(), email: f.technicalEmail.trim() },
    });
  };
  return (
    <>
    <div className="fx-overlay" onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <div className="fx-modal" style={{ width: 'min(640px,100%)' }}>
        <div className="fx-modal-head">
          <div>
            <h2>{isEdit ? 'Editar cliente' : 'Novo cliente'}</h2>
            <p>{isEdit ? 'Alterações cadastrais ficam disponíveis aos apps conectados à central.' : 'Um cadastro único no BASE, disponível para os apps da sua empresa.'}</p>
          </div>
          <button className="fx-icon sm" onClick={requestClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="fx-modal-body">
          <div className="fx-row2">
            <div className="fx-field"><label>Razão Social</label>
              <input className="fx-input" aria-label="Razão Social" value={f.name} onChange={set('name')} placeholder="Ex: Horizonte Digital"
                style={err && !f.name.trim() ? { borderColor: 'var(--neg)' } : null} />
            </div>
            <div className="fx-field"><label>Nome Fantasia</label><input className="fx-input" aria-label="Nome Fantasia" value={f.tradeName} onChange={set('tradeName')} /></div>
          </div>
          <div className="fx-row2">
            <div className="fx-field"><label>CPF/CNPJ</label><input className="fx-input fx-num" aria-label="CPF/CNPJ" value={f.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" /></div>
            <div className="fx-field"><label>Segmento</label><input className="fx-input" aria-label="Segmento" value={f.segment} onChange={set('segment')} placeholder="Ex: Tecnologia" /></div>
          </div>
          <div className="fx-field">
            <label>Endereço completo</label>
            <input className="fx-input" aria-label="Endereço completo" value={f.address} onChange={set('address')} placeholder="Rua, número, bairro, cidade/UF, CEP" />
          </div>
          <div className="fx-fieldset"><span className="fx-fieldset-lb">Responsável</span></div>
          <div className="fx-row2">
            <div className="fx-field"><label>Nome</label><input className="fx-input" aria-label="Nome" value={f.respName} onChange={set('respName')} placeholder="Nome do responsável" /></div>
            <div className="fx-field"><label>Telefone (fixo)</label><input className="fx-input" aria-label="Telefone (fixo)" type="tel" value={f.respPhone} onChange={set('respPhone')} placeholder="(11) 3333-4444" /></div>
          </div>
          <div className="fx-row2">
            <div className="fx-field"><label>Celular / WhatsApp</label><input className="fx-input" aria-label="Celular / WhatsApp" type="tel" value={f.respMobile} onChange={set('respMobile')} placeholder="(11) 99999-0000" /></div>
            <div className="fx-field"><label>E-mail</label><input className="fx-input" aria-label="E-mail" type="email" value={f.respEmail} onChange={set('respEmail')} placeholder="email@empresa.com" /></div>
          </div>
          <div className="fx-row2"><div className="fx-field"><label>Inscrição Estadual</label><input className="fx-input" aria-label="Inscrição Estadual" value={f.stateRegistration} onChange={set('stateRegistration')} /></div><div className="fx-field"><label>Inscrição Municipal</label><input className="fx-input" aria-label="Inscrição Municipal" value={f.cityRegistration} onChange={set('cityRegistration')} /></div></div>
          <div className="fx-field"><label>Origem do cliente</label><select className="fx-select" value={f.origin} onChange={set('origin')}><option value="">Selecione uma origem</option><option>Indicação</option><option>Mídia paga</option><option>Orgânico</option><option>Redes sociais</option>{f.origin && !['Indicação','Mídia paga','Orgânico','Redes sociais'].includes(f.origin) && <option value={f.origin}>{f.origin} (cadastro anterior)</option>}</select></div>
          <div className="fx-fieldset"><span className="fx-fieldset-lb">Responsável financeiro</span></div>
          <div className="fx-row2">
            <div className="fx-field"><label>Nome</label><input className="fx-input" aria-label="Nome" value={f.finName} onChange={set('finName')} placeholder="Nome do financeiro" /></div>
            <div className="fx-field"><label>Telefone (fixo)</label><input className="fx-input" aria-label="Telefone (fixo)" type="tel" value={f.finPhone} onChange={set('finPhone')} placeholder="(11) 3333-4444" /></div>
          </div>
          <div className="fx-row2">
            <div className="fx-field"><label>Celular / WhatsApp</label><input className="fx-input" aria-label="Celular / WhatsApp" type="tel" value={f.finMobile} onChange={set('finMobile')} placeholder="(11) 99999-0000" /></div>
            <div className="fx-field"><label>E-mail</label><input className="fx-input" aria-label="E-mail" type="email" value={f.finEmail} onChange={set('finEmail')} placeholder="financeiro@empresa.com" /></div>
          </div>
          <div className="fx-fieldset"><span className="fx-fieldset-lb">Responsável técnico</span></div>
          <div className="fx-row2"><div className="fx-field"><label>Nome do contato técnico</label><input className="fx-input" aria-label="Nome do contato técnico" value={f.technicalName} onChange={set('technicalName')} /></div><div className="fx-field"><label>WhatsApp técnico</label><input className="fx-input" aria-label="WhatsApp técnico" type="tel" value={f.technicalMobile} onChange={set('technicalMobile')} /></div></div>
          <div className="fx-field"><label>E-mail técnico</label><input className="fx-input" aria-label="E-mail técnico" type="email" value={f.technicalEmail} onChange={set('technicalEmail')} /></div>
          <div className="fx-row2">
            <div className="fx-field"><label>Status</label>
              <select className="fx-select" value={f.status} onChange={set('status')}>
                <option>Ativo</option><option>Recorrente</option><option>Prospect</option><option>Inativo</option>
              </select>
            </div>
            <div className="fx-field"><label>Cliente desde</label><input className="fx-input fx-num" aria-label="Cliente desde" type="month" value={f.since} onChange={set('since')} /></div>
          </div>
        </div>
        <div className="fx-modal-foot">
          <button className="fx-modal-cancel" onClick={requestClose}>Cancelar</button>
          <button className="fx-modal-save" onClick={save}><Icon name="check" size={17} />{isEdit ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
        </div>
      </div>
    </div>
    {confirmDiscard && <div className="fx-overlay fx-discard-overlay"><div className="fx-modal fx-discard-modal"><div className="fx-modal-body"><div className="fx-confirm-ic warn"><Icon name="alert-circle" size={26}/></div><div><h2>Salvar alterações?</h2><p>Existem dados preenchidos neste cliente. Deseja continuar editando, salvar ou descartar?</p></div></div><div className="fx-modal-foot"><button className="fx-modal-cancel" onClick={()=>setConfirmDiscard(false)}>Continuar editando</button><button className="fx-btn" onClick={save}>Salvar</button><button className="fx-modal-save danger" onClick={onClose}>Descartar</button></div></div></div>}
    </>
  );
}

// ---------- view orquestradora ----------
export default function ClientesView({ clients, entries, query, onSave, workspaceId, canDelete, syncReady, onLifecycle, notify }) {
  const navigate = useNavigate();
  const location = useLocation();
  const routeId = location.pathname.split('/')[2];
  const [modal, setModal] = useState(null);     // {} novo, {client} editar
  const [del, setDel] = useState(null);
  const selected = clients.find((c) => String(c.id) === routeId) || null;

  const open = (c) => { navigate(`/clientes/${c.id}`); window.scrollTo?.(0, 0); };
  const save = (payload) => { if(onSave(payload)===false)return; setModal(null); notify(payload.id ? 'Salvando alterações na central…' : 'Salvando cliente na central…'); };


  if (selected) {
    return (
      <React.Fragment>
        <ClientDetail client={selected} entries={entries} onBack={() => navigate('/clientes')} onEdit={(c) => setModal({ ...c })} onDelete={(c) => setDel(c)} />
        {modal && <ClienteModal initial={modal} onClose={() => setModal(null)} onSave={save} />}
        {del && <ConfirmDelete client={del} onClose={() => setDel(null)} workspaceId={workspaceId} canDelete={canDelete} enabled={syncReady} onApplied={async()=>{await onLifecycle();setDel(null);navigate('/clientes');notify('Central atualizada.');}} />}
      </React.Fragment>
    );
  }

  if (routeId === 'ranking') return <TopBuyers clients={clients} entries={entries} onOpen={open} full />;
  if (routeId === 'todos') return <React.Fragment><ClientList clients={clients} entries={entries} query={query} onOpen={open} onEdit={(c)=>setModal({...c})} onDelete={(c)=>setDel(c)} onNew={()=>setModal({})} full />{modal && <ClienteModal initial={modal} onClose={()=>setModal(null)} onSave={save}/>} {del && <ConfirmDelete client={del} onClose={()=>setDel(null)} workspaceId={workspaceId} canDelete={canDelete} enabled={syncReady} onApplied={async()=>{await onLifecycle();setDel(null);navigate('/clientes');notify('Central atualizada.');}}/>}</React.Fragment>;

  return (
    <React.Fragment>
      <TopBuyers clients={clients} entries={entries} onOpen={open} onViewAll={()=>navigate('/clientes/ranking')} />
      <ClientList clients={clients} entries={entries} query={query} onOpen={open} onEdit={(c) => setModal({ ...c })}
        onDelete={(c) => setDel(c)} onNew={() => setModal({})} onViewAll={()=>navigate('/clientes/todos')} />
      {modal && <ClienteModal initial={modal} onClose={() => setModal(null)} onSave={save} />}
      {del && <ConfirmDelete client={del} onClose={() => setDel(null)} workspaceId={workspaceId} canDelete={canDelete} enabled={syncReady} onApplied={async()=>{await onLifecycle();setDel(null);navigate('/clientes');notify('Central atualizada.');}} />}
    </React.Fragment>
  );
}
