// Mesmo contrato da RPC base_client_fields. Somente dados cadastrais são compartilhados.
export const CENTRAL_FIELDS = Object.freeze(['name', 'tradeName', 'cnpj', 'stateRegistration',
  'cityRegistration', 'segment', 'address', 'origin', 'since', 'resp', 'fin', 'technical',
  'email', 'emails', 'phone', 'phones', 'whatsapp', 'whatsapps', 'documents', 'notes']);
const metadata = new Set(['id', 'status', 'archivedAt', '_baseRevision', '_hasFinanceProfile']);
export function splitClient(client) {
  const data = {}, finance = {};
  for (const [key, value] of Object.entries(client)) {
    if (metadata.has(key) || value === undefined) continue;
    (CENTRAL_FIELDS.includes(key) ? data : finance)[key] = value;
  }
  return { id: client.id, data, finance, status: client.status || 'Ativo', archived: Boolean(client.archivedAt) };
}
export function mergeClient(row, profile) {
  return { contracts: [], renewals: [], interactions: [], ...profile?.payload, ...row.payload,
    id: row.id, name: row.name, status: row.status, archivedAt: row.archived_at,
    _baseRevision: Number(row.revision), _hasFinanceProfile: Boolean(profile) };
}
export function clientFingerprint(client) { return JSON.stringify(splitClient(client)); }
export function findDuplicateClient(clients, candidate) {
  const document = String(candidate.cnpj || '').replace(/\D/g, '');
  return document && clients.find(c => c.id !== candidate.id && String(c.cnpj || '').replace(/\D/g, '') === document);
}
export function clientSaveError(error) {
  const message = error?.message || '';
  if (/changed in another session/.test(message)) return 'Os dados foram alterados em outra sessão. Suas mudanças não foram gravadas. Recarregue para conferir a versão atual antes de editar novamente.';
  if (/BASE updated/.test(message)) return 'O BASE foi atualizado. Recarregue a página antes de continuar.';
  if (/document already registered/.test(message)) return 'Já existe um cliente com esse CPF/CNPJ na central. Revise o cadastro antes de salvar.';
  if (/Archived client/.test(message)) return 'Este cliente foi arquivado. Recarregue os dados e restaure o cadastro antes de criar novos lançamentos.';
  return 'Não foi possível confirmar a gravação. Suas alterações continuam nesta tela. Baixe uma cópia e recarregue os dados antes de continuar.';
}
