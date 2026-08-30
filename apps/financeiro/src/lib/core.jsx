// core.jsx — BASE Financeiro: data, formatters, charts. Exports to window.

const brl = (v) => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v) => 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const CAT_COLORS = {
  'Serviços': '#5a39e6', 'Projetos': '#8b5cf6', 'Operações': '#e8930c',
  'Infraestrutura': '#6366f1', 'Marketing': '#0ca678', 'Energia': '#3b9df0',
  'Recebimentos': '#0ca678', 'Outros': '#94a3b8', 'Impostos': '#f43f6b', 'Equipe': '#d9488a',
};

// Static demo dataset (one rich month: Junho 2026).
const BF = {
  user: { name: 'Elisandro Motta', role: 'Financeiro', initials: 'EM' },
  saldoCaixa: 48320,
  flow: [8200, 8600, 8100, 9400, 9000, 10200, 11600, 11100, 12800, 12300, 13600, 14200, 13900, 14650],
  axis: ['01 jun', '08', '15', '22', '30 jun'],
  spark: {
    receitas: [3, 5, 4, 6, 5.5, 8, 7, 9, 8.6, 11],
    despesas: [5.4, 4.6, 5.2, 4, 4.4, 3.6, 4.2, 3.4, 3.8, 3.2],
    saldo: [6, 7, 6.5, 8, 7.6, 9, 9.4, 10.2, 9.8, 11],
    receber: [2, 3, 2.6, 4, 3.6, 5, 4.6, 6, 5.6, 7],
  },
  entries: [
    { id: 1, type: 'income', desc: 'Retainer Mensal', entity: 'Horizonte Digital', cat: 'Serviços', amount: 15320, date: '2026-06-08', status: 'A receber' },
    { id: 2, type: 'income', desc: 'Stripe — Projeto Orion', entity: 'Alpha Corp', cat: 'Serviços', amount: 4800, date: '2026-06-06', status: 'Processado' },
    { id: 3, type: 'expense', desc: 'Consultoria Design UX', entity: 'Terceiros', cat: 'Operações', amount: 2400, date: '2026-06-05', status: 'Transferência' },
    { id: 4, type: 'expense', desc: 'Amazon Web Services', entity: 'AWS', cat: 'Infraestrutura', amount: 1250, date: '2026-06-07', status: 'Auto-pay' },
    { id: 5, type: 'expense', desc: 'Meta Ads', entity: 'Meta', cat: 'Marketing', amount: 980, date: '2026-06-08', status: 'Vence hoje' },
    { id: 6, type: 'expense', desc: 'Energia Elétrica', entity: 'Copel', cat: 'Energia', amount: 840, date: '2026-06-10', status: 'Próx. venc.' },
    { id: 7, type: 'income', desc: 'Mentoria — Nova Capital', entity: 'Nova Capital', cat: 'Serviços', amount: 3200, date: '2026-06-12', status: 'Processado' },
    { id: 8, type: 'expense', desc: 'Folha — Equipe', entity: 'Time BASE', cat: 'Operações', amount: 1900, date: '2026-06-05', status: 'Processado' },
  ],
  clients: [
    {
      id: 1, name: 'Horizonte Digital', cnpj: '12.345.678/0001-90', segment: 'Serviços digitais',
      address: 'Av. Paulista, 1842 · cj. 71 — Bela Vista, São Paulo/SP · 01310-200',
      resp: { name: 'Marina Salles', email: 'marina@horizontedigital.com' },
      fin: { name: 'Paulo Restivo', email: 'financeiro@horizontedigital.com' },
      since: '2023-03', status: 'Recorrente', open: 15320,
      contracts: [
        { name: 'Retainer — Gestão Financeira', kind: 'Serviço', type: 'recorrente', cadence: 'mensal', amount: 15320, since: '2023-03', status: 'Ativo' },
        { name: 'Licença BASE Pro · 25 assentos', kind: 'Produto', type: 'recorrente', cadence: 'anual', amount: 18000, since: '2024-01', status: 'Ativo' },
        { name: 'Consultoria Tributária', kind: 'Serviço', type: 'recorrente', cadence: 'trimestral', amount: 6800, since: '2023-09', status: 'Ativo' },
        { name: 'Implantação & Migração ERP', kind: 'Serviço', type: 'pontual', cadence: null, amount: 28000, since: '2023-03', status: 'Concluído' },
      ],
    },
    {
      id: 2, name: 'Alpha Corp', cnpj: '08.221.904/0001-55', segment: 'Tecnologia',
      address: 'Rua do Rócio, 423 · 9º andar — Vila Olímpia, São Paulo/SP · 04552-000',
      resp: { name: 'Diego Mariano', email: 'diego@alphacorp.com' },
      fin: { name: 'Renata Lobo', email: 'financeiro@alphacorp.com' },
      since: '2022-07', status: 'Ativo', open: 0,
      contracts: [
        { name: 'Projeto Orion — Plataforma', kind: 'Serviço', type: 'pontual', cadence: null, amount: 96000, since: '2024-02', status: 'Concluído' },
        { name: 'Sustentação & SLA', kind: 'Serviço', type: 'recorrente', cadence: 'mensal', amount: 8400, since: '2024-06', status: 'Ativo' },
        { name: 'Licença BASE Enterprise', kind: 'Produto', type: 'recorrente', cadence: 'anual', amount: 42000, since: '2022-07', status: 'Ativo' },
      ],
    },
    {
      id: 3, name: 'Nova Capital', cnpj: '21.998.450/0001-12', segment: 'Investimentos',
      address: 'Av. Brigadeiro Faria Lima, 3477 · 14º andar — Itaim Bibi, São Paulo/SP · 04538-133',
      resp: { name: 'Helena Costa', email: 'helena@novacapital.com' },
      fin: { name: 'Bruno Tavares', email: 'controladoria@novacapital.com' },
      since: '2023-11', status: 'Ativo', open: 3200,
      contracts: [
        { name: 'Mentoria Financeira Executiva', kind: 'Serviço', type: 'recorrente', cadence: 'mensal', amount: 3200, since: '2023-11', status: 'Ativo' },
        { name: 'Diagnóstico de Fluxo de Caixa', kind: 'Serviço', type: 'pontual', cadence: null, amount: 12500, since: '2023-11', status: 'Concluído' },
        { name: 'Relatórios Trimestrais', kind: 'Serviço', type: 'recorrente', cadence: 'trimestral', amount: 4500, since: '2024-03', status: 'Pausado' },
      ],
    },
    {
      id: 4, name: 'Meridian Foods', cnpj: '33.450.781/0001-04', segment: 'Varejo & Alimentos',
      address: 'Rod. Anhanguera, km 110 · Galpão 7 — Sumaré/SP · 13171-300',
      resp: { name: 'Antônio Prado', email: 'antonio@meridianfoods.com' },
      fin: { name: 'Cláudia Nunes', email: 'fiscal@meridianfoods.com' },
      since: '2025-01', status: 'Ativo', open: 0,
      contracts: [
        { name: 'Licença BASE Pro · 60 assentos', kind: 'Produto', type: 'recorrente', cadence: 'anual', amount: 54000, since: '2025-01', status: 'Ativo' },
        { name: 'Integração Fiscal (NF-e)', kind: 'Serviço', type: 'pontual', cadence: null, amount: 19800, since: '2025-01', status: 'Concluído' },
        { name: 'Suporte Premium', kind: 'Serviço', type: 'recorrente', cadence: 'mensal', amount: 2600, since: '2025-02', status: 'Ativo' },
      ],
    },
    {
      id: 5, name: 'Lumen Saúde', cnpj: '45.112.330/0001-78', segment: 'Healthtech',
      address: 'Rua Pamplona, 1018 · cj. 32 — Jardim Paulista, São Paulo/SP · 01405-001',
      resp: { name: 'Sofia Andrade', email: 'sofia@lumensaude.com' },
      fin: { name: 'Igor Bastos', email: 'financeiro@lumensaude.com' },
      since: '2024-05', status: 'Ativo', open: 0,
      contracts: [
        { name: 'Assessoria de Captação', kind: 'Serviço', type: 'pontual', cadence: null, amount: 22000, since: '2024-05', status: 'Concluído' },
        { name: 'Licença BASE Pro · 12 assentos', kind: 'Produto', type: 'recorrente', cadence: 'mensal', amount: 1980, since: '2024-08', status: 'Ativo' },
      ],
    },
    {
      id: 6, name: 'Studio Mara', cnpj: '—', segment: 'Design & Branding',
      address: 'Rua Augusta, 2690 · sala 5 — Cerqueira César, São Paulo/SP · 01412-100',
      resp: { name: 'Mara Vidal', email: 'ola@studiomara.com' },
      fin: { name: 'Mara Vidal', email: 'ola@studiomara.com' },
      since: '2026-05', status: 'Prospect', open: 0,
      contracts: [],
    },
  ],
  suppliers: [
    { id: 1, name: 'AWS', segment: 'Infraestrutura', contact: 'billing@aws.amazon.com', status: 'Recorrente', amount: 1250 },
    { id: 2, name: 'Meta', segment: 'Mídia', contact: 'ads@meta.com', status: 'Mensal', amount: 980 },
    { id: 3, name: 'Copel', segment: 'Energia', contact: 'faturas@copel.com', status: 'Mensal', amount: 840 },
    { id: 4, name: 'Terceiros', segment: 'Operações', contact: 'ux.consultoria@email.com', status: 'Variável', amount: 2400 },
  ],
};

// ---------- chart geometry ----------
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function AreaChart({ values, w = 660, h = 230, color = '#5a39e6', dark = false }) {
  const pad = { l: 6, r: 6, t: 16, b: 8 };
  const min = Math.min(...values), max = Math.max(...values), span = (max - min) || 1;
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const pts = values.map((v, i) => ({ x: pad.l + iw * i / (values.length - 1), y: pad.t + ih * (1 - (v - min) / span) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(pad.t + ih).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pad.t + ih).toFixed(1)} Z`;
  const last = pts[pts.length - 1];
  const gid = 'ag' + Math.random().toString(36).slice(2, 8);
  const grid = dark ? 'rgba(255,255,255,.16)' : '#f0eff6';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={dark ? '#ffffff' : color} stopOpacity={dark ? 0.34 : 0.20} />
          <stop offset="1" stopColor={dark ? '#ffffff' : color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((r, i) => (
        <line key={i} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * r} y2={pad.t + ih * r} stroke={grid} strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={dark ? '#ffffff' : color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="5.5" fill={dark ? '#ffffff' : color} stroke={dark ? color : '#fff'} strokeWidth="2.5" />
    </svg>
  );
}

function Sparkline({ values, color = '#5a39e6', h = 38 }) {
  const w = 130;
  const min = Math.min(...values), max = Math.max(...values), span = (max - min) || 1;
  const pts = values.map((v, i) => ({ x: w * i / (values.length - 1), y: 4 + (h - 8) * (1 - (v - min) / span) }));
  const line = smoothPath(pts);
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const gid = 'sp' + Math.random().toString(36).slice(2, 8);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.18" /><stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Donut({ segments, size = 156, thickness = 22 }) {
  const total = segments.reduce((s, x) => s + x.amount, 0) || 1;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0eff6" strokeWidth={thickness} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((seg, i) => {
            const dash = c * seg.amount / total;
            const el = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color}
                strokeWidth={thickness} strokeDasharray={`${dash - 2.5} ${c - dash + 2.5}`}
                strokeDashoffset={-acc} strokeLinecap="round" />
            );
            acc += dash;
            return el;
          })}
        </g>
      </svg>
      <div className="fx-donut-center">
        <span className="lb">Total</span>
        <span className="vl fx-num">{brl0(total)}</span>
      </div>
    </div>
  );
}

// helpers
const fmtBR = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}`; };
function categoryBreakdown(entries) {
  const map = {};
  entries.filter((e) => e.type === 'expense').forEach((e) => { map[e.cat] = (map[e.cat] || 0) + e.amount; });
  return Object.entries(map).map(([name, amount]) => ({ name, amount, color: CAT_COLORS[name] || '#94a3b8' }))
    .sort((a, b) => b.amount - a.amount);
}

// ---------- client analytics ----------
const CADENCE_LABEL = { mensal: 'Mensal', trimestral: 'Trimestral', anual: 'Anual' };
const CADENCE_MULT = { mensal: 1, trimestral: 1 / 3, anual: 1 / 12 };

// Lifetime value: pontual = valor cheio; recorrente = valor mensal-equivalente × meses ativos desde "since".
function monthsBetween(iso, ref = '2026-06') {
  const [y1, m1] = iso.split('-').map(Number);
  const [y2, m2] = ref.split('-').map(Number);
  return Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
}
function clientLTV(c) {
  return (c.contracts || []).reduce((sum, k) => {
    if (k.type === 'pontual') return sum + k.amount;
    const monthly = k.amount * (CADENCE_MULT[k.cadence] || 1);
    return sum + Math.round(monthly * monthsBetween(k.since));
  }, 0);
}
function clientMRR(c) {
  return (c.contracts || []).filter((k) => k.type === 'recorrente' && k.status === 'Ativo')
    .reduce((s, k) => s + Math.round(k.amount * (CADENCE_MULT[k.cadence] || 1)), 0);
}
function clientTicket(c) {
  const ks = c.contracts || [];
  if (!ks.length) return 0;
  return Math.round(ks.reduce((s, k) => s + k.amount, 0) / ks.length);
}

const fmtSince = (iso) => {
  if (!iso || iso === '—') return '—';
  const [y, m] = iso.split('-');
  return `${MONTHS_SHORT[Number(m) - 1]}/${y}`;
};
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];


export { brl, brl0, BF, CAT_COLORS, AreaChart, Sparkline, Donut, fmtBR, categoryBreakdown, CADENCE_LABEL, clientLTV, clientMRR, clientTicket, fmtSince };

