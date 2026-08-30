# Central de clientes do BASE

Decisão aprovada em 30/08/2026. Complementa os documentos 01–09: cadastro pertence ao BASE; contratos e dados financeiros pertencem ao Financeiro. O NOT será implementado depois desta fundação.

## Modelo e acesso

- `base_clients`: cadastro único por workspace; preserva UUIDs, contatos principais, financeiros e técnicos, CPF/CNPJ, endereço, origem, documentos, observações, datas e revisão. `archived_at` controla arquivamento sem cancelar serviços.
- `finance_client_profiles`: conserva contratos, renovações, interações e demais campos específicos do Financeiro. Não contém cópia dos campos cadastrais.
- `finance_transactions`: continua ligada aos mesmos UUIDs, agora por chave estrangeira composta `(workspace_id, client_id)` para a central. Não foi implementado o NOT nem alterada a regra de cálculo financeiro.
- `finance_workspaces` e `finance_workspace_members`: mantêm seus nomes para compatibilidade, mas definem a empresa e seus membros no BASE. Não há união automática de workspaces.
- `base_app_members`: acesso explícito a cada app. Todos os membros preexistentes recebem acesso ao Financeiro, preservando a operação. Um membro somente do NOT pode ler/editar a central, mas não ler perfis, lançamentos ou configurações financeiras. Administração dessas permissões continua restrita ao backend; não há UI de gestão de acessos nesta entrega.
- `finance_clients`: view de compatibilidade de leitura; reúne dados para versões antigas, sem ser uma segunda base. Escrita por versões antigas é recusada com solicitação de recarga.

## Interface desta entrega

A central é acessada em Clientes / Todos os clientes, no Financeiro, preservando a identidade visual. Inclui filtros de arquivamento e de existência de lançamentos financeiros. Cadastro rápido em lançamentos cria na mesma central. Pesquisa inclui nome fantasia e contatos financeiros. O filtro financeiro é baseado em lançamentos; não representa uma inscrição geral em apps.

Arquivar retira o cliente da seleção de novos lançamentos. O registro continua consultável e pode ser restaurado. Histórico, contratos e cobranças permanecem. Editar um lançamento histórico permite manter o cliente já vinculado, mesmo arquivado.

## Contrato para NOT e outros apps

1. Autenticar no mesmo projeto Supabase e obter o workspace autorizado de `finance_workspace_members`. Não importar/copiar os clientes do Financeiro.
2. Consultar `base_clients` com filtro de workspace; omitir arquivados da seleção de novos serviços. Os campos financeiros não fazem parte dessa resposta.
3. Criar ou editar com `save_base_client(p_workspace_id, p_client_id, p_payload, p_status, p_archived, p_expected_revision)`; novo cadastro usa UUID novo e revisão zero, edição usa a revisão lida. A RPC retorna a nova revisão.
4. A RPC aceita apenas campos cadastrais (`base_client_fields`). Valores desconhecidos não vão para a central. Duplicidade nova de documento é bloqueada no workspace, inclusive contra arquivados. Duplicidades antigas são preservadas para revisão humana.
5. Salvar serviços em tabelas do app com referência composta para a central. Arquivamento nunca deve disparar cancelamento nem apagar histórico do app.
6. Após criar, selecionar o UUID retornado/gerado na operação de origem. Se não houver clientes, exibir cadastro vazio normal. Se houver, apresentá-los diretamente.

O serviço JavaScript continua no Financeiro até existir um segundo consumidor real; o contrato compartilhado nesta fase está no banco. Não se extraiu um pacote prematuramente.

## Gravação e concorrência

`load_finance_snapshot` lê dados e revisões em um único snapshot. `save_finance_state` versão 2 recebe apenas clientes alterados, grava cadastro/perfil/estado financeiro na mesma transação e preserva clientes ausentes da requisição. Revisões financeiras e de cliente são independentes. Erro interrompe a fila e não provoca retry cego. A interface oferece baixar as alterações não confirmadas antes de recarregar. A recarga inicial não grava dados automaticamente.

Atualizações feitas em outra sessão ficam visíveis ao recarregar; sincronização em tempo real não foi adicionada. A gravação antiga de lançamentos e fornecedores permanece nesta etapa; a correção de apagar/reinserir foi aplicada aos clientes.

## Implantação segura

1. Salvar o código em branch e registrar o ponto anterior à mudança.
2. Executar `supabase/ops/backup-before-central.sql` somente para leitura e guardar o JSON em `.local-backups`, ignorada pelo Git. Esse backup cobre as seis tabelas e as funções, políticas, colunas, índices e restrições afetadas; não substitui backup integral de Auth/Storage.
3. Ensaiar restauração e migração: definir `BASE_MIGRATION_BACKUP` com o caminho do JSON e executar `pnpm test`. O ensaio usa PostgreSQL local via PGlite, sem chamar produção e sem imprimir dados pessoais.
4. Executar builds e testar a interface com `tests/central-preview-server.mjs` e um build dedicado apontando somente para `http://127.0.0.1:5186`. Nunca publicar esse build de testes.
5. Preparar o build real com as variáveis de produção. Guardar a publicação anterior e preparar a nova publicação antes de aplicar a migração.
6. Atualizar o backup imediatamente antes da mudança. Aplicar `supabase/migrations/202608300001_central_clientes.sql` inteiro: a transação falha e reverte por completo se houver erro, inclusive vínculo entre workspaces inválido.
7. Publicar/promover a interface e orientar recarga das sessões antigas. Na pequena janela entre migração e promoção, versões antigas não conseguem gravar; não tentar contornar o bloqueio.
8. Conferir contagens, payloads reconstruídos, IDs e vínculos com o backup, sem criar clientes de teste na produção. Verificar leituras da interface.

O marcador desta mudança fica em `base_schema_migrations`. A migração inicial não é falsamente marcada como aplicada via CLI; o painel padrão do Supabase pode continuar sem histórico de migrações de CLI.

## Recuperação

`supabase/ops/rollback-central-clients.sql` desfaz a estrutura da central preservando os cadastros e vínculos presentes no momento do rollback. Depois, restaurar as três funções do backup e retornar o frontend à publicação anterior. Fazer backup pós-migração antes de qualquer rollback. Não restaurar cegamente as linhas antigas sobre dados novos. O rollback exige manutenção e administrador, e não deve ser executado enquanto houver apps dependentes da central além do Financeiro.

Backups nesta etapa são locais e sob demanda. Rotina automática, cópia externa protegida e restauração integral de desastre continuam tarefas operacionais futuras.

## Estado da entrega em 30/08/2026

- Implementação concluída e validada localmente: 14 testes aprovados, incluindo restauração, migração e rollback sobre cópia real; builds do Financeiro e Manutenção aprovados.
- Backup final anterior à migração: `.local-backups/2026-08-30-central-clientes/before-resume.json`, capturado em 30/08/2026 às 22:04:04 UTC. Cópia posterior: `after.json`, na mesma pasta. Não versionar nem publicar esses arquivos.
- **Produção concluída.** Após autorização para retomar, foi aberta uma consulta vazia e conferido o conteúdo do editor por trechos: todos os 17.249 caracteres corresponderam ao arquivo validado. A transação foi aplicada às 22:05:44 UTC, conforme `base_schema_migrations`.
- Build promovido no Vercel: `dpl_6vKLVi3yDwcNkvf5qWeusnhuxqwC`, publicação `financeiro-orl1w25rk-studiotoss-3262s-projects.vercel.app`. O endereço principal é `https://financeiro-nine-sigma.vercel.app`, com asset `index-DRY3StTg.js` confirmado na página publicada.
- Comparação pós-migração preservou integralmente os registros de lançamentos, fornecedores, configurações, empresas e membros; os payloads dos clientes reconstruídos correspondem aos anteriores. Permanecem 6 clientes, 38 lançamentos, 8 fornecedores e 2 workspaces.
- Interface em produção conferida: dashboard carrega sem erro e a Central mostra os 4 clientes do workspace autenticado. Os 2 clientes do outro workspace permanecem separados. Nenhum cadastro de teste foi criado em produção.
- Para novas cópias lógicas, usar `supabase/ops/backup-after-central.sql`, que inclui as tabelas e funções da central. A publicação anterior para eventual recuperação é `financeiro-adxk7be3h-studiotoss-3262s-projects.vercel.app`; seguir o procedimento de rollback do banco antes de voltar ao frontend antigo.
