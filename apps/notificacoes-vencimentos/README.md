# NOT — serviços e vencimentos

App React/Vite independente em `/not/`, usando Supabase e clientes da central BASE. Acesso pelo seletor de apps do Financeiro.

`pnpm dev:not` inicia em `http://127.0.0.1:5176/not/`. O Vite utiliza as variáveis públicas de `apps/financeiro/.env.local`; não duplicar credenciais nem usar `service_role` no frontend. `pnpm build` gera o artefato conjunto de produção.

Escopo, permissões e operação: [documentação do NOT](../../docs/11-not-vencimentos.md).
