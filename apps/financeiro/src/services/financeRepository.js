import { supabase } from './supabase';
import { mergeClient } from './clientModel';
import { createFinancePersistence } from './financePersistence';

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

  const result = await supabase.rpc('load_finance_snapshot', { p_workspace_id: workspaceId });
  throwIfError(result);
  if (!result.data) throw new Error('Workspace access denied');
  const snapshot = result.data;
  const settings = snapshot.settings?.payload || {};
  const profiles = new Map(snapshot.profiles.map(p => [p.id, p]));
  const clients = snapshot.clients.map(row => mergeClient(row, profiles.get(row.id)));
  const persistence = createFinancePersistence(supabase, workspaceId, Number(snapshot.settings?.revision) || 0, clients);

  return {
    workspaceId,
    entries: snapshot.entries,
    clients,
    suppliers: snapshot.suppliers,
    save: persistence.save,
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
