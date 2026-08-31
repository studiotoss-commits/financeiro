# Arquivamento por app e exclusão central

## Regra solicitada

Cada app arquiva somente o vínculo operacional do cliente e seus próprios registros. O cadastro central, os dados dos outros apps e os históricos são preservados. Restaurar recupera o estado anterior, sem presumir pagamento, renovação ou envio.

Somente a Central de Clientes dentro do Financeiro oferece exclusão definitiva do cadastro e dos registros associados em todos os apps conectados. A API exige proprietário do workspace com acesso ao Financeiro. Membros e usuários com acesso apenas ao NOT não podem usar essa operação.

## Implementação

- Tabela base_client_app_state armazena arquivo por workspace, cliente e app, com revisão. As situações originais dos serviços não são alteradas. Tabela base_client_actions registra auditoria mínima (IDs, ação, autor, data e contagens, sem nome, contatos ou cópia do conteúdo excluído).
- NOT: botão de arquivar/restaurar no cliente, filtro de arquivados e serviços arquivados disponíveis para leitura. Sem lembretes, edição de serviço ou renovação enquanto o vínculo estiver arquivado.
- Financeiro: arquivo retira lançamentos e derivados das telas operacionais, indicadores e ranking. O snapshot mantém todos os registros; o banco protege registros arquivados contra omissão/alteração pelo autosave, inclusive timestamps. A central continua listando todos os cadastros e indica arquivo por app.
- A exclusão apresenta as contagens de lançamentos, perfil/contratos financeiros, serviços e históricos NOT. Exige digitar o nome exato. Um token de conferência muda quando os dados relacionados mudam; nesse caso, uma nova confirmação é necessária.
- A exclusão é transacional. Dependências entre clientes/empresas são bloqueadas; fornecedores, outros clientes e documentos externos não são excluídos. Auditoria de exclusão impede recriar o mesmo UUID a partir de uma aba antiga.
- Funções anteriores usadas internamente não são executáveis por authenticated/anon. Arquivamento e exclusão invalidam revisões para bloquear gravações antigas.
- Save Financeiro passa ao contrato version 3. Abas antigas precisam recarregar e recebem erro seguro antes de salvar; alterações não confirmadas continuam disponíveis para download pela interface existente.
- Apps conectados nesta entrega: Financeiro e NOT. Manutenção de Sites ainda é protótipo em memória, sem conexão à central. Antes de conectar um novo app, estender o estado de arquivo, a conferência de impacto, a exclusão e os testes de vínculos daquele app. Não copiar/excluir cadastros por nome.

## Banco e operação

Migração: supabase/migrations/202608300004_client_lifecycle.sql. Nenhum dado de cliente é arquivado ou excluído ao aplicar a migração; ela instala as regras para ações futuras do usuário.

Backups antes da migração podem usar supabase/ops/backup-after-not.sql. Depois dela, usar supabase/ops/backup-after-client-lifecycle.sql, que inclui estado de arquivo, auditoria e definições internas. Backups e ensaio com dados reais ficam em .local-backups/2026-08-30-client-lifecycle/, fora do Git e do bundle.

Testes automatizados cobrem isolamento por app/empresa, restauração, proteção de registros arquivados, rejeição de sessões antigas, permissões, confirmação exata/atual, exclusão de dependentes legítimos e bloqueio de dependentes de outro cliente/empresa. Ensaio em cópia real verificou preservação integral na migração, arquivo/restauração, autosave e exclusão, sem operações destrutivas na produção.

Interface testada com dados fictícios em localhost: arquivar/restaurar NOT e Financeiro, filtro de arquivados, ausência de lembretes, independência entre apps e prévia de exclusão. O botão definitivo ficou desativado até o nome correto ser digitado. Nenhuma exclusão foi executada pela UI de produção.

## Estado da publicação em 30/08/2026

Build pronto: Financeiro index-S5Xl5vrg.js / index-Bh_XEbO0.css; NOT index-DUFMOhsv.js / index-CXkHuc7s.css.

Publicação dpl_E2XPn1CAzUCtoEs99o32E8Y4Txgd, financeiro-h4sqcrvme-studiotoss-3262s-projects.vercel.app, promovida ao endereço principal https://financeiro-nine-sigma.vercel.app após autorização explícita do usuário. Financeiro e NOT servem os assets conferidos acima.

A primeira tentativa foi bloqueada pela proteção do navegador. Após o usuário autorizar explicitamente com “aplique”, o backup foi atualizado e o SQL conferido integralmente (19.075 caracteres). A migração foi aplicada pelo editor do Supabase TOSS BASE, com sucesso registrado em 2026-08-31T02:59:09.547603Z, sem contornar o bloqueio.

A comparação integral antes/depois confirmou preservação das 11 tabelas de dados existentes: 54 clientes centrais (52 na empresa principal), 100 serviços e 100 eventos NOT, 38 lançamentos financeiros, 8 perfis financeiros e demais dados sem alteração. As novas tabelas de arquivo e auditoria ficaram vazias. Apenas o marcador da migração foi acrescentado. Evidências privadas em before-approved.json, after-approved.json e verification-production.json na pasta de backup indicada acima.

Verificação autenticada no endereço principal: Financeiro carregou como Salvo, central mostrou os 52 cadastros, aviso de arquivamento explicou o isolamento por app e prévia de exclusão retornou contagens dos registros vinculados. Botão definitivo permaneceu bloqueado sem o nome exato. NOT carregou os clientes e exibiu aviso de preservação dos históricos, da central e dos outros apps. As duas janelas foram canceladas; nenhum arquivamento, restauração ou exclusão real foi executado para testar a publicação. Envios continuam desativados. Abas antigas devem ser recarregadas antes de novas alterações.
