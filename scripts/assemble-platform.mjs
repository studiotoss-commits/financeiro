import fs from 'node:fs/promises';
// O NOT tem build independente e compartilha a origem para reutilizar a sessão BASE.
await fs.cp(new URL('../apps/notificacoes-vencimentos/dist/',import.meta.url),new URL('../apps/financeiro/dist/not/',import.meta.url),{recursive:true});
