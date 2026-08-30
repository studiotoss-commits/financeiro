import React, { useMemo, useState } from 'react';
import { AppSwitcher } from '@base/design-system';
import Icon from './components/Icon';

const INITIAL_SITES = [
  { id: 1, client: 'CiaCert', site: 'ciacert.com.br', contract: 'Hospedagem', frequency: 'Semestral', status: 'Pendente', executions: 1, owner: 'Não definido', email: 'contato@ciacert.com.br', last: '18/06/2026', next: '18/12/2026', hosting: 'TOSS', note: 'Site desenvolvido pela TOSS e hospedado anualmente com a TOSS.' },
  { id: 2, client: 'Click Audioworks', site: 'clickaudioworks.com.br', contract: 'Hospedagem', frequency: 'Semestral', status: 'Pendente', executions: 1, owner: 'Taís Santos', email: 'contato@clickaudioworks.com.br', last: '10/05/2026', next: '10/11/2026', hosting: 'TOSS', note: 'Site desenvolvido pela TOSS e hospedado anualmente com a TOSS.' },
  { id: 3, client: 'Conteúdo F', site: 'conteudof.com.br', contract: 'Hospedagem', frequency: 'Semestral', status: 'Atenção', executions: 1, owner: 'Taís Santos', email: 'contato@conteudof.com.br', last: '25/05/2026', next: '25/11/2026', hosting: 'Externa', note: 'Site desenvolvido pela TOSS, mas hospedado fora. Confirmar acesso antes da manutenção.' },
  { id: 4, client: 'Cravari', site: 'cravari.com.br', contract: 'Gestão Trimestral', frequency: 'Trimestral', status: 'Ativo', executions: 2, owner: 'Taís Santos', email: 'contato@cravari.com.br', last: '12/07/2026', next: '12/10/2026', hosting: 'TOSS', note: 'Hospedagem e manutenção realizadas pela TOSS.' },
  { id: 5, client: 'Criem', site: 'criem.cc', contract: 'Gestão Mensal', frequency: 'Mensal', status: 'Ativo', executions: 3, owner: 'Rafael Lima', email: 'contato@criem.cc', last: '02/08/2026', next: '02/09/2026', hosting: 'TOSS', note: 'Rotina mensal ativa, sem pendências abertas.' },
  { id: 6, client: 'Ditirambo Eventos Culturais', site: 'ditirambo.com.br', contract: 'Hospedagem', frequency: 'Semestral', status: 'Ativo', executions: 1, owner: 'Rafael Lima', email: 'contato@ditirambo.com.br', last: '08/07/2026', next: '08/01/2027', hosting: 'TOSS', note: 'Site e hospedagem mantidos pela TOSS.' },
  { id: 7, client: 'DJs House', site: 'djshouse.com.br', contract: 'Hospedagem', frequency: 'Semestral', status: 'Pendente', executions: 1, owner: 'Não definido', email: 'contato@djshouse.com.br', last: '16/04/2026', next: '16/10/2026', hosting: 'Externa', note: 'Site desenvolvido pela TOSS, com hospedagem externa.' },
  { id: 8, client: 'Dom Labor', site: 'domlabor.com.br', contract: 'Hospedagem', frequency: 'Semestral', status: 'Ativo', executions: 1, owner: 'Taís Santos', email: 'contato@domlabor.com.br', last: '21/06/2026', next: '21/12/2026', hosting: 'TOSS', note: 'Hospedagem anual com a TOSS.' },
  { id: 9, client: 'Dopplo Benefícios', site: 'dopplobeneficios.com', contract: 'Hospedagem', frequency: 'Semestral', status: 'Ativo', executions: 1, owner: 'Rafael Lima', email: 'contato@dopplobeneficios.com', last: '30/06/2026', next: '30/12/2026', hosting: 'TOSS', note: 'Site e hospedagem mantidos pela TOSS.' },
  { id: 10, client: 'Douglas', site: 'douglas.com.br', contract: 'Não definido', frequency: 'Não definida', status: 'Atenção', executions: 0, owner: 'Não definido', email: '', last: '—', next: '—', hosting: 'Não definida', note: 'Completar dados de contratação, frequência e hospedagem.' },
];

const NAV = [
  { id: 'overview', label: 'Visão geral', icon: 'layout-dashboard' },
  { id: 'sites', label: 'Sites', icon: 'world' },
  { id: 'maintenance', label: 'Manutenções', icon: 'receipt' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar-event' },
  { sep: 'Gestão' },
  { id: 'clients', label: 'Clientes', icon: 'users' },
  { id: 'reports', label: 'Relatórios', icon: 'chart-pie' },
  { id: 'settings', label: 'Configurações', icon: 'settings' },
];

const BASE_APPS = [
  { id: 'financeiro', name: 'Financeiro', shortName: 'FI', description: 'Gestão financeira e comercial', href: import.meta.env.VITE_FINANCEIRO_URL || 'http://127.0.0.1:5174/', color: '#5a39e6' },
  { id: 'manutencao-sites', name: 'Manutenção de sites', shortName: 'MS', description: 'Sites, contratos e manutenções', href: '/', color: '#d2694d' },
];

const EMPTY_SITE = { client: '', site: '', contract: 'Hospedagem', frequency: 'Semestral', status: 'Ativo', owner: '', email: '', hosting: 'TOSS', note: '' };
const initials = (name) => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

function Sidebar({ view, onNavigate, open, onClose }) {
  return (
    <>
      {open && <button className="ms-side-backdrop" aria-label="Fechar menu" onClick={onClose} />}
      <aside className={`ms-side${open ? ' open' : ''}`}>
        <AppSwitcher currentApp="manutencao-sites" apps={BASE_APPS} theme="dark" />
        <nav className="ms-nav">
          <p className="ms-nav-label">Operação</p>
          {NAV.map((item, index) => item.sep
            ? <p className="ms-nav-label" key={`${item.sep}-${index}`}>{item.sep}</p>
            : <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => { onNavigate(item.id); onClose(); }}><Icon name={item.icon} size={19} />{item.label}</button>)}
        </nav>
        <div className="ms-user"><div className="ms-avatar">TS</div><div><strong>Taís Santos</strong><span>Administradora</span></div></div>
      </aside>
    </>
  );
}

function Metric({ icon, label, value, helper, tone = '' }) {
  return <div className={`ms-metric ${tone}`}><div className="ms-metric-top"><span>{label}</span><Icon name={icon} size={18} /></div><strong>{value}</strong><small>{helper}</small></div>;
}

function Modal({ title, description, children, onClose, onSubmit, submitLabel }) {
  return (
    <div className="ms-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="ms-modal" onSubmit={onSubmit}>
        <div className="ms-modal-head"><div><h2>{title}</h2><p>{description}</p></div><button type="button" className="ms-icon-button" onClick={onClose} aria-label="Fechar"><Icon name="x" size={18} /></button></div>
        <div className="ms-modal-body">{children}</div>
        <div className="ms-modal-foot"><button type="button" className="ms-button ghost" onClick={onClose}>Cancelar</button><button type="submit" className="ms-button primary"><Icon name="check" size={17} />{submitLabel}</button></div>
      </form>
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return <label className={`ms-field${wide ? ' wide' : ''}`}><span>{label}</span>{children}</label>;
}

function NewSiteModal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_SITE);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => { event.preventDefault(); if (!form.client.trim() || !form.site.trim()) return; onSave(form); };
  return <Modal title="Novo site" description="Cadastre o vínculo operacional com o cliente." onClose={onClose} onSubmit={submit} submitLabel="Cadastrar site">
    <div className="ms-form-grid">
      <Field label="Cliente *"><input required value={form.client} onChange={change('client')} placeholder="Nome do cliente" /></Field>
      <Field label="Site *"><input required value={form.site} onChange={change('site')} placeholder="exemplo.com.br" /></Field>
      <Field label="Contratação"><select value={form.contract} onChange={change('contract')}><option>Hospedagem</option><option>Gestão Mensal</option><option>Gestão Trimestral</option><option>Projeto pontual</option></select></Field>
      <Field label="Frequência"><select value={form.frequency} onChange={change('frequency')}><option>Mensal</option><option>Trimestral</option><option>Semestral</option><option>Anual</option><option>Não definida</option></select></Field>
      <Field label="Responsável"><input value={form.owner} onChange={change('owner')} placeholder="Pessoa responsável" /></Field>
      <Field label="Hospedagem"><select value={form.hosting} onChange={change('hosting')}><option>TOSS</option><option>Externa</option><option>Não definida</option></select></Field>
      <Field label="E-mail" wide><input type="email" value={form.email} onChange={change('email')} placeholder="contato@cliente.com.br" /></Field>
      <Field label="Observações" wide><textarea rows="3" value={form.note} onChange={change('note')} placeholder="Acessos, hospedagem ou cuidados necessários" /></Field>
    </div>
  </Modal>;
}

function MaintenanceModal({ sites, selected, onClose, onSave }) {
  const [siteId, setSiteId] = useState(String(selected?.id || sites[0]?.id || ''));
  const [date, setDate] = useState('2026-08-09');
  const [owner, setOwner] = useState(selected?.owner === 'Não definido' ? '' : selected?.owner || '');
  const [summary, setSummary] = useState('Atualizações, backup e verificação geral');
  const submit = (event) => { event.preventDefault(); onSave(Number(siteId), { date, owner, summary }); };
  return <Modal title="Registrar manutenção" description="Adicione uma execução ao histórico do site." onClose={onClose} onSubmit={submit} submitLabel="Registrar execução">
    <div className="ms-form-grid">
      <Field label="Site"><select value={siteId} onChange={(event) => setSiteId(event.target.value)}>{sites.map((site) => <option value={site.id} key={site.id}>{site.client} · {site.site}</option>)}</select></Field>
      <Field label="Data"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
      <Field label="Responsável" wide><input required value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Pessoa responsável" /></Field>
      <Field label="Resumo da execução" wide><textarea required rows="4" value={summary} onChange={(event) => setSummary(event.target.value)} /></Field>
    </div>
  </Modal>;
}

function StatusBadge({ status }) {
  const tone = status === 'Ativo' ? 'active' : status === 'Atenção' ? 'attention' : 'pending';
  return <span className={`ms-badge ${tone}`}><span className="ms-dot" />{status}</span>;
}

function SitesPage({ sites, selected, setSelected, onNew, onMaintenance }) {
  const [query, setQuery] = useState('');
  const [contract, setContract] = useState('Todas');
  const [frequency, setFrequency] = useState('Todas');
  const [status, setStatus] = useState('Todos');
  const filtered = useMemo(() => sites.filter((site) => {
    const matchesQuery = `${site.client} ${site.site} ${site.owner}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (contract === 'Todas' || site.contract === contract) && (frequency === 'Todas' || site.frequency === frequency) && (status === 'Todos' || site.status === status);
  }), [sites, query, contract, frequency, status]);
  const active = sites.filter((site) => site.status === 'Ativo').length;
  const attention = sites.filter((site) => site.status === 'Atenção' || site.hosting === 'Externa').length;
  const executions = sites.reduce((total, site) => total + site.executions, 0);
  const next = sites.filter((site) => site.next !== '—').slice(0, 5).length;

  return <>
    <header className="ms-page-head"><div><p className="ms-eyebrow">Operação</p><h1>Sites gerenciados</h1><p>Contratos, frequência e histórico de manutenção em um só lugar.</p></div><div className="ms-page-actions"><button className="ms-button ghost" onClick={onMaintenance}><Icon name="receipt" size={17} />Registrar manutenção</button><button className="ms-button primary" onClick={onNew}><Icon name="plus" size={17} />Novo site</button></div></header>
    <section className="ms-metrics" aria-label="Resumo da operação">
      <Metric icon="world" label="Sites ativos" value={active} helper={`${sites.length} sites cadastrados`} />
      <Metric icon="circle-check" label="Execuções registradas" value={executions} helper="Histórico consolidado" />
      <Metric icon="calendar-event" label="Próximas manutenções" value={next} helper="Agenda programada" />
      <Metric icon="alert-circle" label="Pedem atenção" value={attention} helper="Dados ou hospedagem externa" tone="attention" />
    </section>
    <section className="ms-panel">
      <div className="ms-toolbar">
        <label className="ms-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, site ou responsável" /></label>
        <select aria-label="Filtrar contratação" value={contract} onChange={(event) => setContract(event.target.value)}><option>Todas</option><option>Hospedagem</option><option>Gestão Mensal</option><option>Gestão Trimestral</option><option>Não definido</option></select>
        <select aria-label="Filtrar frequência" value={frequency} onChange={(event) => setFrequency(event.target.value)}><option>Todas</option><option>Mensal</option><option>Trimestral</option><option>Semestral</option><option>Não definida</option></select>
        <select aria-label="Filtrar status" value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos</option><option>Ativo</option><option>Pendente</option><option>Atenção</option></select>
      </div>
      <div className="ms-table-wrap">
        <table className="ms-table"><thead><tr><th>Cliente / site</th><th>Contratação</th><th>Frequência</th><th>Status</th><th>Última</th><th>Próxima</th><th>Execuções</th><th>Responsável</th></tr></thead>
          <tbody>{filtered.map((site) => <tr key={site.id} className={selected?.id === site.id ? 'selected' : ''} onClick={() => setSelected(site)}>
            <td data-label="Cliente / site"><div className="ms-client-cell"><span>{initials(site.client)}</span><div><strong>{site.client}</strong><a href={`https://${site.site}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{site.site}<Icon name="arrow-up-right" size={12} /></a></div></div></td>
            <td data-label="Contratação"><span className={`ms-contract ${site.contract.includes('Gestão') ? 'management' : ''}`}>{site.contract}</span></td><td data-label="Frequência">{site.frequency}</td><td data-label="Status"><StatusBadge status={site.status} /></td><td data-label="Última">{site.last}</td><td data-label="Próxima">{site.next}</td><td data-label="Execuções" className="ms-number">{site.executions}</td><td data-label="Responsável">{site.owner}</td>
          </tr>)}</tbody></table>
        {!filtered.length && <div className="ms-empty"><Icon name="search" size={24} /><strong>Nenhum site encontrado</strong><span>Revise a busca ou os filtros aplicados.</span></div>}
      </div>
      <div className="ms-table-foot"><span>{filtered.length} de {sites.length} sites</span><span>Selecione uma linha para ver os detalhes</span></div>
    </section>
    {selected && <section className="ms-detail">
      <div className="ms-detail-head"><div className="ms-detail-title"><span className="ms-detail-mark">{initials(selected.client)}</span><div><p>Site selecionado</p><h2>{selected.client}</h2><a href={`https://${selected.site}`} target="_blank" rel="noreferrer">{selected.site}<Icon name="arrow-up-right" size={13} /></a></div></div><button className="ms-icon-button" onClick={() => setSelected(null)} aria-label="Fechar detalhes"><Icon name="x" size={18} /></button></div>
      <div className="ms-detail-grid"><div><span>Contratação</span><strong>{selected.contract}</strong></div><div><span>Frequência</span><strong>{selected.frequency}</strong></div><div><span>Hospedagem</span><strong>{selected.hosting}</strong></div><div><span>Responsável</span><strong>{selected.owner}</strong></div><div><span>E-mail</span><strong>{selected.email || 'Não informado'}</strong></div><div><span>Histórico</span><strong>{selected.executions} execuções</strong></div></div>
      <div className={`ms-note ${selected.status === 'Atenção' ? 'attention' : ''}`}><Icon name={selected.status === 'Atenção' ? 'alert-circle' : 'receipt'} size={18} /><div><strong>Observações operacionais</strong><p>{selected.note}</p></div></div>
      <div className="ms-detail-actions"><button className="ms-button ghost"><Icon name="pencil" size={16} />Editar cadastro</button><button className="ms-button primary" onClick={onMaintenance}><Icon name="plus" size={16} />Nova manutenção</button></div>
    </section>}
  </>;
}

function Overview({ sites, onOpenSites }) {
  const scheduled = sites.filter((site) => site.next !== '—').slice(0, 5);
  return <><header className="ms-page-head"><div><p className="ms-eyebrow">BASE</p><h1>Visão geral</h1><p>Acompanhe a saúde da operação de manutenção de sites.</p></div><button className="ms-button primary" onClick={onOpenSites}>Ver todos os sites<Icon name="arrow-right" size={17} /></button></header><div className="ms-overview-grid"><section className="ms-panel ms-overview-main"><div className="ms-section-head"><div><h2>Próximas manutenções</h2><p>Agenda operacional programada</p></div><Icon name="calendar-event" size={20} /></div>{scheduled.map((site) => <div className="ms-schedule-row" key={site.id}><span className="ms-date-box">{site.next.slice(0,5)}</span><div><strong>{site.client}</strong><span>{site.site} · {site.frequency}</span></div><StatusBadge status={site.status} /></div>)}</section><section className="ms-panel ms-overview-side"><div className="ms-section-head"><div><h2>Pontos de atenção</h2><p>Prioridades para revisão</p></div><Icon name="alert-circle" size={20} /></div>{sites.filter((site) => site.status === 'Atenção' || site.hosting === 'Externa').map((site) => <div className="ms-attention-row" key={site.id}><span>{initials(site.client)}</span><div><strong>{site.client}</strong><p>{site.note}</p></div></div>)}</section></div></>;
}

function Placeholder({ view, onBack }) {
  const item = NAV.find((nav) => nav.id === view);
  return <div className="ms-placeholder"><div><Icon name={item?.icon || 'layout-grid'} size={30} /></div><h1>{item?.label || 'Módulo'}</h1><p>Esta área está preparada na navegação e será detalhada em uma próxima etapa.</p><button className="ms-button primary" onClick={onBack}>Voltar para sites</button></div>;
}

export default function App() {
  const [sites, setSites] = useState(INITIAL_SITES);
  const [view, setView] = useState('sites');
  const [selected, setSelected] = useState(INITIAL_SITES[3]);
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const addSite = (form) => {
    const site = { ...form, id: Date.now(), executions: 0, last: '—', next: '—', owner: form.owner.trim() || 'Não definido', email: form.email.trim(), status: form.status || 'Ativo' };
    setSites((current) => [...current, site]); setSelected(site); setModal(null); setView('sites'); notify('Site cadastrado com sucesso');
  };
  const addMaintenance = (siteId, entry) => {
    const formatted = entry.date.split('-').reverse().join('/');
    setSites((current) => current.map((site) => site.id === siteId ? { ...site, executions: site.executions + 1, last: formatted, owner: entry.owner, status: 'Ativo' } : site));
    setSelected((current) => current?.id === siteId ? { ...current, executions: current.executions + 1, last: formatted, owner: entry.owner, status: 'Ativo' } : current);
    setModal(null); notify('Manutenção registrada no histórico');
  };
  return <div className="ms-app"><Sidebar view={view} onNavigate={setView} open={menuOpen} onClose={() => setMenuOpen(false)} /><div className="ms-shell"><header className="ms-topbar"><button className="ms-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Icon name="menu" size={20} /></button><div><strong>BASE</strong><span>Manutenção de sites</span></div><div className="ms-top-actions"><button aria-label="Ajuda"><Icon name="help-circle" size={18} /></button><button aria-label="Notificações"><Icon name="bell" size={18} /><span className="ms-notification-dot" /></button><span className="ms-top-avatar">TS</span></div></header><main className="ms-content">
    {view === 'sites' && <SitesPage sites={sites} selected={selected} setSelected={setSelected} onNew={() => setModal('site')} onMaintenance={() => setModal('maintenance')} />}
    {view === 'overview' && <Overview sites={sites} onOpenSites={() => setView('sites')} />}
    {!['sites', 'overview'].includes(view) && <Placeholder view={view} onBack={() => setView('sites')} />}
  </main></div>{modal === 'site' && <NewSiteModal onClose={() => setModal(null)} onSave={addSite} />}{modal === 'maintenance' && <MaintenanceModal sites={sites} selected={selected} onClose={() => setModal(null)} onSave={addMaintenance} />}{toast && <div className="ms-toast"><Icon name="circle-check" size={18} />{toast}</div>}</div>;
}
