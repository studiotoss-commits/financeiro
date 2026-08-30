# LAB: BASE Financeiro

## Documento 07: Plano de Implementação e Fases do Desenvolvimento

**Status:** Documento de planejamento de implementação  
**Projeto:** BASE Financeiro  
**Empresa:** TOSS  
**Versão:** 1.0  
**Data:** Julho de 2026

## 1. Objetivo

Definir a ordem recomendada para transformar o protótipo em aplicação operacional.

## 2. Princípio

Estrutura → Dados → Cadastros → Movimentações → Regras → Automações → Análises → Publicação.

## 3. Fases

### FASE 1
Preparação da base técnica

### FASE 2
Banco de dados e autenticação

### FASE 3
Cadastros estruturais

### FASE 4
Movimentações financeiras

### FASE 5
Regras financeiras e saldos

### FASE 6
Contratações e recorrências

### FASE 7
Dashboard e relatórios

### FASE 8
Testes, segurança e refinamento

### FASE 9
Publicação da primeira versão operacional

## 4. FASE 1: Preparação da base técnica

Objetivo: transformar o protótipo em aplicação React organizada.

Atividades:

- criar repositório GitHub;
- criar projeto React + Vite;
- migrar index.html, app.jsx, core.jsx, clientes.jsx, icons.jsx e system.css;
- organizar design system;
- criar rotas;
- publicar ambiente inicial na Vercel.

Critério de conclusão:

- projeto no GitHub;
- React + Vite;
- protótipo funcional;
- rotas funcionando;
- publicado na Vercel;
- sem Babel no navegador.

## 5. FASE 2: Banco e autenticação

Atividades:

- criar projeto Supabase;
- configurar variáveis de ambiente;
- implementar login, logout, sessão e proteção de rotas;
- criar tabelas;
- criar relacionamentos;
- configurar segurança.

## 6. FASE 3: Cadastros estruturais

Ordem:

Contas → Categorias → Clientes → Fornecedores.

Substituir dados simulados por persistência real.

## 7. FASE 4: Movimentações financeiras

Implementar Entradas e Saídas com cadastro, edição, visualização, status, vínculos, datas, formas de pagamento, observações, busca e filtros.

## 8. FASE 5: Regras financeiras e saldos

Centralizar cálculos, implementar saldo das contas, transferências, status atrasado e validar consistência.

## 9. FASE 6: Contratações e recorrências

Implementar contratações, programação financeira, recorrências, geração sem duplicidade e indicadores comerciais.

## 10. FASE 7: Dashboard e relatórios

Substituir indicadores simulados por dados reais, implementar navegação por período, relatórios e drill-down.

## 11. FASE 8: Testes, segurança e refinamento

Testar regras críticas, fluxos principais, segurança, responsividade, estados e usabilidade.

## 12. FASE 9: Publicação operacional

Preparar Vercel, Supabase, variáveis, domínio, SSL e backup.

Migrar dados reais e validar saldos iniciais.

## 13. Dependências

Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7.

Fases 8 e 9 consolidam.

## 14. Paralelismo

Podem avançar em paralelo:

- desenvolvimento;
- revisão da interface;
- preparação de dados reais;
- documentação.

## 15. Prioridade da V1

Controle financeiro confiável antes de quantidade de funcionalidades.

Núcleo mínimo:

- Login
- Contas
- Categorias
- Clientes
- Fornecedores
- Entradas
- Saídas
- Saldos
- Contas a receber
- Contas a pagar
- Dashboard

## 16. Entrega incremental

- V0.1 Protótipo migrado
- V0.2 Login e banco
- V0.3 Cadastros
- V0.4 Entradas e saídas
- V0.5 Saldos e transferências
- V0.6 Contratações e recorrências
- V0.7 Dashboard real
- V0.8 Relatórios
- V1.0 Primeira versão operacional

## 17. Uso do Codex

Trabalhar em tarefas delimitadas, com objetivo, arquivos, regras e critérios de conclusão.

## 18. Novas ideias

Classificar como:

- necessária para V1;
- evolução futura.

## 19. Registro de decisões

Mudanças importantes devem ser documentadas.

## 20. Critério para avanço

Verificar:

- funcionalidade principal funciona?
- dados persistem?
- regras estão corretas?
- há dependência pendente?
- próxima fase pode confiar na anterior?

## 21. Prioridade

1. Integridade dos dados
2. Regras financeiras
3. Funcionamento
4. Segurança
5. Usabilidade
6. Refinamento visual
7. Funcionalidades adicionais

## 22. Resultado esperado

Ao final: código organizado, versionamento, frontend publicado, banco, autenticação, cadastros, movimentações, saldos, contas a receber/pagar, contratações, recorrências, Dashboard real, relatórios, regras validadas e ambiente operacional.

## 23. Definição final

Construir a base primeiro. Validar o núcleo. Conectar os dados. Só depois ampliar.
