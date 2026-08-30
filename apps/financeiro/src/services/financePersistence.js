import { clientFingerprint, splitClient } from './clientModel.js';

// Estado por instância/sessão, nunca compartilhado entre workspaces.
export function createFinancePersistence(client, workspaceId, revision, initialClients) {
  let currentRevision = revision;
  let queue = Promise.resolve();
  let blockedError = null;
  const savedClients = new Map(initialClients.map(c => [c.id, clientFingerprint(c)]));
  const revisions = new Map(initialClients.map(c => [c.id, c._baseRevision]));
  return {
    save(state) {
      const snapshot = structuredClone(state);
      queue = queue.catch(() => undefined).then(async () => {
        if (blockedError) throw blockedError;
        if (snapshot.workspaceId !== workspaceId) throw new Error('Workspace access denied');
        const changes = snapshot.clients.filter(c => savedClients.get(c.id) !== clientFingerprint(c))
          .map(c => ({ ...splitClient(c), expectedRevision: revisions.get(c.id) || 0 }));
        let result;
        try {
          result = await client.rpc('save_finance_state', {
          p_workspace_id: workspaceId,
          p_expected_revision: currentRevision,
          p_state: { version: 2, entries: snapshot.entries, suppliers: snapshot.suppliers, clientChanges: changes,
            settings: { categories: snapshot.categories, taxRate: snapshot.taxRate, account: snapshot.account } },
          });
        } catch (error) {
          blockedError = error;
          throw error;
        }
        const { data, error } = result;
        if (error) {
          // Resultado de rede incerto também exige recarga: não reenviar um estado que pode ter sido salvo.
          blockedError = error;
          throw error;
        }
        currentRevision = Number(data);
        for (const change of changes) revisions.set(change.id, change.expectedRevision + 1);
        for (const c of snapshot.clients) savedClients.set(c.id, clientFingerprint(c));
      });
      return queue;
    },
  };
}
