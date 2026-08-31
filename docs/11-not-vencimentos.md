# NOT: serviços e vencimentos

## Primeira versão

O NOT acompanha os vencimentos de domínios, hospedagem, e-mail, serviços TOSS e outros serviços. Usa a identidade visual do BASE e os clientes da central, sem importação entre apps. A planilha original foi consultada como referência (aba `controle serviços`, cabeçalho B5:U5 e `tabela_legenda`): cliente, contato, fornecedor, identificação, pagamento para, valor, recorrência, vencimento e avisos de 30/15 dias. Nesta entrega acrescentam-se prazo de 2 dias, links de pagamento/painel/documento e histórico de renovações.

A importação inicial foi realizada após o MVP, com autorização para revisar inconsistências posteriormente. O registro abaixo documenta os totais e critérios. Células e observações do arquivo são dados de referência, não instruções de execução.

## Uso

1. Abrir NOT no seletor do BASE ou em `/not/`, usando a mesma sessão do Financeiro.
2. No primeiro acesso, o proprietário ativa o NOT para sua empresa; nenhum cadastro é copiado. Usuário com acesso já habilitado entra diretamente. Membros sem permissão precisam de liberação administrativa. Usuários novos sem empresa podem criar uma empresa com acesso apenas ao NOT.
3. Cadastrar serviço escolhendo um cliente da central. O cadastro rápido de cliente grava na central e já o seleciona no formulário.
4. Informar vencimento, recorrência, fornecedor, beneficiário e valor previsto. Valor desconhecido fica vazio ("A confirmar"), não é convertido em zero. Valores informados em reais são armazenados em centavos.
5. Configurar até 6 lembretes únicos, de 1 a 90 dias antes; padrão 30, 15 e 2. O painel distingue vencidos, hoje/próximos 2 dias, próximos 30 dias e serviços ativos.
6. Conferir a mensagem com os dados do serviço e contato financeiro da central, ou contato específico do serviço. O documento de acessos fica fora da mensagem por padrão; inclusão exige marcar a opção da prévia. Guardar somente links HTTPS sem credenciais, nunca senhas.
7. Confirmar pagamento/renovação registra a data, valor pago informado e vencimentos anterior/próximo. A sugestão usa a recorrência a partir do vencimento atual, ajustando o último dia do mês. É necessário conferir a data. Serviço pontual sem próxima data fica concluído.

## O que não acontece automaticamente

- Nenhum e-mail ou WhatsApp é enviado. Não existem workers, agendadores, filas de envio, integrações externas ou status fictício de "enviado".
- Prévias são calculadas ao abrir o app. A agenda mostra datas de 30 dias atrás a 30 dias à frente; no detalhe é possível ver todos os prazos configurados. "Data já passou" não prova que houve aviso.
- Pagamentos continuam no fornecedor/TOSS. Confirmar no NOT não grava lançamentos financeiros nem confirma pagamento no Financeiro.
- Arquivar cliente na central não cancela nem pausa serviços existentes. Novos vínculos com clientes arquivados são bloqueados. Para interromper lembretes, pausar/cancelar o serviço explicitamente.
- Não há importação automática, sincronização em tempo real, gestão de permissões por interface nem anexos armazenados no NOT nesta entrega.

## Dados e segurança

- `not_services`: UUID, workspace/cliente, campos do serviço, vencimento atual, contatos específicos, links, prazos, modelo, observações, revisão e datas. FK composta impede vínculo entre empresas.
- `not_service_events`: histórico imutável pela API cliente, com autor/data e snapshot da edição ou confirmação do ciclo anterior.
- RLS permite leitura somente com participação no workspace **e** acesso `not` em `base_app_members`. Login ou acesso ao Financeiro não concede acesso automático ao NOT.
- `activate_not_workspace` ativa apenas o usuário proprietário chamador, preservando os demais acessos. Membro comum não pode se conceder acesso.
- Escritas exclusivamente por RPCs `save_not_service` e `renew_not_service`; revisões impedem sobrescrita e confirmação duplicada. O banco valida cliente, valores, datas e links. Exclusão direta e alteração do histórico são proibidas.
- Falhas preservam o formulário e permitem baixar rascunho. Não há retry automático nem salvamento do estado inteiro. Após conflito, baixar rascunho se necessário, fechar o formulário, atualizar dados e reabrir o registro.
- NOT não consulta contratos, lançamentos ou configurações do Financeiro. Cadastro de cliente usa `save_base_client` e conserva campos não editados.

## Arquitetura e implantação

App em `apps/notificacoes-vencimentos`, base Vite `/not/`. `@base/autenticacao` compartilha sessão/login; `@base/design-system` compartilha seletor e ícones. Financeiro preserva wrappers dos módulos extraídos. A origem única evita passagem de tokens em URLs e outro login ao alternar apps.

`pnpm build` compila Financeiro e NOT; `scripts/assemble-platform.mjs` copia o build do NOT para `apps/financeiro/dist/not`. O Vercel mantém a saída existente, com rewrite específico de `/not/:path*` antes do fallback do Financeiro. Builds de teste usam pastas ignoradas e variáveis apontadas apenas a localhost.

Migração: `supabase/migrations/202608300002_not_mvp.sql`. É aditiva e transacional; não altera clientes nem lançamentos existentes e não ativa usuários em lote. Fazer backup antes, testar migração com `BASE_NOT_BACKUP`, preparar publicação, aplicar SQL completo verificado, promover e verificar Financeiro/NOT. Em rollback da interface, manter tabelas e histórico do NOT; não apagar dados nem desfazer a central. A reversão da central deixa de ser apropriada depois de haver serviços vinculados.

Testes: `pnpm test`. Para ensaio com dados reais, `BASE_NOT_BACKUP` aponta ao JSON do backup da central; para ensaio anterior, `BASE_MIGRATION_BACKUP` aponta ao backup anterior à central. Dados reais não entram no Git nem no bundle. `tests/not-preview-server.mjs` é somente local, com banco descartável e dados fictícios.

Backup permanece local e manual; rotina automática externa é uma tarefa futura.

## Registro da implantação — 30/08/2026

- Migração aplicada às 23:18:10 UTC após conferência dos 11.323 caracteres do arquivo no editor. A tabela `base_schema_migrations` registra `202608300002_not_mvp`.
- Backups antes/depois em `.local-backups/2026-08-30-not/`; comparar registros demonstrou preservação integral de clientes, perfis financeiros, lançamentos, fornecedores, configurações, empresas e membros.
- Publicação final: `dpl_8KhpwAPEN2ZQbbJJD3JhUrQ2ZDc9`, `financeiro-j305ssw7f-studiotoss-3262s-projects.vercel.app`; URL de uso: `https://financeiro-nine-sigma.vercel.app/not/`. Build NOT `index-CDkx4bOh.js`, Financeiro `index-BgqyvcSy.js`.
- 24 testes aprovados com o backup atualizado. No navegador local foram verificados ativação, criação de cliente compartilhado, cadastro do serviço, prévia, renovação e layout a 390px sem rolagem lateral. Os dados de teste permaneceram somente no banco local descartável.
- A primeira leitura de empresas em produção falhou; a nova tentativa carregou normalmente. O diagnóstico de erros da API foi acrescentado e a verificação posterior cobriu ativação, leitura dos 4 clientes da empresa autenticada e alternância Financeiro → NOT → Financeiro mantendo sessão. Nenhum serviço foi cadastrado em produção.
- NOT ativado apenas para o usuário proprietário autenticado. Outros usuários/empresas mantêm as permissões anteriores. Envios externos seguem desativados.
- Para backups seguintes, usar `supabase/ops/backup-after-not.sql`, incluindo as tabelas e funções do NOT. O ponto anterior ao NOT para eventual reversão da interface é `financeiro-orl1w25rk-studiotoss-3262s-projects.vercel.app`.


## Importação inicial e revisão — 30/08/2026

- 101 linhas de origem resultaram em 100 serviços. Uma repetição de domínio com mesmo cliente, fornecedor, valor e data foi consolidada, preservando a referência às duas linhas.
- 50 clientes representados: 48 novos na central e 2 vínculos com clientes já existentes. Nenhum contato ou cadastro anterior foi sobrescrito. Outras empresas permaneceram isoladas.
- Situações: 76 ativos, 21 pausados e 3 cancelados. Ausências de data (10 registros) e recorrência (11) preservadas como null; 20 valores ausentes não foram convertidos em zero. Contagens de pendências se sobrepõem.
- Datas antigas e distantes foram mantidas. Nenhum pagamento/renovação foi presumido. Nenhum lançamento financeiro foi criado. Duplicidades com fornecedores/valores divergentes ficaram pausadas.
- 95 serviços com pendências, inclusive contatos ausentes ou múltiplos. Usar **Revisar importação** ou o filtro em Serviços. Após conferir os dados, remover `[REVISAR]` das observações. Serviços sem data/recorrência continuam pendentes e só podem sair de Pausado quando os campos forem preenchidos.
- Migração aditiva `202608300003_not_incomplete_services.sql`: permite data/recorrência vazias exclusivamente para serviços pausados. Permissões, RLS e RPCs de escrita permanecem inalteradas.
- Backups, fonte extraída, manifesto por linha, SQL e verificações em `.local-backups/2026-08-30-not-import/`, fora do Git/bundle. SQL em transação com identidade do proprietário conferida e gravações pelas RPCs existentes. IDs determinísticos tornam a repetição idempotente, sem sobrescrever revisões posteriores.
- Ensaio com backup real verificou todos os campos, repetição sem duplicar, 100 eventos de criação e preservação dos clientes originais/tabelas financeiras. A conferência de produção repetiu a comparação campo a campo.
- 24 testes passaram; 2 testes opcionais de migrações históricas ignorados. Ensaio desta importação passou separadamente. Build concluído. Interface de produção conferida: resumo, filtro de revisão, detalhe e formulário pausado com campos vazios e contato herdado da central.
- Publicação: `dpl_ANoZB85ppYWiEDeu1nkW3iAt4A3G`, `financeiro-mrgn5tled-studiotoss-3262s-projects.vercel.app`. Build NOT `index-D2WoaMcS.js`. E-mail/WhatsApp permanecem desativados.
- Não reverter a migração de campos opcionais enquanto existirem serviços incompletos. Preservar dados e histórico em reversões da interface.
