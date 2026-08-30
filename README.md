# BASE

Monorepositório modular dos produtos internos da TOSS.

## Estrutura

- `apps/financeiro`: aplicação Financeiro existente (React, Vite e JavaScript).
- `apps/manutencao-sites`: espaço reservado para o futuro módulo de manutenção de sites.
- `apps/notificacoes-vencimentos`: espaço reservado para o futuro módulo de notificações de vencimentos.
- `packages/design-system`: identidade visual e seletor de aplicativos usados pelos módulos ativos.
- Demais diretórios de `packages`: capacidades compartilhadas somente quando houver reutilização real entre módulos.
- `docs`: documentação funcional, técnica e operacional.

O Financeiro continua autocontido. Regras de negócio permanecem dentro do módulo, e nenhuma capacidade foi extraída prematuramente para `packages`.

O seletor na marca BASE permite alternar entre os módulos. Em produção, configure `VITE_FINANCEIRO_URL` e `VITE_MANUTENCAO_SITES_URL` conforme os arquivos `.env.example` de cada aplicação.

## Financeiro operacional

O Financeiro usa Supabase Auth e PostgreSQL. Antes de publicar:

1. Crie um projeto no Supabase e execute a migração em `apps/financeiro/supabase/migrations`.
2. Crie o primeiro usuário em **Authentication → Users**.
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` conforme `apps/financeiro/.env.example`.
4. No primeiro acesso, o aplicativo cria o workspace BASE e associa o usuário como proprietário.

Clientes, fornecedores, lançamentos e configurações são persistidos no banco. As políticas RLS limitam o acesso aos membros do workspace; a chave publicável pode ficar no frontend, mas nenhuma chave `service_role` deve ser adicionada ao Vite.

## Comandos

Na raiz do repositório:

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

Para executar um módulo diretamente, use o filtro do workspace, por exemplo:

```bash
pnpm --filter @base/financeiro dev
```

## Critérios para compartilhamento

A central de clientes e a migração segura estão descritas em [Central de clientes](docs/10-central-de-clientes.md). O cadastro é único por workspace; cada app mantém seus dados específicos. O Financeiro usa a central em Clientes / Todos os clientes, sem recadastro.

Um código só deve ser promovido a `packages` quando houver pelo menos dois consumidores reais, uma API pública clara e testes que protejam o contrato. Identidade visual, autenticação, navegação e infraestrutura podem ser compartilhadas; regras específicas continuam no módulo de origem.
