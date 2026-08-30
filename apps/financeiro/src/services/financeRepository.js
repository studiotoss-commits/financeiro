import { supabase } from './supabase';

const DEFAULT_CATEGORIES = {
  income: ['Serviços', 'Projetos', 'Recebimentos', 'Outros'],
  expense: ['Operações', 'Infraestrutura', 'Marketing', 'Energia', 'Impostos', 'Outros'],
  supplier: ['Prestadores de serviços', 'Software e licenças', 'Infraestrutura', 'Marketing', 'Contabilidade e jurídico', 'Outros'],
  bank: ['Banco do Brasil', 'Bradesco', 'Caixa Econômica Federal', 'Itaú', 'Nubank', 'Santander'],
};

const throwIfError = ({ error }) => {
  if (error) throw error;
};

export async function loadFinanceState(user) {
  const workspaceResult = await supabase.rpc('bootstrap_finance_workspace', {
    workspace_name: 'BASE',
  });
  throwIfError(workspaceResult);
  const workspaceId = workspaceResult.data;

  const [transactionsResult, clientsResult, suppliersResult, settingsResult] = await Promise.all([
    supabase.from('finance_transactions').select('payload').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('finance_clients').select('payload').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('finance_suppliers').select('payload').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    supabase.from('finance_settings').select('payload, revision').eq('workspace_id', workspaceId).maybeSingle(),
  ]);

  [transactionsResult, clientsResult, suppliersResult, settingsResult].forEach(throwIfError);
  const settings = settingsResult.data?.payload || {};
  currentRevision = Number(settingsResult.data?.revision) || 0;

  return {
    workspaceId,
    entries: transactionsResult.data.map((row) => row.payload),
    clients: clientsResult.data.map((row) => row.payload),
    suppliers: suppliersResult.data.map((row) => row.payload),
    categories: { ...DEFAULT_CATEGORIES, ...(settings.categories || {}) },
    taxRate: Number(settings.taxRate) || 0,
    account: settings.account || {
      company: 'BASE Financeiro',
      owner: user.user_metadata?.name || user.email?.split('@')[0] || 'Administrador',
      email: user.email || '',
      taxRate: 0,
    },
  };
}

let saveQueue = Promise.resolve();
let currentRevision = 0;

export function queueFinanceState(state) {
  saveQueue = saveQueue.catch(() => undefined).then(async () => {
    const persist = () => supabase.rpc('save_finance_state', {
        p_workspace_id: state.workspaceId,
        p_expected_revision: currentRevision,
        p_state: {
          entries: state.entries,
          clients: state.clients,
          suppliers: state.suppliers,
          settings: {
            categories: state.categories,
            taxRate: state.taxRate,
            account: state.account,
          },
        },
    });
    let result = await persist();
    if (result.error?.message?.includes('Finance state changed in another session')) {
      const revisionResult = await supabase.from('finance_settings').select('revision').eq('workspace_id', state.workspaceId).maybeSingle();
      throwIfError(revisionResult);
      currentRevision = Number(revisionResult.data?.revision) || 0;
      result = await persist();
    }
    throwIfError(result);
    currentRevision = Number(result.data);
  });
  return saveQueue;
}
