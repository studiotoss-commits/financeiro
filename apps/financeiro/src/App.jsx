import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppSwitcher } from '@base/design-system';
import Icon from './components/Icon';
import ClientesView from './features/clients/ClientesView';
import AuthGate from './features/auth/AuthGate';
import { AreaChart, BF, Donut, Sparkline, brl, brl0, categoryBreakdown, fmtBR } from './lib/core';
import { loadFinanceState } from './services/financeRepository';
import { clientSaveError, findDuplicateClient, operationalEntries } from './services/clientModel';
import { sendFeedback } from './services/feedbackService';

// app.jsx — BASE Financeiro: full navigable app (Direction B). Needs icons.jsx + core.jsx.
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const NAV = [
  { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
  { sep: 'Financeiro' },
  { id: 'entradas', icon: 'trending-up', label: 'Entradas' },
  { id: 'saidas', icon: 'trending-down', label: 'Saídas' },
  { id: 'relatorios', icon: 'chart-pie', label: 'Relatórios' },
  { sep: 'Cadastros' },
  { id: 'clientes', icon: 'users', label: 'Clientes' },
  { id: 'clientes_ranking', icon: 'flame', label: 'Ranking de clientes', sub: true },
  { id: 'clientes_todos', icon: 'users', label: 'Todos os clientes', sub: true },
  { id: 'fornecedores', icon: 'building-store', label: 'Fornecedores' },
  { id: 'configuracoes', icon: 'settings', label: 'Configurações' },
];
const CATS_IN = ['Serviços', 'Projetos', 'Recebimentos', 'Outros'];
const CATS_OUT = ['Operações', 'Infraestrutura', 'Marketing', 'Energia', 'Impostos', 'Outros'];
const CATS_SUPPLIER = ['Prestadores de serviços', 'Software e licenças', 'Infraestrutura', 'Marketing', 'Contabilidade e jurídico', 'Outros'];
const CATS_BANK = ['Banco do Brasil', 'Bradesco', 'Caixa Econômica Federal', 'Itaú', 'Nubank', 'Santander'];
const ROUTES = {
  dashboard: '/dashboard',
  entradas: '/entradas',
  saidas: '/saidas',
  relatorios: '/relatorios',
  clientes: '/clientes',
  clientes_ranking: '/clientes/ranking',
  clientes_todos: '/clientes/todos',
  fornecedores: '/fornecedores',
  configuracoes: '/configuracoes',
};
const ROUTE_VIEWS = new Set(Object.keys(ROUTES));
const SHOW_DASHBOARD_HERO = false;
const BASE_APPS = [
  { id: 'not', name: 'NOT', shortName: 'NOT', description: 'Serviços, vencimentos e lembretes', href: import.meta.env.DEV ? 'http://127.0.0.1:5176/not/' : '/not/', color: '#5a39e6' },
  { id: 'financeiro', name: 'Financeiro', shortName: 'FI', description: 'Gestão financeira e comercial', href: '/', color: '#5a39e6' },
  { id: 'manutencao-sites', name: 'Manutenção de sites', shortName: 'MS', description: 'Sites, contratos e manutenções', href: import.meta.env.VITE_MANUTENCAO_SITES_URL || 'http://127.0.0.1:5173/', color: '#d2694d' },
];
const toLocalDateInput = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const RECURRENCE_MONTHS = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };
const RECURRENCE_LABELS = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUuid = (value) => UUID_PATTERN.test(String(value || '')) ? value : undefined;
const addMonthsToDate = (isoDate, months) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
};
const isEntryPaid = (entry) => Boolean(entry.effectiveDate || /^(pago|recebido|processado)$/i.test(entry.status || ''));
const entryDueDate = (entry) => entry.dueDate || entry.date;
const getEntryStatus = (entry, today = toLocalDateInput()) => {
  if (isEntryPaid(entry)) return entry.type === 'income' ? 'Recebido' : 'Pago';
  if (entryDueDate(entry) < today) return 'Atrasado';
  if (/^agendado$/i.test(entry.status || '')) return 'Agendado';
  return entry.type === 'income' ? 'A receber' : 'A pagar';
};
const statusTone = (status) => status === 'Atrasado' ? 'danger' : /^(Pago|Recebido)$/i.test(status) ? 'success' : status === 'Agendado' ? 'scheduled' : 'pending';
function PaymentSwitch({ paid, label, onChange }) {
  return <button type="button" role="switch" aria-checked={paid} aria-label={`${paid ? 'Marcar como não pago' : 'Marcar como pago'}: ${label}`} className={'fx-payment-switch ' + (paid ? 'active' : '')} onClick={()=>onChange(!paid)}><span className="fx-payment-switch-track"><span className="fx-payment-switch-thumb" /></span><span className="fx-payment-switch-label">{paid ? 'Pago' : 'Não pago'}</span></button>;
}
const buildRecurrenceEntries = (entry, entryId, now) => {
  const count = entry.isRecurring ? Math.max(1, Number(entry.recurrenceCount) || 12) : 1;
  const cadence = entry.recurrenceCadence || 'mensal';
  const interval = RECURRENCE_MONTHS[cadence] || 1;
  return Array.from({ length: count }, (_, index) => {
    const date = addMonthsToDate(entry.date, interval * index);
    const dueDate = addMonthsToDate(entry.dueDate || entry.date, interval * index);
    return {
      ...entry,
      id: index === 0 ? entryId : crypto.randomUUID(),
      date,
      dueDate,
      recurrenceSeriesId: entryId,
      recurrenceIndex: index + 1,
      recurrenceCount: count,
      recurrenceCadence: cadence,
      createdAt: index === 0 ? entry.createdAt || now : now,
      history: index === 0 && entry.history ? entry.history : [{ at: now, text: count > 1 ? `Ocorrência ${index + 1} de ${count} criada (${RECURRENCE_LABELS[cadence]})` : 'Registro criado' }],
    };
  });
};
const normalizeEntries = (rows) => rows.flatMap((raw) => {
  const entry = { ...raw, dueDate:raw.dueDate||raw.date, clientId:validUuid(raw.clientId), supplierId:validUuid(raw.supplierId), sourceEntryId:validUuid(raw.sourceEntryId), createdAt:raw.createdAt||`${raw.date}T09:00:00-03:00`, history:raw.history||[{at:`${raw.date}T09:00:00-03:00`,text:'Registro criado'}] };
  const isLegacyRecurring = (entry.incomeType === 'Recorrente' || entry.isRecurring) && !entry.recurrenceSeriesId;
  if (!isLegacyRecurring) return [entry];
  return buildRecurrenceEntries({ ...entry, isRecurring: true, recurrenceCadence: entry.recurrenceCadence || 'mensal', recurrenceCount: entry.recurrenceCount || 12 }, entry.id, entry.createdAt);
});

// ---------- chrome ----------
function Sidebar({ view, go, onFeedback, onLogout, drawer = false }) {
  return (
    <aside className={'fx-side' + (drawer ? ' fx-side-drawer-content' : '')} aria-label={drawer ? 'Menu principal' : undefined}>
      <AppSwitcher currentApp="financeiro" apps={BASE_APPS} />
      <nav className="fx-nav">
        {NAV.map((n, i) => n.sep
          ? <p className="fx-nav-label" key={i}>{n.sep}</p>
          : <button key={n.id} className={'fx-nav-item' + (n.sub ? ' sub' : '') + (view === n.id ? ' active' : '')} onClick={() => go(n.id)}>
              <Icon name={n.icon} size={n.sub ? 15 : 20} />{n.label}
            </button>
        )}
      </nav>
      <div className="fx-side-foot">
        <button className="fx-nav-item" onClick={onFeedback}><Icon name="message-square" size={20} />Feedback</button>
        <button className="fx-nav-item" onClick={onLogout}><Icon name="logout" size={20} />Sair</button>
      </div>
    </aside>
  );
}

function Topbar({ view, query, setQuery, onNew, onBurger, syncStatus }) {
  const label = view === 'saidas' ? 'Nova saída' : view === 'entradas' ? 'Novo recebimento' : 'Novo lançamento';
  return (
    <header className="fx-top">
      <button className="fx-icon fx-burger" onClick={onBurger} aria-label="Abrir menu"><Icon name="menu" size={20} /></button>
      <div className="fx-search">
        <Icon name="search" size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar transações, clientes…" />
      </div>
      <div className="fx-top-actions">
        <button className="fx-btn" onClick={onNew}><Icon name="plus" size={18} /><span className="lbl">{label}</span></button>
        <span className={'fx-sync-state ' + syncStatus}>{syncStatus === 'saving' ? 'Salvando…' : syncStatus === 'error' ? 'Falha ao salvar' : 'Salvo'}</span>
      </div>
    </header>
  );
}

function Tabbar({ view, go }) {
  const tabs = [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Início' },
    { id: 'entradas', icon: 'trending-up', label: 'Entradas' },
    { id: 'saidas', icon: 'trending-down', label: 'Saídas' },
    { id: 'clientes', icon: 'users', label: 'Clientes' },
  { id: 'clientes_ranking', icon: 'flame', label: 'Ranking de clientes', sub: true },
  { id: 'clientes_todos', icon: 'users', label: 'Todos os clientes', sub: true },
    { id: 'fornecedores', icon: 'building-store', label: 'Fornec.' },
  ];
  return (
    <nav className="fx-tabbar">
      {tabs.map((t) => (
        <button key={t.id} className={'fx-tab' + (view === t.id ? ' active' : '')} onClick={() => go(t.id)}>
          <Icon name={t.icon} size={21} />{t.label}
        </button>
      ))}
    </nav>
  );
}

function MonthNav({ cm, shift, onOpenCalendar }) {
  return (
    <div className="fx-month">
      <button className="fx-month-btn" onClick={() => shift(-1)}><Icon name="chevron-left" size={18} /></button>
      <button className="fx-month-label" onClick={onOpenCalendar} title="Escolher uma data no calendário"><Icon name="calendar" size={16}/>{MONTHS[cm.m]} de {cm.y}</button>
      <button className="fx-month-btn" onClick={() => shift(1)}><Icon name="chevron-right" size={18} /></button>
    </div>
  );
}

function PeriodPickerModal({ cm, onClose, onSelect }) {
  const today = new Date();
  const initialDay = cm.y === today.getFullYear() && cm.m === today.getMonth() ? today.getDate() : 1;
  const [date, setDate] = useState(toLocalDateInput(new Date(cm.y, cm.m, initialDay)));
  return <div className="fx-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="fx-modal" style={{width:'min(420px,100%)'}}>
      <div className="fx-modal-head"><div><h2>Selecionar período</h2><p>Escolha uma data para abrir rapidamente o mês correspondente.</p></div><button className="fx-icon sm" onClick={onClose} aria-label="Fechar calendário"><Icon name="x" size={18}/></button></div>
      <div className="fx-modal-body"><div className="fx-field"><label>Dia, mês e ano</label><input className="fx-input fx-num fx-calendar-input" type="date" value={date} onChange={(event)=>setDate(event.target.value)} autoFocus/></div></div>
      <div className="fx-modal-foot"><button className="fx-modal-cancel" onClick={onClose}>Cancelar</button><button className="fx-modal-save" disabled={!date} onClick={()=>onSelect(date)}><Icon name="calendar" size={17}/>Abrir período</button></div>
    </div>
  </div>;
}

// ---------- shared bits ----------
const ENTRY_OPTIONAL_COLUMNS = [
  { id:'party', label:'Cliente / fornecedor' },
  { id:'dueDate', label:'Vencimento' },
  { id:'installment', label:'Parcela' },
  { id:'bank', label:'Banco' },
  { id:'boleto', label:'Emissão de boleto', incomeOnly:true },
  { id:'invoice', label:'Emissão de Nota', incomeOnly:true },
  { id:'status', label:'Status' },
  { id:'payment', label:'Controle de pagamento' },
  { id:'actions', label:'Editar' },
];
const DEFAULT_ENTRY_COLUMNS = { party:true, dueDate:true, installment:false, bank:false, boleto:false, invoice:false, status:true, payment:true, actions:true };

function EntryColumnSelector({ kind, columns, onChange }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const available = ENTRY_OPTIONAL_COLUMNS.filter((column)=>!column.incomeOnly || kind === 'income');
  const activeCount = available.filter((column)=>columns[column.id]).length;
  useEffect(()=>{
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    const closeOutside = (event) => { if (!pickerRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return ()=>{ document.removeEventListener('keydown', closeOnEscape); document.removeEventListener('pointerdown', closeOutside); };
  },[open]);
  return <details ref={pickerRef} className="fx-column-picker" open={open} onToggle={(event)=>setOpen(event.currentTarget.open)}>
    <summary className="fx-btn ghost sm"><Icon name="layout-grid" size={16}/>Colunas<span className="fx-column-count">{activeCount}</span></summary>
    <div className="fx-column-menu" role="dialog" aria-label="Selecionar colunas visíveis">
      <div className="fx-column-menu-head"><div><strong>Colunas visíveis</strong><small>Ícone, descrição e valor são fixos.</small></div><button type="button" className="fx-column-close" onClick={()=>setOpen(false)} aria-label="Fechar seletor de colunas"><Icon name="x" size={16}/></button></div>
      {available.map((column)=><label className="fx-column-option" key={column.id}><input type="checkbox" checked={!!columns[column.id]} onChange={(event)=>onChange({...columns,[column.id]:event.target.checked})}/><span>{column.label}</span></label>)}
      <button type="button" className="fx-column-done" onClick={()=>setOpen(false)}>Concluir</button>
    </div>
  </details>;
}

function EntryRow({ e, onEdit, onPaymentStatus, clients, columns = DEFAULT_ENTRY_COLUMNS }) {
  const inc = e.type === 'income';
  const paid = isEntryPaid(e);
  const displayStatus = getEntryStatus(e);
  const client = inc ? (clients || []).find((item) => String(item.id) === String(e.clientId)) || (clients || []).find((item) => item.name?.trim().toLowerCase() === e.entity?.trim().toLowerCase()) : null;
  const displayEntity = client?.tradeName || e.entity;
  const gridColumns = [
    '42px', 'minmax(170px,1.35fr)',
    columns.party && 'minmax(120px,.85fr)',
    columns.dueDate && 'minmax(92px,.65fr)',
    columns.installment && '68px',
    columns.bank && 'minmax(92px,.65fr)',
    inc && columns.boleto && 'minmax(100px,.7fr)',
    inc && columns.invoice && 'minmax(100px,.7fr)',
    columns.status && '100px',
    columns.payment && onPaymentStatus && '98px',
    'minmax(112px,auto)',
    columns.actions && onEdit && '36px',
  ].filter(Boolean).join(' ');
  const visibleColumnCount = 3 + [columns.party,columns.dueDate,columns.installment,columns.bank,inc&&columns.boleto,inc&&columns.invoice,columns.status,columns.payment&&onPaymentStatus,columns.actions&&onEdit].filter(Boolean).length;
  const minWidth = 42 + 170 + 112 + (columns.party?120:0) + (columns.dueDate?92:0) + (columns.installment?68:0) + (columns.bank?92:0) + (inc&&columns.boleto?100:0) + (inc&&columns.invoice?100:0) + (columns.status?100:0) + (columns.payment&&onPaymentStatus?98:0) + (columns.actions&&onEdit?36:0) + ((visibleColumnCount-1)*14);
  return (
    <div className="fx-entry" style={{gridTemplateColumns:gridColumns,minWidth}}>
      <div className={'fx-entry-ic ' + (inc ? 'income' : 'expense')}>
        <Icon name={inc ? 'arrow-down-left' : 'arrow-up-right'} size={20} />
      </div>
      <div className="fx-entry-main">
        <p className="fx-entry-desc">{e.desc}</p>
        <p className="fx-entry-meta">{e.cat}{e.isRecurring && ` · ${RECURRENCE_LABELS[e.recurrenceCadence] || 'Recorrente'}`}</p>
      </div>
      {columns.party && <div className="fx-entry-party fx-entry-optional">
        <span>{inc ? 'Cliente' : 'Fornecedor'}</span>
        <strong>{displayEntity}</strong>
        <small>{inc ? 'Pagador' : 'Beneficiário'}</small>
      </div>}
      {columns.dueDate && <div className="fx-entry-fact fx-entry-optional"><small>Vencimento</small><strong>{fmtBR(entryDueDate(e))}</strong></div>}
      {columns.installment && <div className="fx-entry-fact fx-entry-optional"><small>Parcela</small><strong>{Number(e.installmentNumber) || e.recurrenceIndex || 1}/{Number(e.installments) || e.recurrenceCount || 1}</strong></div>}
      {columns.bank && <div className="fx-entry-fact fx-entry-optional"><small>Banco</small><strong>{e.bankAccount || 'Não informado'}</strong></div>}
      {inc && columns.boleto && <div className="fx-entry-fact fx-entry-optional"><small>Emissão boleto</small><strong>{e.boletoIssuedAt ? fmtBR(e.boletoIssuedAt) : 'Não emitido'}</strong></div>}
      {inc && columns.invoice && <div className="fx-entry-fact fx-entry-optional"><small>Emissão de Nota</small><strong>{e.invoiceIssuedAt ? fmtBR(e.invoiceIssuedAt) : 'Não emitida'}</strong></div>}
      {columns.status && <div className="fx-entry-status-col fx-entry-optional"><span className={'fx-status-badge ' + statusTone(displayStatus)}>{displayStatus}</span></div>}
      {columns.payment && onPaymentStatus && <div className="fx-entry-payment-col fx-entry-optional"><PaymentSwitch paid={paid} label={e.desc} onChange={(next)=>onPaymentStatus(e,next)} /></div>}
      <div className="fx-entry-right">
        <div className={'fx-entry-amt fx-num ' + (inc ? 'income' : 'expense')}>{inc ? '+ ' : '− '}{brl(e.amount)}</div>
      </div>
      {columns.actions && onEdit && <button className="fx-entry-edit fx-entry-optional" onClick={() => onEdit(e)} title="Editar"><Icon name="pencil" size={16} /></button>}
    </div>
  );
}

function BentoKpi({ tint, icon, label, value, valueColor, chip, chipType, spark, sparkColor }) {
  return (
    <div className="fx-bento-kpi">
      <div className="fx-kpi-top">
        <div className={'fx-kpi-ic ' + tint}><Icon name={icon} size={21} /></div>
        <span className={'fx-chip ' + chipType}>{chip}</span>
      </div>
      <p className="fx-kpi-label">{label}</p>
      <p className="fx-kpi-val fx-num" style={valueColor ? { color: valueColor } : null}>{value}</p>
      <div className="fx-kpi-spark" style={{ marginTop: 'auto', paddingTop: 14 }}><Sparkline values={spark} color={sparkColor} /></div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return <div className="fx-empty"><div className="ic"><Icon name={icon} size={26} /></div><p>{text}</p></div>;
}

// ---------- pages ----------
function Dashboard({ stats, entries, onEdit, go, hasData, cm, taxRate, onConfigureTax }) {
  const cats = categoryBreakdown(entries);
  const catTotal = cats.reduce((s, c) => s + c.amount, 0) || 1;
  return (
    <section className="fx-bento">
      <div className="fx-tax-notice" style={{ gridColumn: '1 / -1' }}><Icon name="receipt" size={20} /><div><b>{taxRate ? `Previsão de impostos configurada em ${taxRate}%` : 'Você sabe qual é a taxa média de imposto da sua empresa?'}</b><p>{taxRate ? 'Entradas com nota fiscal compõem o indicador mensal na aba Saídas, sem criar novos lançamentos.' : 'Cadastre essa informação para visualizar uma previsão dos impostos sobre as entradas com nota fiscal.'}</p></div><button className="fx-btn ghost sm" onClick={onConfigureTax}>{taxRate ? 'Alterar taxa' : 'Configurar'}</button></div>
      {SHOW_DASHBOARD_HERO && <div className="fx-hero">
        <p className="fx-hero-eyebrow">Saldo em caixa</p>
        <p className="fx-hero-val fx-num">{brl(stats.saldo)}</p>
        <span className="fx-hero-chip"><Icon name="arrow-up-right" size={14} />+{brl0(stats.saldo)} em {MONTHS[cm.m].toLowerCase()}</span>
        <div style={{ marginTop: 20, position: 'relative' }}>
          {hasData ? <AreaChart values={BF.flow} dark h={120} />
            : <div style={{ height: 120, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,.6)', fontSize: 13 }}>Sem movimentação neste período</div>}
        </div>
        <div className="fx-hero-mini">
          <div className="fx-hero-stat"><div className="lb"><Icon name="arrow-down-left" size={14} />Receitas</div><div className="vl fx-num">{brl0(stats.receitas)}</div></div>
          <div className="fx-hero-stat"><div className="lb"><Icon name="arrow-up-right" size={14} />Despesas</div><div className="vl fx-num">{brl0(stats.despesas)}</div></div>
        </div>
        <div className="fx-hero-actions">
          <button className="fx-hero-btn solid" onClick={() => go('__new_income')}><Icon name="plus" size={18} />Novo lançamento</button>
          <button className="fx-hero-btn ghost"><Icon name="arrows-exchange" size={18} />Transferir</button>
        </div>
      </div>}

      <BentoKpi tint="t-pos" icon="trending-up" label="Receitas" value={brl(stats.receitas)} valueColor="var(--pos)"
        chip={stats.nIn + ' entradas'} chipType="pos" spark={BF.spark.receitas} sparkColor="#0ca678" />
      <BentoKpi tint="t-neg" icon="trending-down" label="Despesas" value={brl(stats.despesas)} valueColor="var(--neg)"
        chip={stats.nOut + ' saídas'} chipType="neutral" spark={BF.spark.despesas} sparkColor="#f43f6b" />

      <div className="fx-card fx-pad fx-dashboard-categories">
        <div className="fx-card-head">
          <div><h3 className="fx-card-title">Gastos por categoria</h3><p className="fx-card-sub">{MONTHS[cm.m]} de {cm.y}</p></div>
          <button className="fx-link" onClick={() => go('relatorios')}>Relatório<Icon name="chevron-right" size={15} /></button>
        </div>
        {cats.length ? (
          <div className="fx-donut-wrap">
            <Donut segments={cats} />
            <div className="fx-donut-legend">
              {cats.map((c, i) => (
                <div className="fx-dl-row" key={i}>
                  <span className="fx-dl-dot" style={{ background: c.color }}></span>
                  <span className="fx-dl-name">{c.name}</span>
                  <span className="fx-dl-val fx-num">{brl0(c.amount)}</span>
                  <span className="fx-dl-pct fx-num">{Math.round(c.amount / catTotal * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : <EmptyState icon="chart-pie" text="Nenhuma despesa registrada." />}
      </div>

      <div className="fx-card fx-pad fx-dashboard-activity">
        <div className="fx-card-head">
          <h3 className="fx-card-title">Atividades recentes</h3>
          <button className="fx-link" onClick={() => go('entradas')}>Ver tudo<Icon name="chevron-right" size={15} /></button>
        </div>
        {entries.length ? entries.slice(0, 4).map((e) => <EntryRow e={e} key={e.id} onEdit={onEdit} />)
          : <EmptyState icon="receipt" text="Nenhum lançamento neste período." />}
      </div>

    </section>
  );
}

function ListPage({ kind, entries, clients, onEdit, onNew, onPaymentStatus, query, taxForecast = 0, taxRate = 0, invoiceCount = 0 }) {
  const inc = kind === 'income';
  const storageKey = `base.financeiro.entry-columns.${kind}`;
  const [visibleColumns, setVisibleColumns] = useState(()=>{
    try { return {...DEFAULT_ENTRY_COLUMNS,...JSON.parse(localStorage.getItem(storageKey) || '{}')}; }
    catch { return DEFAULT_ENTRY_COLUMNS; }
  });
  useEffect(()=>{ localStorage.setItem(storageKey,JSON.stringify(visibleColumns)); },[storageKey,visibleColumns]);
  const list = entries.filter((e) => e.type === kind);
  const total = list.reduce((s, e) => s + e.amount, 0);
  const paidTotal = list.filter(isEntryPaid).reduce((sum, e) => sum + e.amount, 0);
  const payableTotal = total - paidTotal;
  return (
    <div className="fx-card fx-pad">
      <div className="fx-card-head">
        <div>
          <h3 className="fx-card-title">{inc ? 'Entradas' : 'Saídas'}</h3>
          <p className="fx-card-sub">{list.length} lançamento{list.length !== 1 ? 's' : ''}{query ? ' · filtrando “' + query + '”' : ''}</p>
        </div>
        <div className="fx-card-actions"><EntryColumnSelector kind={kind} columns={visibleColumns} onChange={setVisibleColumns}/><button className="fx-btn sm" onClick={onNew}><Icon name="plus" size={16} />{inc ? 'Novo recebimento' : 'Novo pagamento'}</button></div>
      </div>
      <div className="fx-summary" style={{ marginBottom: 16 }}>
        {inc ? <div className="fx-sumcard accent"><div className="fx-sum-lb">Total recebido</div><div className="fx-sum-vl fx-num" style={{ color:'var(--pos)' }}>{brl(paidTotal)}</div></div> : <>
          <div className="fx-sumcard payable"><div className="fx-sum-lb">Total a pagar</div><div className="fx-sum-vl fx-num">{brl(payableTotal)}</div></div>
          <div className="fx-sumcard paid"><div className="fx-sum-lb">Total pago</div><div className="fx-sum-vl fx-num">{brl(paidTotal)}</div></div>
          <div className="fx-sumcard tax-forecast"><div className="fx-sum-lb">Previsão de impostos</div><div className="fx-sum-vl fx-num">{brl(taxForecast)}</div><div className="fx-sum-note">{taxRate ? `${taxRate}% sobre ${invoiceCount} entrada${invoiceCount === 1 ? '' : 's'} com nota` : 'Configure a taxa nas configurações'}</div></div>
        </>}
        <div className="fx-sumcard">
          <div className="fx-sum-lb">Lançamentos</div>
          <div className="fx-sum-vl fx-num">{list.length}</div>
        </div>
        {inc && <div className="fx-sumcard">
          <div className="fx-sum-lb">Ticket médio</div>
          <div className="fx-sum-vl fx-num">{list.length ? brl0(total / list.length) : 'R$ 0'}</div>
        </div>}
      </div>
      <div className="fx-entry-list">{list.length ? list.map((e) => <EntryRow e={e} key={e.id} clients={clients} columns={visibleColumns} onEdit={onEdit} onPaymentStatus={onPaymentStatus} />)
        : <EmptyState icon={inc ? 'trending-up' : 'trending-down'} text={`Nenhuma ${inc ? 'entrada' : 'saída'} encontrada neste período.`} />}
      </div>
    </div>
  );
}

function SupplierModal({ initial, onClose, onSave, supplierCategories }) {
  const isEdit = !!initial.id;
  const initialForm = { name:initial.name||'', tradeName:initial.tradeName||initial.name||'', document:initial.cnpj||initial.document||'', segment:initial.segment||'', contactName:initial.contactName||'', phone:initial.phone||'', whatsapp:initial.whatsapp||'', email:initial.email||initial.contact||'', address:initial.address||'', stateRegistration:initial.stateRegistration||'', cityRegistration:initial.cityRegistration||'', status:initial.status||'Ativo', notes:initial.notes||'', amount:initial.amount||'' };
  const [f, setF] = useState(initialForm);
  const [err,setErr]=useState(false);
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const set=(key)=>(e)=>setF({...f,[key]:e.target.value});
  const requestClose=()=>JSON.stringify(f)!==JSON.stringify(initialForm)?setConfirmDiscard(true):onClose();
  const save=()=>{ if(!f.name.trim() || !f.email.trim()){setErr(true);return;} onSave({...initial,name:f.name.trim(),tradeName:f.tradeName.trim()||f.name.trim(),cnpj:f.document.trim()||'—',document:f.document.trim(),segment:f.segment.trim()||'Geral',contactName:f.contactName.trim(),phone:f.phone.trim(),whatsapp:f.whatsapp.trim(),email:f.email.trim(),contact:f.email.trim(),address:f.address.trim(),stateRegistration:f.stateRegistration.trim(),cityRegistration:f.cityRegistration.trim(),status:f.status,notes:f.notes.trim(),amount:Number(f.amount)||0}); };
  return <><div className="fx-overlay" onClick={e=>{if(e.target===e.currentTarget)requestClose()}}><div className="fx-modal" style={{width:'min(640px,100%)'}}><div className="fx-modal-head"><div><h2>{isEdit?'Editar fornecedor':'Novo fornecedor'}</h2><p>{isEdit?'Atualize os dados cadastrais.':'Cadastre uma empresa ou profissional fornecedor.'}</p></div><button className="fx-icon sm" onClick={requestClose}><Icon name="x" size={18}/></button></div><div className="fx-modal-body"><div className="fx-row2"><div className="fx-field"><label>Razão Social ou nome *</label><input className="fx-input" value={f.name} onChange={set('name')} style={err&&!f.name.trim()?{borderColor:'var(--neg)'}:null}/></div><div className="fx-field"><label>Nome Fantasia</label><input className="fx-input" value={f.tradeName} onChange={set('tradeName')}/></div></div><div className="fx-row2"><div className="fx-field"><label>CNPJ ou CPF</label><input className="fx-input fx-num" value={f.document} onChange={set('document')} placeholder="00.000.000/0001-00"/></div><div className="fx-field"><label>Categoria do fornecedor</label><input className="fx-input" list="supplier-category-options" value={f.segment} onChange={set('segment')} placeholder="Selecione ou pesquise"/><datalist id="supplier-category-options">{(supplierCategories||[]).map(category=><option value={category} key={category}/>)}</datalist></div></div><div className="fx-fieldset"><span className="fx-fieldset-lb">Contato principal</span></div><div className="fx-row2"><div className="fx-field"><label>Responsável</label><input className="fx-input" value={f.contactName} onChange={set('contactName')}/></div><div className="fx-field"><label>E-mail *</label><input className="fx-input" type="email" value={f.email} onChange={set('email')} style={err&&!f.email.trim()?{borderColor:'var(--neg)'}:null}/></div></div><div className="fx-row2"><div className="fx-field"><label>Telefone</label><input className="fx-input" value={f.phone} onChange={set('phone')}/></div><div className="fx-field"><label>WhatsApp</label><input className="fx-input" value={f.whatsapp} onChange={set('whatsapp')}/></div></div><div className="fx-field"><label>Endereço</label><input className="fx-input" value={f.address} onChange={set('address')}/></div><div className="fx-row2"><div className="fx-field"><label>Inscrição Estadual</label><input className="fx-input" value={f.stateRegistration} onChange={set('stateRegistration')}/></div><div className="fx-field"><label>Inscrição Municipal</label><input className="fx-input" value={f.cityRegistration} onChange={set('cityRegistration')}/></div></div><div className="fx-row2"><div className="fx-field"><label>Status</label><select className="fx-select" value={f.status} onChange={set('status')}><option>Ativo</option><option>Recorrente</option><option>Mensal</option><option>Variável</option><option>Inativo</option></select></div><div className="fx-field"><label>Valor mensal estimado</label><input className="fx-input fx-num" type="number" min="0" value={f.amount} onChange={set('amount')}/></div></div><div className="fx-field"><label>Observações</label><textarea className="fx-input" rows="3" value={f.notes} onChange={set('notes')}/></div></div><div className="fx-modal-foot"><button className="fx-modal-cancel" onClick={requestClose}>Cancelar</button><button className="fx-modal-save" onClick={save}><Icon name="check" size={17}/>{isEdit?'Salvar alterações':'Cadastrar fornecedor'}</button></div></div></div>{confirmDiscard&&<div className="fx-overlay fx-discard-overlay"><div className="fx-modal fx-discard-modal"><div className="fx-modal-body"><div className="fx-confirm-ic warn"><Icon name="alert-circle" size={26}/></div><div><h2>Salvar alterações?</h2><p>Existem dados preenchidos neste fornecedor. Deseja continuar editando, salvar ou descartar?</p></div></div><div className="fx-modal-foot"><button className="fx-modal-cancel" onClick={()=>setConfirmDiscard(false)}>Continuar editando</button><button className="fx-btn" onClick={save}>Salvar</button><button className="fx-modal-save danger" onClick={onClose}>Descartar</button></div></div></div>}</>;
}

function ContactsPage({ query, suppliers, supplierCategories, onSave, onDelete, notify }) {
  const [modal,setModal]=useState(null); const [del,setDel]=useState(null);
  const rows=[...suppliers].filter(c=>!query||(c.name+c.segment+(c.contact||'')).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>(a.tradeName||a.name).localeCompare(b.tradeName||b.name,'pt-BR'));
  const save=(payload)=>{onSave(payload);setModal(null);notify(payload.id?'Fornecedor atualizado':'Fornecedor cadastrado')};
  return <React.Fragment><div className="fx-card fx-pad"><div className="fx-card-head"><div><h3 className="fx-card-title">Fornecedores</h3><p className="fx-card-sub">{rows.length} cadastro{rows.length!==1?'s':''}</p></div><button className="fx-btn sm" onClick={()=>setModal({})}><Icon name="plus" size={16}/>Novo fornecedor</button></div>{rows.length?rows.map(c=><div className="fx-contact" key={c.id}><div className="fx-contact-ic">{c.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div><div className="fx-contact-main"><p className="fx-contact-name">{c.tradeName||c.name}</p><p className="fx-contact-sub"><Icon name="mail" size={13}/>{c.contact||c.email} · {c.segment}</p></div><div className="fx-contact-right"><span className={'fx-badge '+(c.status==='Recorrente'?'indigo':c.status==='Ativo'?'pos':'')}>{c.status}</span><div className="fx-contact-amt"><div className="lb">Mensal</div><div className="vl fx-num">{c.amount>0?brl0(c.amount):'—'}</div></div><div className="fx-row-actions"><button className="fx-icon sm" title="Editar" onClick={()=>setModal({...c})}><Icon name="pencil" size={15}/></button><button className="fx-icon sm danger" title="Excluir" onClick={()=>setDel(c)}><Icon name="trash" size={15}/></button></div></div></div>):<EmptyState icon="users" text="Nenhum fornecedor encontrado."/>}</div>{modal&&<SupplierModal initial={modal} supplierCategories={supplierCategories} onClose={()=>setModal(null)} onSave={save}/>} {del&&<div className="fx-overlay"><div className="fx-modal" style={{width:'min(420px,100%)'}}><div className="fx-modal-body" style={{alignItems:'center',textAlign:'center',paddingTop:30}}><div className="fx-confirm-ic"><Icon name="trash" size={26}/></div><h2 style={{margin:0,fontSize:19}}>Excluir fornecedor?</h2><p style={{color:'var(--muted)',lineHeight:1.5}}>O fornecedor <b>{del.name}</b> será removido. Esta ação não pode ser desfeita.</p></div><div className="fx-modal-foot"><button className="fx-modal-cancel" onClick={()=>setDel(null)}>Cancelar</button><button className="fx-modal-save danger" onClick={()=>{onDelete(del.id);setDel(null);notify('Fornecedor excluído')}}>Excluir</button></div></div></div>}</React.Fragment>;
}
function Relatorios({ entries, stats, hasData, cm }) {
  const cats = categoryBreakdown(entries);
  const catTotal = cats.reduce((s, c) => s + c.amount, 0) || 1;
  return (
    <React.Fragment>
      <div className="fx-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <div className="fx-card fx-pad">
          <div className="fx-flow-head">
            <div><h3 className="fx-card-title">Saldo acumulado</h3><p className="fx-flow-val fx-num">{brl(stats.saldo)}</p></div>
            <div className="fx-legend"><span><i style={{ background: '#5a39e6' }}></i>Saldo do mês</span></div>
          </div>
          {hasData ? <div style={{ marginTop: 10 }}><AreaChart values={BF.flow} color="#5a39e6" h={250} />
            <div className="fx-axis">{BF.axis.map((a) => <span key={a}>{a}</span>)}</div></div>
            : <EmptyState icon="chart-pie" text="Sem dados para gráfico neste período." />}
        </div>
        <div className="fx-card fx-pad">
          <div className="fx-card-head"><h3 className="fx-card-title">Gastos por categoria</h3></div>
          {cats.length ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <Donut segments={cats} size={170} />
            <div className="fx-donut-legend" style={{ width: '100%' }}>
              {cats.map((c, i) => (
                <div className="fx-dl-row" key={i}>
                  <span className="fx-dl-dot" style={{ background: c.color }}></span>
                  <span className="fx-dl-name">{c.name}</span>
                  <span className="fx-dl-val fx-num">{brl0(c.amount)}</span>
                  <span className="fx-dl-pct fx-num">{Math.round(c.amount / catTotal * 100)}%</span>
                </div>
              ))}
            </div>
          </div> : <EmptyState icon="chart-pie" text="Nenhuma despesa." />}
        </div>
      </div>
      <div className="fx-card fx-pad">
        <div className="fx-card-head"><h3 className="fx-card-title">Receitas e despesas por categoria</h3></div>
        <div className="fx-cats">
          {cats.map((c, i) => (
            <div key={i}>
              <div className="fx-cat-top">
                <span className="fx-cat-name"><span className="fx-cat-dot" style={{ background: c.color }}></span>{c.name}</span>
                <span className="fx-cat-val fx-num">{brl0(c.amount)} · {Math.round(c.amount / catTotal * 100)}%</span>
              </div>
              <div className="fx-cat-bar"><div className="fx-cat-fill" style={{ width: Math.round(c.amount / catTotal * 100) + '%', background: c.color }}></div></div>
            </div>
          ))}
          {!cats.length && <EmptyState icon="chart-pie" text="Sem despesas para detalhar." />}
        </div>
      </div>
    </React.Fragment>
  );
}

function SettingsView({ account, onAccount, categories, onAddCategory, onRenameCategory, onDeleteCategory, entries, suppliers, onUpdatePassword }) {
  const [draft, setDraft] = useState(account);
  const [newCat, setNewCat] = useState({ income: '', expense: '', supplier: '', bank: '' });
  const [passwordDraft, setPasswordDraft] = useState({ password: '', confirmation: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const remove = (type, name) => {
    const used = type === 'supplier' ? suppliers.some((supplier) => supplier.segment === name) : type === 'bank' ? entries.some((entry) => entry.bankAccount === name) : entries.some((e) => e.type === type && e.cat === name);
    if (used) { window.alert(`A categoria “${name}” está vinculada a ${type === 'supplier' ? 'fornecedores' : 'bank' ? 'lançamentos bancários' : 'lançamentos'} e não pode ser excluída.`); return; }
    onDeleteCategory(type, name);
  };
  const add = (type) => {
    const name = newCat[type].trim();
    if (!name) return;
    onAddCategory(type, name);
    setNewCat((current) => ({ ...current, [type]: '' }));
  };
  const categoryGroups = [
    { type: 'income', title: 'Categorias de serviços e entradas', description: 'Organize as receitas por serviço, produto ou origem.', icon: 'trending-up' },
    { type: 'expense', title: 'Categorias de despesas', description: 'Organize custos, impostos e demais saídas.', icon: 'trending-down' },
    { type: 'supplier', title: 'Categorias de fornecedores', description: 'Identifique prestadores, licenças, infraestrutura e outros fornecedores.', icon: 'building-store' },
    { type: 'bank', title: 'Bancos', description: 'Cadastre os bancos e contas disponíveis para pagamentos e recebimentos.', icon: 'building' },
  ];
  const savePassword = async () => {
    setPasswordStatus({ type: '', message: '' });
    if (passwordDraft.password.length < 8) {
      setPasswordStatus({ type: 'error', message: 'A senha precisa ter pelo menos 8 caracteres.' });
      return;
    }
    if (passwordDraft.password !== passwordDraft.confirmation) {
      setPasswordStatus({ type: 'error', message: 'As senhas informadas não são iguais.' });
      return;
    }
    setPasswordSaving(true);
    const { error } = await onUpdatePassword(passwordDraft.password);
    if (error) setPasswordStatus({ type: 'error', message: 'Não foi possível atualizar a senha. Tente novamente.' });
    else {
      setPasswordDraft({ password: '', confirmation: '' });
      setPasswordStatus({ type: 'success', message: 'Senha definida com sucesso. Seu próximo acesso já está garantido.' });
    }
    setPasswordSaving(false);
  };

  return (
    <div className="fx-settings-page">
      <section className="fx-card fx-settings-section">
        <div className="fx-settings-section-head">
          <div className="fx-settings-section-icon"><Icon name="building" size={20}/></div>
          <div><h2>Dados da conta</h2><p>Informações gerais utilizadas em todo o sistema.</p></div>
        </div>
        <div className="fx-settings-section-body">
          <div className="fx-field"><label>Nome da conta ou empresa</label><input className="fx-input" value={draft.company} onChange={e=>setDraft({...draft,company:e.target.value})}/></div>
          <div className="fx-row2"><div className="fx-field"><label>Responsável</label><input className="fx-input" value={draft.owner} onChange={e=>setDraft({...draft,owner:e.target.value})}/></div><div className="fx-field"><label>E-mail</label><input className="fx-input" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></div></div>
          <div className="fx-field"><label>Taxa média estimada de imposto (%)</label><input className="fx-input fx-num" type="number" min="0" max="100" value={draft.taxRate || ''} onChange={e=>setDraft({...draft,taxRate:Number(e.target.value)||0})}/><small className="fx-help">Usada apenas para previsão financeira; não constitui cálculo fiscal ou contábil.</small></div>
          <div className="fx-settings-actions"><button className="fx-btn" onClick={()=>onAccount(draft)}><Icon name="check" size={16}/>Salvar dados da conta</button></div>
        </div>
      </section>

      <section className="fx-card fx-settings-section">
        <div className="fx-settings-section-head">
          <div className="fx-settings-section-icon"><Icon name="lock" size={20}/></div>
          <div><h2>Senha de acesso</h2><p>Defina ou altere a senha usada para entrar no BASE Financeiro.</p></div>
        </div>
        <div className="fx-settings-section-body">
          <div className="fx-row2">
            <div className="fx-field"><label>Nova senha</label><input className="fx-input" type="password" autoComplete="new-password" minLength="8" value={passwordDraft.password} onChange={e=>setPasswordDraft({...passwordDraft,password:e.target.value})}/></div>
            <div className="fx-field"><label>Confirmar nova senha</label><input className="fx-input" type="password" autoComplete="new-password" minLength="8" value={passwordDraft.confirmation} onChange={e=>setPasswordDraft({...passwordDraft,confirmation:e.target.value})}/></div>
          </div>
          {passwordStatus.message && <div className={passwordStatus.type === 'error' ? 'fx-auth-error' : 'fx-password-success'}><Icon name={passwordStatus.type === 'error' ? 'alert-circle' : 'circle-check'} size={17}/>{passwordStatus.message}</div>}
          <div className="fx-settings-actions"><button className="fx-btn" disabled={passwordSaving} onClick={savePassword}><Icon name="lock" size={16}/>{passwordSaving ? 'Salvando…' : 'Definir nova senha'}</button></div>
        </div>
      </section>

      <section className="fx-card fx-settings-section">
        <div className="fx-settings-section-head">
          <div className="fx-settings-section-icon"><Icon name="receipt" size={20}/></div>
          <div><h2>Categorias financeiras</h2><p>Adicione, renomeie ou exclua as categorias usadas nos lançamentos.</p></div>
        </div>
        <div className="fx-settings-section-body fx-category-groups">
          {categoryGroups.map(({ type, title, description, icon }) => (
            <div className="fx-category-group" key={type}>
              <div className="fx-category-group-head"><div className={`fx-category-group-icon ${type}`}><Icon name={icon} size={18}/></div><div><h3>{title}</h3><p>{description}</p></div></div>
              <div className="fx-category-list">{(categories[type] || []).map(name=><div className="fx-category-item" key={name}><span>{name}</span><div className="fx-category-actions"><button className="fx-icon sm" title="Renomear categoria" aria-label={`Renomear ${name}`} onClick={()=>{const next=window.prompt('Novo nome da categoria',name);if(next?.trim())onRenameCategory(type,name,next.trim())}}><Icon name="pencil" size={14}/></button><button className="fx-icon sm danger" title="Excluir categoria" aria-label={`Excluir ${name}`} onClick={()=>remove(type,name)}><Icon name="trash" size={14}/></button></div></div>)}</div>
              <div className="fx-inline-add"><input className="fx-input" value={newCat[type]} onChange={e=>setNewCat({...newCat,[type]:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')add(type)}} placeholder={type==='income'?'Nova categoria de entrada':type==='expense'?'Nova categoria de despesa':type==='supplier'?'Nova categoria de fornecedor':'Novo banco ou conta'}/><button className="fx-btn sm" onClick={()=>add(type)}><Icon name="plus" size={15}/>Adicionar</button></div>
              <small className="fx-category-note"><Icon name="alert-circle" size={13}/>Categorias vinculadas a {type === 'supplier' ? 'fornecedores' : type === 'bank' ? 'movimentações' : 'lançamentos'} não podem ser excluídas.</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
// ---------- modal ----------
function LancamentoModal({ initial, onClose, onSave, categories, clients, suppliers, onAddCategory, onQuickEntity, onSettle, onPaymentStatus }) {
  const isEdit = !!initial.id;
  const [type, setType] = useState(initial.type || 'income');
  const initialStatus = isEntryPaid(initial) ? ((initial.type || 'income') === 'income' ? 'Recebido' : 'Pago') : /^agendado$/i.test(initial.status || '') ? 'Agendado' : (initial.type || 'income') === 'income' ? 'A receber' : 'A pagar';
  const [desc, setDesc] = useState(initial.desc || '');
  const [amount, setAmount] = useState(initial.amount || '');
  const [date, setDate] = useState(initial.date || toLocalDateInput());
  const [dueDate, setDueDate] = useState(initial.dueDate || initial.date || toLocalDateInput());
  const [cat, setCat] = useState(initial.cat || (type === 'income' ? 'Serviços' : 'Operações'));
  const [entity, setEntity] = useState(initial.entity || '');
  const [entityId, setEntityId] = useState(initial.clientId || initial.supplierId || '');
  const [status, setStatus] = useState(initialStatus);
  const [installments, setInstallments] = useState(initial.installments || 1);
  const [installmentNumber, setInstallmentNumber] = useState(initial.installmentNumber || initial.recurrenceIndex || 1);
  const [paymentMethod, setPaymentMethod] = useState(initial.paymentMethod || 'Transferência');
  const [bankAccount, setBankAccount] = useState(initial.bankAccount || '');
  const [boletoIssuedAt, setBoletoIssuedAt] = useState(initial.boletoIssuedAt || '');
  const [boletoDetails, setBoletoDetails] = useState(initial.boletoDetails || '');
  const [incomeType, setIncomeType] = useState(initial.incomeType === 'Recorrente' ? 'Serviço' : (initial.incomeType || 'Serviço'));
  const [recurringCategory, setRecurringCategory] = useState(initial.recurringCategory || 'Gestão');
  const [isRecurring, setIsRecurring] = useState(initial.isRecurring || initial.incomeType === 'Recorrente');
  const initialLaunchMode = initial.launchMode || ((initial.isRecurring || initial.incomeType === 'Recorrente') ? 'recurring' : Number(initial.installments) > 1 ? 'installment' : 'single');
  const [launchMode, setLaunchMode] = useState(initialLaunchMode);
  const [recurrenceCadence, setRecurrenceCadence] = useState(initial.recurrenceCadence || 'mensal');
  const [recurrenceCount, setRecurrenceCount] = useState(initial.recurrenceCount || 12);
  const [hasInvoice, setHasInvoice] = useState(initial.hasInvoice ?? false);
  const [invoiceIssuedAt, setInvoiceIssuedAt] = useState(initial.invoiceIssuedAt || '');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [quickEntity, setQuickEntity] = useState(false);
  const [err, setErr] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const cats = categories[type];
  const entities = type === 'income' ? clients.filter(c => (!c.archivedAt&&!c.appArchivedAt) || c.id === entityId) : suppliers;
  const matches = entity.length >= 3 ? entities.filter(x => x.name.toLowerCase().includes(entity.toLowerCase())).slice(0, 6) : [];

  const draftState = { type, desc, amount: String(amount), date, dueDate, cat, entity, entityId: String(entityId), status, launchMode, installments: String(installments), installmentNumber: String(installmentNumber), paymentMethod, bankAccount, boletoIssuedAt, boletoDetails, incomeType, recurringCategory, isRecurring, recurrenceCadence, recurrenceCount: String(recurrenceCount), hasInvoice, invoiceIssuedAt };
  const initialState = { type: initial.type || 'income', desc: initial.desc || '', amount: String(initial.amount || ''), date: initial.date || toLocalDateInput(), dueDate: initial.dueDate || initial.date || toLocalDateInput(), cat: initial.cat || ((initial.type || 'income') === 'income' ? 'Serviços' : 'Operações'), entity: initial.entity || '', entityId: String(initial.clientId || initial.supplierId || ''), status: initialStatus, launchMode: initialLaunchMode, installments: String(initial.installments || 1), installmentNumber: String(initial.installmentNumber || initial.recurrenceIndex || 1), paymentMethod: initial.paymentMethod || 'Transferência', bankAccount: initial.bankAccount || '', boletoIssuedAt: initial.boletoIssuedAt || '', boletoDetails: initial.boletoDetails || '', incomeType: initial.incomeType === 'Recorrente' ? 'Serviço' : (initial.incomeType || 'Serviço'), recurringCategory: initial.recurringCategory || 'Gestão', isRecurring: initial.isRecurring || initial.incomeType === 'Recorrente', recurrenceCadence: initial.recurrenceCadence || 'mensal', recurrenceCount: String(initial.recurrenceCount || 12), hasInvoice: initial.hasInvoice ?? false, invoiceIssuedAt: initial.invoiceIssuedAt || '' };
  const hasUnsavedChanges = JSON.stringify(draftState) !== JSON.stringify(initialState);
  const requestClose = () => hasUnsavedChanges ? setConfirmDiscard(true) : onClose();
  const pick = (t) => { setType(t); setCat(t === 'income' ? 'Serviços' : 'Operações'); setStatus(t === 'income' ? 'A receber' : 'A pagar'); };
  const save = () => {
    if (!desc.trim() || !amount || Number(amount) <= 0) { setErr(true); return; }
    if (!entityId) { setErr(true); return; }
    const recurring = launchMode === 'recurring';
    const installment = launchMode === 'installment';
    const installmentTotal = installment ? Math.max(2, Number(installments) || 2) : 1;
    onSave({ ...initial, id: initial.id, type, desc: desc.trim(), amount: Number(amount), date, dueDate, cat, entity: entity.trim() || '—', clientId: type === 'income' ? entityId : undefined, supplierId: type === 'expense' ? entityId : undefined, status, launchMode, installments: installmentTotal, installmentNumber: installment ? Math.min(Math.max(1, Number(installmentNumber) || 1), installmentTotal) : 1, paymentMethod, bankAccount: bankAccount.trim(), boletoIssuedAt: type === 'income' ? boletoIssuedAt : undefined, boletoDetails: type === 'income' ? boletoDetails.trim() : undefined, incomeType: type === 'income' ? incomeType : undefined, recurringCategory: type === 'income' && recurring ? recurringCategory : undefined, isRecurring: recurring, recurrenceCadence: recurring ? recurrenceCadence : undefined, recurrenceCount: recurring ? Math.max(1, Number(recurrenceCount) || 12) : 1, hasInvoice: type === 'income' && hasInvoice, invoiceIssuedAt: type === 'income' && hasInvoice ? invoiceIssuedAt : undefined, calculateTax: undefined });
  };

  return (
    <div className="fx-overlay" onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <div className="fx-modal fx-entry-modal">
        <div className="fx-modal-head">
          <div>
            <h2>{isEdit ? 'Editar lançamento' : type === 'income' ? 'Nova entrada' : 'Nova saída'}</h2>
            <p>{isEdit ? 'Atualize os dados do lançamento.' : 'Preencha os dados do lançamento.'}</p>
          </div>
          <button className="fx-icon sm" onClick={requestClose} aria-label="Fechar modal"><Icon name="x" size={18} /></button>
        </div>
        <div className="fx-modal-body">
          <div className="fx-typeswitch">
            <button className={'fx-typebtn income' + (type === 'income' ? ' active' : '')} onClick={() => pick('income')}>
              <div className="ic"><Icon name="arrow-down-left" size={19} /></div>
              <div><div className="tl">Tipo</div><div className="tv">Entrada</div></div>
            </button>
            <button className={'fx-typebtn expense' + (type === 'expense' ? ' active' : '')} onClick={() => pick('expense')}>
              <div className="ic"><Icon name="arrow-up-right" size={19} /></div>
              <div><div className="tl">Tipo</div><div className="tv">Saída</div></div>
            </button>
          </div>
          <div className="fx-field">
            <label>Descrição</label>
            <textarea className="fx-input" rows="3" value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="Detalhe o serviço, produto ou motivo da cobrança/pagamento" style={err && !desc.trim() ? { borderColor: 'var(--neg)' } : null} />
          </div>
          <div className="fx-row2">
            <div className="fx-field">
              <label>Valor</label>
              <div className="fx-input-money">
                <span className="pre">R$</span>
                <input className="fx-input fx-num" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00" style={err && (!amount || Number(amount) <= 0) ? { borderColor: 'var(--neg)' } : null} />
              </div>
            </div>
            <div className="fx-field">
              <label>Data de competência</label>
              <input className="fx-input fx-num" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="fx-row2">
            <div className="fx-field"><label>Vencimento</label><input className="fx-input fx-num" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="fx-field"><label>Banco</label><input className="fx-input" list="bank-account-options" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Selecione ou pesquise"/><datalist id="bank-account-options">{(categories.bank || []).map((bank) => <option value={bank} key={bank}/>)}</datalist></div>
          </div>
          <div className="fx-row2">
            {type === 'income' && <div className="fx-field"><label>Natureza da entrada</label><select className="fx-select" value={incomeType === 'Recorrente' ? 'Serviço' : incomeType} onChange={(e) => setIncomeType(e.target.value)}><option>Serviço</option><option>Produto</option><option>Outra receita</option></select><small className="fx-field-hint">Indica a origem do valor.</small></div>}
            <div className="fx-field"><label>Forma do lançamento</label><select className="fx-select" value={launchMode} onChange={(e) => { const next = e.target.value; setLaunchMode(next); setIsRecurring(next === 'recurring'); if (next === 'installment' && Number(installments) < 2) setInstallments(2); }}><option value="single">Único</option><option value="installment">Parcelado</option><option value="recurring">Recorrente</option></select><small className="fx-field-hint">Define se acontece uma vez, em parcelas ou se repete.</small></div>
          </div>
          {launchMode === 'recurring' && <><div className="fx-row2"><div className="fx-field"><label>Periodicidade</label><select className="fx-select" value={recurrenceCadence} onChange={(e) => setRecurrenceCadence(e.target.value)}><option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></div><div className="fx-field"><label>Quantidade de ocorrências</label><input className="fx-input fx-num" type="number" min="1" max="60" value={recurrenceCount} onChange={(e) => setRecurrenceCount(e.target.value)} /><small className="fx-field-hint">Inclui o primeiro lançamento.</small></div></div>{type === 'income' && <div className="fx-field"><label>Categoria recorrente</label><select className="fx-select" value={recurringCategory} onChange={(e) => setRecurringCategory(e.target.value)}><option>Gestão</option><option>Domínio</option><option>Hospedagem</option><option>Manutenção</option><option>Outros serviços recorrentes</option></select></div>}</>}
          {type === 'income' && <div className="fx-boleto-fields"><div className="fx-field"><label>Será emitida nota fiscal para esta entrada?</label><div className="fx-seg"><button className={hasInvoice?'active':''} onClick={()=>setHasInvoice(true)}>Sim</button><button className={!hasInvoice?'active':''} onClick={()=>setHasInvoice(false)}>Não</button></div>{hasInvoice && <small className="fx-field-hint">Esta entrada será incluída automaticamente na previsão mensal de impostos, sem gerar uma saída.</small>}</div>{hasInvoice && <div className="fx-field"><label>Emissão de Nota</label><input className="fx-input fx-num" type="date" value={invoiceIssuedAt} onChange={(e) => setInvoiceIssuedAt(e.target.value)} /><small className="fx-field-hint">Informe o dia em que a nota fiscal foi emitida.</small></div>}</div>}
          <div className="fx-row2">
            <div className="fx-field">
              <label>Categoria</label>
              <select className="fx-select" value={cat} onChange={(e) => setCat(e.target.value)}>
                {cats.map((c) => <option key={c}>{c}</option>)}
              </select>
              {!addingCategory ? <button className="fx-link fx-field-action" onClick={()=>setAddingCategory(true)}><Icon name="plus" size={13}/>Adicionar nova categoria</button> : <div className="fx-inline-add"><input className="fx-input" value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="Nome da categoria"/><button className="fx-btn sm" onClick={()=>{if(newCategory.trim()){onAddCategory(type,newCategory.trim());setCat(newCategory.trim());setAddingCategory(false)}}}>Salvar</button></div>}
            </div>
            <div className="fx-field">
              <label>{type === 'income' ? 'Cliente' : 'Fornecedor'}</label>
              <div className="fx-entity-input">
                <input className="fx-input" value={entity} onChange={(e) => {setEntity(e.target.value);setEntityId('');setQuickEntity(false)}} placeholder="Digite ao menos 3 caracteres" style={err && !entityId ? {borderColor:'var(--neg)'} : null}/>
                {(entity || entityId) && <button type="button" className="fx-input-clear" aria-label={`Limpar ${type==='income'?'cliente':'fornecedor'} selecionado`} title="Limpar seleção" onClick={()=>{setEntity('');setEntityId('');setQuickEntity(false)}}><Icon name="x" size={15}/></button>}
              </div>
              {entity.length >= 3 && !entityId && !quickEntity && <div className="fx-autocomplete">{matches.map(x=><button key={x.id} onClick={()=>{setEntity(x.name);setEntityId(x.id);setQuickEntity(false)}}>{x.name}<small>{x.cnpj || x.segment}</small></button>)}{!matches.length && <div className="fx-auto-empty">Nenhum {type==='income'?'cliente':'fornecedor'} encontrado.<button onClick={()=>setQuickEntity(true)}>Cadastrar novo {type==='income'?'cliente':'fornecedor'}</button></div>}</div>}
              {quickEntity && <div className="fx-quick-card"><b>Cadastro rápido</b><p>Cadastre somente o nome agora. Os demais dados podem ser preenchidos depois.</p><input className="fx-input" value={entity} onChange={e=>setEntity(e.target.value)} placeholder="Nome"/><button className="fx-btn sm" disabled={!entity.trim()} onClick={()=>{const created=onQuickEntity(type,{name:entity.trim()});setEntityId(created.id);setEntity(created.name);setQuickEntity(false)}}>Cadastrar e selecionar</button></div>}
            </div>
          </div>
          {isEdit && <div className="fx-date-meta"><span><b>Criado em</b>{new Date(initial.createdAt).toLocaleString('pt-BR')}</span><span><b>Data efetiva</b>{initial.effectiveDate ? new Date(initial.effectiveDate+'T12:00').toLocaleDateString('pt-BR') : 'Ainda não baixado'}</span></div>}
          <div className="fx-field">
            <label>Status</label>
            <select className="fx-select" value={isEntryPaid(initial) ? (type === 'income' ? 'Recebido' : 'Pago') : status} onChange={(e) => setStatus(e.target.value)} disabled={isEdit && isEntryPaid(initial)}>
              <option>{type === 'income' ? 'A receber' : 'A pagar'}</option>
              <option>Agendado</option>
              {isEdit && isEntryPaid(initial) && <option>{type === 'income' ? 'Recebido' : 'Pago'}</option>}
            </select>
            {!isEntryPaid(initial) && dueDate < toLocalDateInput() && <small className="fx-field-hint fx-overdue-hint">O status será exibido como Atrasado porque o vencimento já passou.</small>}
            {isEdit && <div className="fx-modal-payment-status"><span>Status da baixa</span><PaymentSwitch paid={isEntryPaid(initial)} label={initial.desc} onChange={(paid)=>onPaymentStatus(initial,paid)} /></div>}
          </div>
          <div className={launchMode === 'installment' ? 'fx-row2' : ''}>
            {launchMode === 'installment' && <div className="fx-field"><label>Parcelamento</label><div className="fx-installment-fields"><input aria-label="Parcela atual" className="fx-input fx-num" type="number" min="1" max={Math.max(2, Number(installments) || 2)} value={installmentNumber} onChange={(e) => setInstallmentNumber(e.target.value)} /><span>de</span><input aria-label="Total de parcelas" className="fx-input fx-num" type="number" min="2" value={installments} onChange={(e) => setInstallments(e.target.value)} /></div></div>}
            <div className="fx-field"><label>Forma de pagamento</label><select className="fx-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option>Transferência</option><option>PIX</option><option>Boleto</option><option>Cartão</option><option>Dinheiro</option><option>Débito automático</option></select></div>
          </div>
          {type === 'income' && <div className="fx-boleto-fields"><div className="fx-fieldset"><span className="fx-fieldset-lb">Cobrança por boleto</span></div><div className="fx-row2"><div className="fx-field"><label>Emissão do boleto</label><input className="fx-input fx-num" type="date" value={boletoIssuedAt} onChange={(e) => setBoletoIssuedAt(e.target.value)} /></div><div className="fx-field"><label>Informações do boleto</label><textarea className="fx-input" rows="2" value={boletoDetails} onChange={(e) => setBoletoDetails(e.target.value)} placeholder="Número, linha digitável ou observações" /></div></div></div>}
          {isEdit && <div className="fx-history"><div className="fx-history-head"><span className="fx-fieldset-lb">Histórico do registro</span><p>Acompanhe as alterações realizadas neste lançamento.</p></div>{(initial.history || []).slice().reverse().map((h, i) => <div className="fx-history-item" key={i}><span className="fx-history-dot"></span><div><p>{h.text}</p><small>{new Date(h.at).toLocaleString('pt-BR')}</small></div></div>)}</div>}
        </div>
        <div className="fx-modal-foot">
          <button className="fx-modal-cancel" onClick={requestClose}>Cancelar</button>
          <button className="fx-modal-save" onClick={save}><Icon name="check" size={17} />{isEdit ? 'Salvar alterações' : 'Salvar lançamento'}</button>
        </div>
      </div>
      {confirmDiscard && <div className="fx-overlay fx-discard-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDiscard(false); }}><div className="fx-modal fx-discard-modal"><div className="fx-modal-body"><div className="fx-confirm-ic warn"><Icon name="alert-circle" size={26}/></div><div><h2>Descartar alterações?</h2><p>As informações que você alterou ainda não foram salvas. Deseja continuar editando ou descartar as mudanças?</p></div></div><div className="fx-modal-foot"><button className="fx-modal-cancel" onClick={()=>setConfirmDiscard(false)}>Continuar editando</button><button className="fx-modal-save danger" onClick={onClose}>Descartar alterações</button></div></div></div>}
    </div>
  );
}

function TaxModal({ current, onClose, onSave }) {
  const [rate, setRate] = useState(current || '');
  return <div className="fx-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="fx-modal" style={{width:'min(430px,100%)'}}><div className="fx-modal-head"><div><h2>Previsão de impostos</h2><p>Taxa opcional usada somente para planejamento financeiro.</p></div><button className="fx-icon sm" onClick={onClose}><Icon name="x" size={18}/></button></div><div className="fx-modal-body"><div className="fx-field"><label>Taxa média de imposto (%)</label><input className="fx-input fx-num" type="number" min="0" max="100" step="0.01" value={rate} onChange={(e)=>setRate(e.target.value)} placeholder="Ex: 7"/></div><p className="fx-tax-disclaimer">Esta é apenas uma previsão financeira e não representa cálculo fiscal ou contábil oficial.</p></div><div className="fx-modal-foot"><button className="fx-modal-cancel" onClick={onClose}>Cancelar</button><button className="fx-modal-save" onClick={()=>onSave(Number(rate)||0)}>Salvar configuração</button></div></div></div>;
}

function ConfirmEntryDelete({ entry, onClose, onConfirm }) {
  return <div className="fx-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="fx-modal" style={{ width: 'min(420px,100%)' }}><div className="fx-modal-body" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 30 }}><div className="fx-confirm-ic"><Icon name="trash" size={26} /></div><h2 style={{ margin: '4px 0 0', fontSize: 19 }}>Excluir lançamento?</h2><p style={{ color: 'var(--muted)', lineHeight: 1.5 }}>O lançamento <b>{entry.desc}</b>, no valor de <b>{brl(entry.amount)}</b>, será removido. Esta ação não pode ser desfeita.</p></div><div className="fx-modal-foot"><button className="fx-modal-cancel" onClick={onClose}>Cancelar</button><button className="fx-modal-save danger" onClick={onConfirm}><Icon name="trash" size={16} />Excluir</button></div></div></div>;
}

function SettlementModal({ entry, banks, onClose, onConfirm }) {
  const [asExpected, setAsExpected] = useState(true);
  const [actualDate, setActualDate] = useState(entry.dueDate || entry.date);
  const [bankAccount, setBankAccount] = useState(entry.bankAccount || '');
  const label = entry.type === 'income' ? 'recebimento' : 'pagamento';
  return <div className="fx-overlay"><div className="fx-modal" style={{width:'min(440px,100%)'}}><div className="fx-modal-head"><div><h2>Confirmar baixa</h2><p>O {label} ocorreu na data prevista?</p></div><button className="fx-icon sm" onClick={onClose}><Icon name="x" size={18}/></button></div><div className="fx-modal-body"><div className="fx-seg"><button className={asExpected?'active':''} onClick={()=>{setAsExpected(true);setActualDate(entry.dueDate||entry.date)}}>Sim</button><button className={!asExpected?'active':''} onClick={()=>setAsExpected(false)}>Não</button></div>{!asExpected && <div className="fx-field"><label>Informe a data real do {label}</label><input className="fx-input" type="date" value={actualDate} onChange={e=>setActualDate(e.target.value)}/></div>}<div className="fx-field"><label>Banco *</label><input className="fx-input" list="settlement-bank-options" value={bankAccount} onChange={e=>setBankAccount(e.target.value)} placeholder="Selecione ou pesquise"/><datalist id="settlement-bank-options">{(banks || []).map((bank) => <option value={bank} key={bank}/>)}</datalist></div></div><div className="fx-modal-foot"><button className="fx-modal-cancel" onClick={onClose}>Cancelar</button><button className="fx-modal-save" disabled={!actualDate || !bankAccount.trim()} onClick={()=>onConfirm(actualDate, bankAccount.trim())}>Concluir baixa</button></div></div></div>;
}

function FeedbackModal({ userEmail, workspaceId, pageUrl, onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    const cleanMessage = message.trim();
    if (cleanMessage.length < 10) { setError('Descreva o feedback com pelo menos 10 caracteres.'); return; }
    setStatus('sending'); setError('');
    try {
      await sendFeedback({ message: cleanMessage, pageUrl, workspaceId });
      setStatus('sent');
      onSent();
    } catch (sendError) {
      setStatus('error');
      setError(sendError.message || 'Não foi possível enviar o feedback. Tente novamente.');
    }
  };
  return <div className="fx-overlay" onClick={(event) => { if (event.target === event.currentTarget && status !== 'sending') onClose(); }}><form className="fx-modal fx-feedback-modal" onSubmit={submit}><div className="fx-modal-head"><div><h2>Enviar feedback</h2><p>Conte sobre um erro ou sugira uma melhoria para a plataforma.</p></div><button type="button" className="fx-icon sm" onClick={onClose} disabled={status === 'sending'} aria-label="Fechar"><Icon name="x" size={18}/></button></div><div className="fx-modal-body"><div className="fx-feedback-context"><Icon name="mail" size={17}/><div><span>Feedback da conta</span><strong>{userEmail}</strong></div></div><div className="fx-field"><label htmlFor="feedback-message">Mensagem *</label><textarea id="feedback-message" className="fx-input fx-feedback-textarea" rows="7" maxLength="5000" autoFocus value={message} onChange={(event)=>setMessage(event.target.value)} placeholder="Descreva o que aconteceu, o que você esperava ou a melhoria que gostaria de sugerir…" disabled={status === 'sending'} /></div><div className="fx-feedback-origin"><Icon name="world" size={15}/><span><b>Tela de origem:</b> {pageUrl}</span></div>{error && <p className="fx-feedback-error" role="alert"><Icon name="alert-circle" size={16}/>{error}</p>}</div><div className="fx-modal-foot"><button type="button" className="fx-modal-cancel" onClick={onClose} disabled={status === 'sending'}>Cancelar</button><button type="submit" className="fx-modal-save" disabled={status === 'sending' || message.trim().length < 10}>{status === 'sending' ? 'Enviando…' : <><Icon name="mail" size={17}/>Enviar feedback</>}</button></div></form></div>;
}

// ---------- app ----------
function FinanceApp({ user, onLogout, onUpdatePassword }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeSegment = location.pathname.split('/').filter(Boolean)[0] || 'dashboard';
  const view = ROUTE_VIEWS.has(routeSegment) ? routeSegment : 'dashboard';
  const navView = location.pathname === '/clientes/ranking' ? 'clientes_ranking' : location.pathname === '/clientes/todos' ? 'clientes_todos' : view;
  const [entries, setEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const today = new Date();
  const [cm, setCm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);   // {type} or {entry}
  const [deleteEntry, setDeleteEntry] = useState(null);
  const [toast, setToast] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [taxModal, setTaxModal] = useState(false);
  const [settlement, setSettlement] = useState(null);
  const [periodModal, setPeriodModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [categories, setCategories] = useState({ income: CATS_IN, expense: CATS_OUT, supplier: CATS_SUPPLIER, bank: CATS_BANK });
  const [suppliers, setSuppliers] = useState([]);
  const [account, setAccount] = useState({ company:'BASE Financeiro', owner:BF.user.name, email:user.email || '', taxRate:0 });
  const [workspaceId, setWorkspaceId] = useState(null);
  const [centralManager,setCentralManager]=useState(false);
  const [dataStatus, setDataStatus] = useState('loading');
  const [syncStatus, setSyncStatus] = useState('saved');
  const [syncError, setSyncError] = useState('');
  const persistenceRef = useRef(null);
  const skipInitialSave = useRef(true);

  useEffect(() => {
    let active = true;
    loadFinanceState(user).then((state) => {
      if (!active) return;
      persistenceRef.current = state.save;
      skipInitialSave.current = true;
      setEntries(normalizeEntries(state.entries).filter((entry) => !entry.isTaxForecast));
      setClients(state.clients); setSuppliers(state.suppliers); setCategories({ income: CATS_IN, expense: CATS_OUT, supplier: CATS_SUPPLIER, bank: CATS_BANK, ...state.categories });
      setTaxRate(state.taxRate); setAccount(state.account); setWorkspaceId(state.workspaceId);setCentralManager(state.centralManager);
      setDataStatus('ready');
    }).catch(() => active && setDataStatus('error'));
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    if (dataStatus !== 'ready' || !workspaceId) return undefined;
    if (skipInitialSave.current) { skipInitialSave.current = false; return undefined; }
    let active = true;
    setSyncStatus('saving');
    const timer = setTimeout(() => {
      persistenceRef.current({ workspaceId, entries, clients, suppliers, categories, taxRate, account })
        .then(() => { if (active) { setSyncStatus('saved'); setSyncError(''); } })
        .catch(error => { if (active) { setSyncStatus('error'); setSyncError(clientSaveError(error)); } });
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [dataStatus, workspaceId, entries, clients, suppliers, categories, taxRate, account]);

  async function reloadAfterLifecycle(){
    const state=await loadFinanceState(user);
    persistenceRef.current=state.save;skipInitialSave.current=true;
    setEntries(normalizeEntries(state.entries).filter(e=>!e.isTaxForecast));setClients(state.clients);setSuppliers(state.suppliers);
    setCategories(state.categories);setTaxRate(state.taxRate);setAccount(state.account);setCentralManager(state.centralManager);
    setSyncStatus('saved');setSyncError('');
  }
  const visibleEntries=useMemo(()=>operationalEntries(entries,clients),[entries,clients]);
  const monthKey = `${cm.y}-${String(cm.m + 1).padStart(2, '0')}`;
  const monthEntries = useMemo(() => visibleEntries.filter((e) => e.date.startsWith(monthKey)), [visibleEntries, monthKey]);
  const filtered = useMemo(() => {
    if (!query.trim()) return monthEntries;
    const q = query.toLowerCase();
    return monthEntries.filter((e) => (e.desc + e.entity + e.cat + getEntryStatus(e) + (e.bankAccount || '') + (e.boletoDetails || '')).toLowerCase().includes(q));
  }, [monthEntries, query]);

  const stats = useMemo(() => {
    const ins = monthEntries.filter((e) => e.type === 'income');
    const outs = monthEntries.filter((e) => e.type === 'expense');
    const receitas = ins.reduce((s, e) => s + e.amount, 0);
    const despesas = outs.reduce((s, e) => s + e.amount, 0);
    return { receitas, despesas, saldo: receitas - despesas, nIn: ins.length, nOut: outs.length };
  }, [monthEntries]);

  const taxSummary = useMemo(() => {
    const invoicedEntries = monthEntries.filter((entry) => entry.type === 'income' && entry.hasInvoice);
    const base = invoicedEntries.reduce((sum, entry) => sum + entry.amount, 0);
    return { amount: Math.round(base * taxRate) / 100, count: invoicedEntries.length };
  }, [monthEntries, taxRate]);

  const sortedFiltered = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered]);

  const go = (id) => {
    if (id === '__new_income') { openNew('income'); return; }
    navigate(ROUTES[id] || ROUTES.dashboard); setDrawer(false); setQuery('');
  };
  const shift = (d) => setCm((c) => { let m = c.m + d, y = c.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } return { y, m }; });
  const openNew = (t) => setModal({ type: t });
  const openEdit = (e) => setModal({ ...e });
  const newForView = () => openNew(view === 'saidas' ? 'expense' : 'income');
  const save = (payload) => {
    const now = new Date().toISOString();
    const entryId = payload.id || crypto.randomUUID();
    const [entryYear, entryMonth] = payload.date.split('-').map(Number);
    const existingEntry = entries.find((entry) => entry.id === payload.id);
    const createsSeries = payload.isRecurring && (!payload.id || !existingEntry?.recurrenceSeriesId);
    const generatedEntries = createsSeries ? buildRecurrenceEntries(payload, entryId, now) : [];
    if (payload.id) {
      setEntries((arr) => arr.map((e) => {
        if (e.id !== payload.id) return e;
        const nextEntry = generatedEntries[0] || payload;
        const labels = { amount: 'Valor', date: 'Data de competência', dueDate: 'Vencimento', status: 'Status', cat: 'Categoria', installments: 'Total de parcelas', installmentNumber: 'Parcela atual', paymentMethod: 'Forma de pagamento', bankAccount: 'Banco', boletoIssuedAt: 'Emissão do boleto', boletoDetails: 'Informações do boleto', invoiceIssuedAt: 'Emissão de Nota', desc: 'Descrição', entity: payload.type === 'income' ? 'Cliente' : 'Fornecedor', recurrenceCadence:'Periodicidade', recurrenceCount:'Quantidade de ocorrências', hasInvoice:'Emissão de nota fiscal' };
        const changes = Object.entries(labels).filter(([key]) => String(e[key] ?? '') !== String(payload[key] ?? '')).map(([key, label]) => ({ at: now, text: `${label} alterado de ${key === 'amount' ? brl(e[key]) : (e[key] || '—')} para ${key === 'amount' ? brl(payload[key]) : (payload[key] || '—')}` }));
        return { ...nextEntry, createdAt: e.createdAt || now, history: [...(e.history || [{ at: e.createdAt || now, text: 'Registro criado' }]), ...changes] };
      }).concat(generatedEntries.slice(1))); setToast(generatedEntries.length > 1 ? `${generatedEntries.length} ocorrências geradas` : 'Lançamento atualizado');
    } else {
      const created = generatedEntries.length ? generatedEntries : [{ ...payload, id: entryId, createdAt: now, history: [{ at: now, text: 'Registro criado' }] }];
      setEntries((arr) => [...created, ...arr]);
      setToast(created.length > 1 ? `${created.length} ocorrências geradas` : 'Lançamento adicionado');
    }
    setCm({ y: entryYear, m: entryMonth - 1 });
    setModal(null);
    clearTimeout(window.__t); window.__t = setTimeout(() => setToast(''), 2400);
  };

  const hasData = monthEntries.length > 0;

  const notify = (msg) => { setToast(msg); clearTimeout(window.__t); window.__t = setTimeout(() => setToast(''), 2400); };
  const confirmEntryDelete = () => { setEntries((arr) => arr.filter((e) => e.id !== deleteEntry.id)); setDeleteEntry(null); setModal(null); notify('Lançamento excluído'); };
  const saveClient = (payload) => {
    if (findDuplicateClient(clients, payload)) { notify('Este CPF/CNPJ já existe na central. Use ou edite o cadastro existente.'); return false; }
    if (payload.id) setClients((arr) => arr.map((c) => c.id === payload.id ? payload : c));
    else setClients((arr) => [{ ...payload, id: crypto.randomUUID() }, ...arr]);
    return true;
  };
  const saveSupplier = (payload) => setSuppliers((arr) => payload.id ? arr.map((supplier) => supplier.id === payload.id ? payload : supplier) : [{ ...payload, id: crypto.randomUUID() }, ...arr]);
  const deleteSupplier = (id) => setSuppliers((arr) => arr.filter((supplier) => supplier.id !== id));
  const addCategory = (type, name) => setCategories(s => (s[type] || []).includes(name) ? s : {...s,[type]:[...(s[type] || []),name]});
  const renameCategory = (type, oldName, newName) => { setCategories(s=>({...s,[type]:(s[type] || []).map(x=>x===oldName?newName:x)})); if(type==='supplier')setSuppliers(arr=>arr.map(supplier=>supplier.segment===oldName?{...supplier,segment:newName}:supplier));else if(type==='bank')setEntries(arr=>arr.map(entry=>entry.bankAccount===oldName?{...entry,bankAccount:newName,history:[...(entry.history||[]),{at:new Date().toISOString(),text:`Banco alterado de ${oldName} para ${newName}`}]}:entry));else setEntries(arr=>arr.map(e=>e.type===type&&e.cat===oldName?{...e,cat:newName,history:[...(e.history||[]),{at:new Date().toISOString(),text:`Categoria alterada de ${oldName} para ${newName}`}]}:e)); };
  const deleteCategory = (type, name) => setCategories(s=>({...s,[type]:(s[type] || []).filter(x=>x!==name)}));
  const quickEntity = (type, data) => { const existing=(type==='income'?clients:suppliers).find(c=>!c.archivedAt&&!c.appArchivedAt&&c.name.trim().toLocaleLowerCase('pt-BR')===data.name.trim().toLocaleLowerCase('pt-BR')); if(existing)return existing; const created={id:crypto.randomUUID(),name:data.name,email:'',contact:'',segment:'Cadastro rápido',status:'Ativo',contracts:[],renewals:[],interactions:[],resp:{name:'—',email:'—'},fin:{name:'—',email:'—'}}; if(type==='income')setClients(a=>[created,...a]);else setSuppliers(a=>[created,...a]); return created; };
  const changePaymentStatus = (entry, paid) => {
    if (paid) { setSettlement(entry); return; }
    const now = new Date().toISOString();
    const pendingStatus = entry.type === 'income' ? 'A receber' : 'A pagar';
    setEntries((arr) => arr.map((item) => item.id === entry.id ? { ...item, effectiveDate: undefined, status: pendingStatus, history: [...(item.history || []), { at: now, text: `${entry.type === 'income' ? 'Recebimento' : 'Pagamento'} desmarcado; lançamento voltou para ${pendingStatus.toLowerCase()}` }] } : item));
    setModal(null);
    notify('Lançamento marcado como não pago');
  };
  const settleEntry = (actualDate, bankAccount) => { const now=new Date().toISOString(); setEntries(arr=>arr.map(e=>e.id===settlement.id?{...e,effectiveDate:actualDate,bankAccount,status:e.type==='income'?'Recebido':'Pago',history:[...(e.history||[]),{at:now,text:`${e.type==='income'?'Entrada recebida':'Saída paga'} em ${new Date(actualDate+'T12:00').toLocaleDateString('pt-BR')} via ${bankAccount}`},{at:now,text:'Baixa do lançamento concluída'}]}:e)); setSettlement(null); setModal(null); notify('Baixa registrada'); };
  const saveAccount = (next) => { setAccount(next); setTaxRate(next.taxRate||0); notify('Configurações salvas'); };

  if (location.pathname === '/') return <Navigate to={ROUTES.dashboard} replace />;
  if (!ROUTE_VIEWS.has(routeSegment)) return <Navigate to={ROUTES.dashboard} replace />;
  if (dataStatus === 'loading') return <main className="fx-auth"><section className="fx-auth-card"><div className="fx-auth-spinner" /><p>Carregando dados financeiros…</p></section></main>;
  if (dataStatus === 'error') return <main className="fx-auth"><section className="fx-auth-card"><div className="fx-auth-mark">!</div><h1>Não foi possível carregar</h1><p>Confira a conexão com o banco e tente atualizar a página.</p><button className="fx-modal-save" onClick={() => window.location.reload()}>Tentar novamente</button></section></main>;

  return (
    <div className="fx">
      <div className="fx-app">
        <Sidebar view={navView} go={go} onFeedback={()=>setFeedbackModal(true)} onLogout={onLogout} />

        {drawer && (
          <div className="fx-overlay" style={{ alignItems: 'stretch', justifyContent: 'flex-start', padding: 0 }} onClick={(e) => { if (e.target === e.currentTarget) setDrawer(false); }}>
            <div style={{ width: 'min(82vw,290px)', height: '100%', background: '#fbfbfd', boxShadow: 'var(--sh-modal)' }} className="fx-side-drawer">
              <div style={{ height: '100%' }}><Sidebar drawer view={navView} go={go} onFeedback={()=>{setFeedbackModal(true);setDrawer(false)}} onLogout={onLogout} /></div>
            </div>
          </div>
        )}

        <main className="fx-main">
          <Topbar view={view} query={query} setQuery={setQuery} onNew={newForView} onBurger={() => setDrawer(true)} syncStatus={syncStatus} />
          <div className="fx-content">
            {syncError && <div className="fx-central-alert" role="alert"><Icon name="alert-circle" size={20}/><div><strong>Alterações ainda não confirmadas no banco</strong><p>{syncError}</p><button className="fx-btn sm" onClick={()=>{const blob=new Blob([JSON.stringify({workspaceId,entries,clients,suppliers,categories,taxRate,account},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='BASE-alteracoes-nao-confirmadas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Baixar cópia das alterações</button> <button className="fx-btn sm" onClick={()=>{if(window.confirm('Recarregar descarta alterações que não foram salvas. Baixe uma cópia antes, se necessário. Continuar?'))window.location.reload();}}>Recarregar dados</button></div></div>}
            <div className="fx-pagehead">
              <div>
                <p className="fx-eyebrow">{view === 'dashboard' ? 'Visão geral' : view === 'relatorios' ? 'Análise' : view === 'clientes' || view === 'fornecedores' ? 'Cadastros' : 'Financeiro'}</p>
                <h1 className="fx-h1">{navView === 'clientes_ranking' ? 'Ranking de clientes' : navView === 'clientes_todos' ? 'Todos os clientes' : { dashboard: 'Olá, Elisandro', entradas: 'Entradas', saidas: 'Saídas', relatorios: 'Relatórios', clientes: 'Clientes', fornecedores: 'Fornecedores', configuracoes:'Configurações da Conta' }[view]}</h1>
                {view === 'dashboard' && <p className="fx-sub">Resumo financeiro de {MONTHS[cm.m].toLowerCase()} de {cm.y}.</p>}
              </div>
              {(view === 'dashboard' || view === 'entradas' || view === 'saidas' || view === 'relatorios') && <MonthNav cm={cm} shift={shift} onOpenCalendar={()=>setPeriodModal(true)} />}
            </div>

            {view === 'dashboard' && <Dashboard stats={stats} entries={sortedFiltered} onEdit={openEdit} go={go} hasData={hasData} cm={cm} taxRate={taxRate} onConfigureTax={() => go('configuracoes')} />}
            {view === 'entradas' && <ListPage kind="income" entries={sortedFiltered} clients={clients} onEdit={openEdit} onNew={() => openNew('income')} onPaymentStatus={changePaymentStatus} query={query} />}
            {view === 'saidas' && <ListPage kind="expense" entries={sortedFiltered} onEdit={openEdit} onNew={() => openNew('expense')} onPaymentStatus={changePaymentStatus} query={query} taxForecast={taxSummary.amount} taxRate={taxRate} invoiceCount={taxSummary.count} />}
            {view === 'relatorios' && <Relatorios entries={monthEntries} stats={stats} hasData={hasData} cm={cm} />}
            {view === 'clientes' && <ClientesView clients={clients} entries={entries} query={query} onSave={saveClient} workspaceId={workspaceId} canDelete={centralManager} syncReady={syncStatus==='saved'&&dataStatus==='ready'} onLifecycle={reloadAfterLifecycle} notify={notify} />}
            {view === 'fornecedores' && <ContactsPage query={query} suppliers={suppliers} supplierCategories={categories.supplier || []} onSave={saveSupplier} onDelete={deleteSupplier} notify={notify} />}
            {view === 'configuracoes' && <SettingsView account={{...account,taxRate}} onAccount={saveAccount} categories={categories} onAddCategory={addCategory} onRenameCategory={renameCategory} onDeleteCategory={deleteCategory} entries={entries} suppliers={suppliers} onUpdatePassword={onUpdatePassword} />}
          </div>
        </main>

        <Tabbar view={view} go={go} />
      </div>

      {modal && <LancamentoModal initial={modal} onClose={() => setModal(null)} onSave={save} categories={categories} clients={clients} suppliers={suppliers} onAddCategory={addCategory} onQuickEntity={quickEntity} onSettle={setSettlement} onPaymentStatus={changePaymentStatus} />}
      {modal?.id && <button className="fx-modal-delete-fab" title="Excluir lançamento" onClick={() => setDeleteEntry(modal)}><Icon name="trash" size={18} /></button>}
      {deleteEntry && <ConfirmEntryDelete entry={deleteEntry} onClose={() => setDeleteEntry(null)} onConfirm={confirmEntryDelete} />}
      {taxModal && <TaxModal current={taxRate} onClose={() => setTaxModal(false)} onSave={(rate) => { setTaxRate(rate); setTaxModal(false); notify(rate ? 'Taxa de imposto configurada' : 'Previsão de impostos desativada'); }} />}
      {settlement && <SettlementModal entry={settlement} banks={categories.bank} onClose={()=>setSettlement(null)} onConfirm={settleEntry}/>} 
      {periodModal && <PeriodPickerModal cm={cm} onClose={()=>setPeriodModal(false)} onSelect={(value)=>{const [y,m]=value.split('-').map(Number);setCm({y,m:m-1});setPeriodModal(false)}}/>}
      {feedbackModal && <FeedbackModal userEmail={user.email} workspaceId={workspaceId} pageUrl={window.location.href} onClose={()=>setFeedbackModal(false)} onSent={()=>{setFeedbackModal(false);notify('Feedback enviado. Obrigado!')}} />}
      {toast && <div className="fx-toast"><span className="ic"><Icon name="circle-check" size={18} /></span>{toast}</div>}
    </div>
  );
}

export default function App() {
  return (
    <AuthGate>{({ user, onLogout, onUpdatePassword }) => (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="/entradas" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="/saidas" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="/relatorios" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="/clientes" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="/clientes/ranking" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="/clientes/todos" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="/clientes/:id" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="/fornecedores" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="/configuracoes" element={<FinanceApp user={user} onLogout={onLogout} onUpdatePassword={onUpdatePassword} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    )}</AuthGate>
  );
}
