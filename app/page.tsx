"use client";

import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Building2,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Settings,
  Plus,
  X,
  TrendingUp,
  Clock3,
  Landmark,
  BadgeDollarSign,
  ChevronRight,
  UserCircle2,
  BriefcaseBusiness,
  Pencil,
  Menu,
} from "lucide-react";

type EntryType = "income" | "expense";
type ViewType = "dashboard" | "entradas" | "saidas" | "clientes" | "fornecedores";

type Entry = {
  id: number;
  type: EntryType;
  description: string;
  category: string;
  entity: string;
  amount: number;
  date: string;
  status: string;
};

type FormState = {
  type: EntryType;
  description: string;
  amount: string;
  date: string;
  category: string;
  entity: string;
  status: string;
  isNewEntity: boolean;
};

type Client = {
  id: number;
  name: string;
  segment: string;
  contact: string;
  status: string;
  openAmount: number;
};

type Supplier = {
  id: number;
  name: string;
  type: string;
  contact: string;
  status: string;
  amount: number;
};

const CURRENT_MONTH = "2026-04";
const DEFAULT_DATE = "2026-04-08";

const initialEntries: Entry[] = [
  { id: 1, type: "expense", description: "Amazon Web Services", category: "Infraestrutura", entity: "AWS", amount: 1250, date: "2026-04-07", status: "Auto-pay" },
  { id: 2, type: "income", description: "Stripe Transfer: Project Orion", category: "Serviços", entity: "Alpha Corp", amount: 4800, date: "2026-04-06", status: "Processado" },
  { id: 3, type: "expense", description: "Consultoria Design UX", category: "Operações", entity: "Terceiros", amount: 2400, date: "2026-04-05", status: "Transferência" },
  { id: 4, type: "income", description: "Retainer Mensal", category: "Serviços", entity: "Digital Horizon", amount: 15320, date: "2026-04-08", status: "A receber" },
  { id: 5, type: "expense", description: "Meta Ads", category: "Marketing", entity: "Meta", amount: 980, date: "2026-04-08", status: "Vence hoje" },
  { id: 6, type: "expense", description: "Energia Elétrica - HQ", category: "Operações", entity: "Copel", amount: 840, date: "2026-04-10", status: "Próximo vencimento" },
  { id: 7, type: "income", description: "Projeto Atlas - Entrada inicial", category: "Serviços", entity: "Nova Capital", amount: 6200, date: "2026-03-12", status: "Processado" },
];

const initialClients: Client[] = [
  { id: 1, name: "Alpha Corp", segment: "Tecnologia", contact: "financeiro@alphacorp.com", status: "Ativo", openAmount: 4800 },
  { id: 2, name: "Digital Horizon", segment: "Serviços Digitais", contact: "contato@digitalhorizon.com", status: "Recorrente", openAmount: 15320 },
  { id: 3, name: "Nova Capital", segment: "Investimentos", contact: "atendimento@novacapital.com", status: "Ativo", openAmount: 0 },
];

const initialSuppliers: Supplier[] = [
  { id: 1, name: "AWS", type: "Infraestrutura", contact: "billing@aws.amazon.com", status: "Recorrente", amount: 1250 },
  { id: 2, name: "Meta", type: "Mídia", contact: "ads-billing@meta.com", status: "Mensal", amount: 980 },
  { id: 3, name: "Copel", type: "Energia", contact: "faturas@copel.com", status: "Mensal", amount: 840 },
  { id: 4, name: "Terceiros", type: "Operações", contact: "ux.consultoria@email.com", status: "Variável", amount: 2400 },
];

const categoryConfig: Record<string, string> = {
  Infraestrutura: "bg-indigo-500",
  Marketing: "bg-emerald-500",
  Operações: "bg-amber-500",
  Serviços: "bg-sky-500",
};

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function monthLabel(value: string) {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function getDefaultForm(type: EntryType = "income", date: string = DEFAULT_DATE): FormState {
  return {
    type,
    description: "",
    amount: "",
    date,
    category: type === "income" ? "Serviços" : "Operações",
    entity: "",
    status: "Novo",
    isNewEntity: false,
  };
}

function DashboardCard({ icon: Icon, label, value, note, tone = "indigo" }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; note: string; tone?: "indigo" | "emerald" | "amber" | "rose"; }) {
  const toneMap = {
    indigo: { box: "bg-[#f1edff] text-[#5a39e6]", badge: "bg-[#eef9f0] text-[#3abd66]" },
    emerald: { box: "bg-[#e8f7f3] text-[#1d9a83]", badge: "bg-[#eefbf6] text-[#00a679]" },
    amber: { box: "bg-[#fff4df] text-[#da8b00]", badge: "bg-[#f6f7fb] text-[#8b93a7]" },
    rose: { box: "bg-[#ffeef1] text-[#ff4563]", badge: "bg-[#fff1f3] text-[#ff4f6b]" },
  };

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-[#ece9f4] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(18,18,23,0.03)] sm:px-6 sm:py-6">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-5 -translate-y-2 opacity-[0.045] text-slate-700 sm:h-28 sm:w-28">
        <Icon className="h-full w-full stroke-1" />
      </div>
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between sm:mb-5">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${toneMap[tone].box}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold sm:px-3 sm:text-[11px] ${toneMap[tone].badge}`}>{note}</span>
        </div>
        <p className="text-[14px] font-medium text-[#4e6078] sm:text-[15px]">{label}</p>
        <h3 className="mt-1 text-[19px] font-extrabold tracking-[-0.03em] text-[#121826] sm:text-[21px]">{value}</h3>
      </div>
    </div>
  );
}

function SidebarLink({ icon: Icon, label, active = false, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean; onClick: () => void; }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition sm:px-5 sm:py-[14px] ${active ? "bg-white text-[#5a39e6] shadow-[0_1px_2px_rgba(18,18,23,0.04)]" : "text-[#5f7191] hover:bg-white hover:text-[#121826]"}`}>
      <Icon className={`h-[19px] w-[19px] ${active ? "stroke-[2.2]" : "stroke-[2]"}`} />
      <span className="text-[15px] font-medium">{label}</span>
    </button>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode; }) {
  return (
    <div className="rounded-[20px] border border-[#ece9f4] bg-white p-4 shadow-[0_1px_2px_rgba(18,18,23,0.03)] sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#121826]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function EntryRow({ item, onEdit }: { item: Entry; onEdit?: (item: Entry) => void; }) {
  const isIncome = item.type === "income";
  return (
    <div className="rounded-[16px] border border-[#efedf5] px-4 py-4 transition hover:border-[#e5e0f2] hover:bg-[#fcfbff]">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] sm:h-12 sm:w-12 ${isIncome ? "bg-[#edf8f1] text-[#16a34a]" : "bg-[#fff1f3] text-[#ef476f]"}`}>
          {isIncome ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#121826]">{item.description}</p>
              <p className="mt-1 text-[12px] leading-5 text-[#7b8699]">{item.category} • {formatDate(item.date)} • {item.entity}</p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="text-left sm:text-right">
                <p className={`text-[15px] font-bold ${isIncome ? "text-[#16a34a]" : "text-[#ef476f]"}`}>{isIncome ? "+ " : "- "}{currency(item.amount)}</p>
                <p className="text-[12px] text-[#7b8699]">{item.status}</p>
              </div>
              {onEdit ? (
                <button type="button" onClick={() => onEdit(item)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ebe8f1] text-[#6b7280] transition hover:bg-[#f5f3fb] hover:text-[#5a39e6]" aria-label={`Editar ${item.description}`}>
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ icon: Icon, title, subtitle, badge, value }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; badge: string; value: string; }) {
  return (
    <div className="rounded-[16px] border border-[#efedf5] px-4 py-4 transition hover:border-[#e5e0f2] hover:bg-[#fcfbff]">
      <div className="flex items-start gap-4 sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#f3f0ff] text-[#5a39e6] sm:h-12 sm:w-12"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#121826]">{title}</p>
              <p className="truncate text-[12px] text-[#7b8699]">{subtitle}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-flex rounded-full bg-[#f4f2fb] px-3 py-1 text-[11px] font-semibold text-[#6a7387]">{badge}</span>
              <p className="mt-2 text-[14px] font-semibold text-[#121826]">{value}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [activeView, setActiveView] = useState<ViewType>("dashboard");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("Mensal");
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [form, setForm] = useState<FormState>(getDefaultForm());

  const entriesForMonth = useMemo(() => entries.filter((item) => item.date.startsWith(selectedMonth)), [entries, selectedMonth]);
  const filteredEntries = useMemo(() => entriesForMonth.filter((item) => `${item.description} ${item.category} ${item.entity}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(new Date(b.date)) - Number(new Date(a.date))), [entriesForMonth, query]);
  const incomeEntries = useMemo(() => filteredEntries.filter((item) => item.type === "income"), [filteredEntries]);
  const expenseEntries = useMemo(() => filteredEntries.filter((item) => item.type === "expense"), [filteredEntries]);

  const metrics = useMemo(() => {
    const income = entriesForMonth.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expense = entriesForMonth.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const receivable = entriesForMonth.filter((item) => item.type === "income" && item.status.toLowerCase() !== "processado").reduce((sum, item) => sum + item.amount, 0);
    const payable = entriesForMonth.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    const cashflow = income - expense;
    const margin = income > 0 ? (cashflow / income) * 100 : 0;
    const categories = Object.entries(entriesForMonth.filter((item) => item.type === "expense").reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {})).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
    const upcoming = entriesForMonth.filter((item) => {
      const status = item.status.toLowerCase();
      return status.includes("vence") || status.includes("próximo") || status.includes("receber");
    }).slice(0, 4);
    return { income, expense, receivable, payable, cashflow, margin, categories, upcoming };
  }, [entriesForMonth]);

  const totalExpenses = Math.max(metrics.expense, 1);
  const activeViewLabel = activeView === "saidas" ? "Saídas" : activeView === "entradas" ? "Entradas" : activeView === "clientes" ? "Clientes" : activeView === "fornecedores" ? "Fornecedores" : "Dashboard";

  function closeModal() {
    setIsModalOpen(false);
    setEditingEntryId(null);
    setForm(getDefaultForm(activeView === "saidas" ? "expense" : "income", DEFAULT_DATE));
  }

  function openNewEntry(type: EntryType = activeView === "saidas" ? "expense" : "income") {
    setEditingEntryId(null);
    setForm(getDefaultForm(type, DEFAULT_DATE));
    setIsModalOpen(true);
  }

  function openEditEntry(entry: Entry) {
    setEditingEntryId(entry.id);
    setForm({ type: entry.type, description: entry.description, amount: String(entry.amount), date: entry.date, category: entry.category, entity: entry.entity, status: entry.status, isNewEntity: false });
    setIsModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.description || !form.amount || !form.entity) return;

    const normalizedEntity = form.entity.trim();
    const payload: Entry = { id: editingEntryId ?? Date.now(), type: form.type, description: form.description, amount: Number(form.amount), date: form.date, category: form.category, entity: normalizedEntity, status: form.status };

    if (editingEntryId !== null) {
      setEntries((current) => current.map((item) => (item.id === editingEntryId ? payload : item)));
    } else {
      setEntries((current) => [payload, ...current]);
    }

    if (normalizedEntity) {
      if (form.type === "income") {
        setClients((current) => {
          const exists = current.some((item) => item.name.toLowerCase() === normalizedEntity.toLowerCase());
          if (exists) return current;
          return [{ id: Date.now(), name: normalizedEntity, segment: "A definir", contact: "Completar cadastro", status: "Novo", openAmount: 0 }, ...current];
        });
      } else {
        setSuppliers((current) => {
          const exists = current.some((item) => item.name.toLowerCase() === normalizedEntity.toLowerCase());
          if (exists) return current;
          return [{ id: Date.now(), name: normalizedEntity, type: "A definir", contact: "Completar cadastro", status: "Novo", amount: 0 }, ...current];
        });
      }
    }

    setSelectedMonth(form.date.slice(0, 7));
    setActiveView(form.type === "income" ? "entradas" : "saidas");
    closeModal();
  }

  function renderDashboard() {
    return (
      <>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          <DashboardCard icon={TrendingUp} label="Fluxo de Caixa" value={currency(metrics.cashflow)} note="+12.4%" tone="indigo" />
          <DashboardCard icon={BadgeDollarSign} label="Margem de Lucro" value={percent(metrics.margin)} note="Meta: 22%" tone="emerald" />
          <DashboardCard icon={Clock3} label="Contas a Receber" value={currency(metrics.receivable)} note={`${incomeEntries.length} lançamentos`} tone="amber" />
          <DashboardCard icon={Wallet} label="Contas a Pagar" value={currency(metrics.payable)} note="Vence hoje" tone="rose" />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <SectionCard title="Atividades Recentes" action={<button onClick={() => setActiveView("entradas")} className="text-left text-[13px] font-bold text-[#5a39e6]">Ver tudo</button>}>
            <div className="space-y-3">
              {filteredEntries.slice(0, 6).map((item) => <EntryRow key={item.id} item={item} onEdit={openEditEntry} />)}
            </div>
          </SectionCard>

          <div className="rounded-[20px] bg-[#5a39e6] p-5 text-white shadow-[0_10px_30px_rgba(90,57,230,0.22)] sm:p-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/75">Próximos Vencimentos</span>
            <h3 className="mt-2 text-[24px] font-extrabold tracking-[-0.04em] sm:text-[27px]">Fluxo de Caixa Próximo</h3>
            <p className="mt-2 text-[14px] leading-6 text-white/78">Você tem {metrics.upcoming.length} lançamentos com vencimento ou movimentação próxima no mês atual.</p>
            <div className="mt-6 space-y-3 sm:mt-8">
              {metrics.upcoming.map((item) => (
                <div key={item.id} className="rounded-[16px] bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[15px] font-semibold">{item.description}</p>
                      <p className="text-[12px] text-white/70">{item.entity}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[15px] font-bold">{item.type === "income" ? "+ " : "- "}{currency(item.amount)}</p>
                      <p className="text-[12px] text-white/70">{item.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveView("saidas")} className="mt-6 w-full rounded-full bg-white px-4 py-3 text-[14px] font-bold text-[#5a39e6] transition hover:bg-[#f6f3ff] sm:mt-8">Gerenciar Fluxo de Caixa</button>
          </div>
        </section>

        <section>
          <SectionCard title="Gastos por Categoria">
            <div className="space-y-5">
              {metrics.categories.map((item) => {
                const ratio = (item.amount / totalExpenses) * 100;
                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-[14px]">
                      <div className="flex items-center gap-2.5"><span className={`h-2.5 w-2.5 rounded-full ${categoryConfig[item.name] || "bg-slate-400"}`} /><span className="font-medium text-[#4e6078]">{item.name}</span></div>
                      <span className="font-bold text-[#121826]">{percent(ratio)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[#f1eff6]"><div className={`h-full rounded-full ${categoryConfig[item.name] || "bg-slate-400"}`} style={{ width: `${ratio}%` }} /></div>
                    <p className="text-[12px] text-[#7b8699]">{currency(item.amount)}</p>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </section>
      </>
    );
  }

  function renderEntriesPage(type: EntryType) {
    const title = type === "income" ? "Entradas" : "Saídas";
    const list = type === "income" ? incomeEntries : expenseEntries;
    return (
      <SectionCard title={title} action={<button onClick={() => openNewEntry(type)} className="w-full rounded-full bg-[#5a39e6] px-4 py-2 text-[13px] font-semibold text-white sm:w-auto">{type === "income" ? "Novo recebimento" : "Novo pagamento"}</button>}>
        <div className="mb-6 flex flex-col gap-4 rounded-[16px] bg-[#f8f7fb] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-[#7b8699]">Mês atual</p>
            <p className="mt-1 text-[15px] font-semibold text-[#121826]">{monthLabel(selectedMonth)}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[12px] uppercase tracking-[0.18em] text-[#7b8699]">Total</p>
            <p className="mt-1 text-[18px] font-extrabold text-[#121826]">{currency(list.reduce((sum, item) => sum + item.amount, 0))}</p>
          </div>
        </div>
        <div className="space-y-3">{list.map((item) => <EntryRow key={item.id} item={item} onEdit={openEditEntry} />)}</div>
      </SectionCard>
    );
  }

  function renderClientsPage() {
    return <SectionCard title="Clientes"><div className="space-y-3">{clients.map((item) => <ContactRow key={item.id} icon={UserCircle2} title={item.name} subtitle={`${item.segment} • ${item.contact}`} badge={item.status} value={item.openAmount > 0 ? currency(item.openAmount) : "Sem aberto"} />)}</div></SectionCard>;
  }

  function renderSuppliersPage() {
    return <SectionCard title="Fornecedores"><div className="space-y-3">{suppliers.map((item) => <ContactRow key={item.id} icon={BriefcaseBusiness} title={item.name} subtitle={`${item.type} • ${item.contact}`} badge={item.status} value={currency(item.amount)} />)}</div></SectionCard>;
  }

  function renderContent() {
    if (activeView === "dashboard") return renderDashboard();
    if (activeView === "entradas") return renderEntriesPage("income");
    if (activeView === "saidas") return renderEntriesPage("expense");
    if (activeView === "clientes") return renderClientsPage();
    if (activeView === "fornecedores") return renderSuppliersPage();
    return renderDashboard();
  }

  const sideMenu = (
    <>
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#5a39e6] text-white shadow-[0_8px_16px_rgba(90,57,230,0.22)]"><Landmark className="h-5 w-5" /></div>
        <div>
          <h1 className="text-[17px] font-extrabold leading-5 tracking-[-0.04em] text-[#4c42d9]">Financeiro</h1>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#74829a]">Painel Administrativo</p>
        </div>
      </div>
      <nav className="space-y-2">
        <SidebarLink icon={LayoutDashboard} label="Dashboard" active={activeView === "dashboard"} onClick={() => { setActiveView("dashboard"); setMobileMenuOpen(false); }} />
        <SidebarLink icon={Wallet} label="Entradas" active={activeView === "entradas"} onClick={() => { setActiveView("entradas"); setMobileMenuOpen(false); }} />
        <SidebarLink icon={ArrowUpCircle} label="Saídas" active={activeView === "saidas"} onClick={() => { setActiveView("saidas"); setMobileMenuOpen(false); }} />
        <SidebarLink icon={Users} label="Clientes" active={activeView === "clientes"} onClick={() => { setActiveView("clientes"); setMobileMenuOpen(false); }} />
        <SidebarLink icon={Building2} label="Fornecedores" active={activeView === "fornecedores"} onClick={() => { setActiveView("fornecedores"); setMobileMenuOpen(false); }} />
      </nav>
      <div className="mt-auto border-t border-[#e7e3ee] pt-5">
        <div className="mt-4 space-y-2">
          <SidebarLink icon={HelpCircle} label="Suporte" onClick={() => undefined} />
          <SidebarLink icon={LogOut} label="Logout" onClick={() => undefined} />
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f7f4fb] text-[#121826]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[252px] shrink-0 border-r border-[#e8e4ef] bg-[#f5f6f8] px-4 py-5 md:flex md:flex-col">{sideMenu}</aside>
        <main className="flex-1">
          <header className="sticky top-0 z-20 border-b border-[#ebe6f2] bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ebe8f1] text-[#5f7191] md:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
                <h2 className="text-[18px] font-bold tracking-[-0.04em] text-[#1a2130] sm:text-[20px]">Financeiro</h2>
                <div className="hidden h-[50px] min-w-[260px] items-center gap-3 rounded-full bg-[#f3f3f7] px-5 lg:flex xl:min-w-[315px]">
                  <Search className="h-4 w-4 text-[#8a95a8]" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar transações..." className="w-full border-0 bg-transparent p-0 text-[15px] text-[#4e6078] outline-none placeholder:text-[#98a2b3]" />
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={() => openNewEntry(activeView === "saidas" ? "expense" : "income")} className="hidden items-center gap-2 rounded-full bg-[#5a39e6] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_10px_20px_rgba(90,57,230,0.18)] transition hover:brightness-105 sm:flex lg:px-5 lg:text-[15px]">
                  <Plus className="h-4 w-4" />
                  {activeView === "saidas" ? "Nova Saída" : "Novo Lançamento"}
                </button>
                <button className="rounded-full p-2 text-[#738199] transition hover:bg-[#f5f3fb]"><Bell className="h-5 w-5" /></button>
                <button className="rounded-full p-2 text-[#738199] transition hover:bg-[#f5f3fb]"><Settings className="h-5 w-5" /></button>
                <div className="h-10 w-10 overflow-hidden rounded-full border-[3px] border-[#ece8f7] bg-[radial-gradient(circle_at_30%_30%,#4f77d6,#16233f)]" />
              </div>
            </div>
            <div className="px-4 pb-4 sm:px-6 lg:hidden">
              <div className="flex h-[48px] items-center gap-3 rounded-full bg-[#f3f3f7] px-4">
                <Search className="h-4 w-4 text-[#8a95a8]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar transações..." className="w-full border-0 bg-transparent p-0 text-[14px] text-[#4e6078] outline-none placeholder:text-[#98a2b3]" />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-[12px] text-[#7b8699]">
                <span className="font-medium">Período ativo:</span>
                <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-[#5a39e6] shadow-[0_1px_2px_rgba(18,18,23,0.03)]">{monthLabel(selectedMonth)}</span>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-[#7b8699]">
                <span className="font-medium">Tela atual</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-semibold text-[#121826]">{activeViewLabel}</span>
              </div>
            </div>
            {renderContent()}
          </div>
        </main>
      </div>

      <button onClick={() => openNewEntry(activeView === "saidas" ? "expense" : "income")} className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#5a39e6] text-white shadow-[0_14px_28px_rgba(90,57,230,0.28)] transition hover:brightness-105 sm:bottom-6 sm:right-6 md:hidden"><Plus className="h-6 w-6" /></button>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-40 bg-[#1a1730]/45 backdrop-blur-sm md:hidden">
          <div className="h-full w-[84%] max-w-[290px] border-r border-[#e8e4ef] bg-[#f5f6f8] px-4 py-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[16px] font-bold text-[#1a2130]">Menu</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ebe8f1] text-[#5f7191]"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex h-[calc(100%-56px)] flex-col">{sideMenu}</div>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1730]/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#eee9f4] bg-[#fbfaff] px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#121826] sm:text-[19px]">{editingEntryId !== null ? "Editar Lançamento" : form.type === "income" ? "Nova Entrada" : "Nova Saída"}</h3>
                <p className="text-[13px] text-[#7b8699] sm:text-[14px]">{editingEntryId !== null ? "Atualize os dados do lançamento" : "Preencha os dados do lançamento"}</p>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 text-[#7b8699] transition hover:bg-[#f2eef8]"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex max-h-[calc(90vh-80px)] flex-col">
              <div className="space-y-6 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                <div className="rounded-[16px] border border-[#ece9f4] bg-[#f8f7fb] px-4 py-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7b8699]">Tipo de lançamento</p>
                  <p className={`mt-2 text-[16px] font-bold ${form.type === "income" ? "text-[#16924d]" : "text-[#ef476f]"}`}>{form.type === "income" ? "Entrada" : "Saída"}</p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-[#7b8699]">Descrição</span>
                  <input className="w-full rounded-[16px] border border-[#ebe8f1] px-4 py-3.5 text-[15px] outline-none transition focus:border-[#a891ff]" placeholder="Ex: Pagamento Projeto Orion" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-[#7b8699]">Valor</span>
                    <input type="number" step="0.01" className="w-full rounded-[16px] border border-[#ebe8f1] px-4 py-3.5 text-[15px] outline-none transition focus:border-[#a891ff]" placeholder="0,00" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-[#7b8699]">Data</span>
                    <input type="date" className="w-full rounded-[16px] border border-[#ebe8f1] px-4 py-3.5 text-[15px] outline-none transition focus:border-[#a891ff]" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-[#7b8699]">Categoria</span>
                    <select className="w-full rounded-[16px] border border-[#ebe8f1] px-4 py-3.5 text-[15px] outline-none transition focus:border-[#a891ff]" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
                      {form.type === "income" ? (
                        <>
                          <option value="Serviços">Serviços</option>
                          <option value="Recebimentos">Recebimentos</option>
                          <option value="Projetos">Projetos</option>
                          <option value="Outros">Outros</option>
                        </>
                      ) : (
                        <>
                          <option value="Operações">Operações</option>
                          <option value="Infraestrutura">Infraestrutura</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Outros">Outros</option>
                        </>
                      )}
                    </select>
                  </label>

                  <div className="block">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-[#7b8699]">Entidade</span>
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, isNewEntity: !prev.isNewEntity, entity: "" }))} className="text-[12px] font-semibold text-[#5a39e6]">{form.isNewEntity ? "Selecionar existente" : "Nova entidade"}</button>
                    </div>

                    {form.isNewEntity ? (
                      <input className="w-full rounded-[16px] border border-[#ebe8f1] px-4 py-3.5 text-[15px] outline-none transition focus:border-[#a891ff]" placeholder={form.type === "income" ? "Nome do cliente" : "Nome do fornecedor"} value={form.entity} onChange={(e) => setForm((prev) => ({ ...prev, entity: e.target.value }))} />
                    ) : (
                      <select className="w-full rounded-[16px] border border-[#ebe8f1] px-4 py-3.5 text-[15px] outline-none transition focus:border-[#a891ff]" value={form.entity} onChange={(e) => setForm((prev) => ({ ...prev, entity: e.target.value }))}>
                        <option value="">Selecione...</option>
                        {(form.type === "income" ? clients : suppliers).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                      </select>
                    )}

                    <p className="mt-2 text-[12px] leading-5 text-[#7b8699]">{form.isNewEntity ? "Cadastre apenas o nome agora. Depois você completa os dados em Clientes ou Fornecedores." : "Você pode selecionar um cadastro existente ou criar uma nova entidade."}</p>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-[#7b8699]">Status</span>
                  <input className="w-full rounded-[16px] border border-[#ebe8f1] px-4 py-3.5 text-[15px] outline-none transition focus:border-[#a891ff]" placeholder="Ex: Processado, A receber, Vence hoje" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} />
                </label>
              </div>

              <div className="border-t border-[#eee9f4] bg-white px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={closeModal} className="flex-1 rounded-[16px] border border-[#ebe8f1] px-4 py-3.5 text-[15px] font-semibold text-[#5f6f86] transition hover:bg-[#faf9fc]">Cancelar</button>
                  <button type="submit" className="flex-[1.4] rounded-[16px] bg-[#5a39e6] px-4 py-3.5 text-[15px] font-semibold text-white transition hover:brightness-105">{editingEntryId !== null ? "Salvar Alterações" : "Salvar Lançamento"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
