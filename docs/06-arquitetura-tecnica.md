# LAB: BASE Financeiro

## Documento 06: Arquitetura Técnica e Stack da Aplicação

**Status:** Documento de arquitetura técnica  
**Projeto:** BASE Financeiro  
**Empresa:** TOSS  
**Versão:** 1.0  
**Data:** Julho de 2026

## 1. Objetivo

Definir a arquitetura técnica para transformar o protótipo em aplicação operacional.

## 2. Princípio arquitetural

Interface → Lógica da aplicação → Dados.

Arquitetura:

Usuário → Aplicação React → Camada de serviços → Supabase.

## 3. Stack oficial

### Frontend
- React
- JavaScript
- Vite
- CSS próprio

### Backend e banco
- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security

### Desenvolvimento
- Git
- GitHub
- Codex

### Hospedagem
- Vercel

## 4. Frontend

Migrar do modelo atual com React via CDN e Babel no navegador para um projeto estruturado.

Estrutura recomendada:

src/
- components/
- pages/
- features/
- services/
- hooks/
- utils/
- styles/
- lib/
- App.jsx
- main.jsx

## 5. Vite

Usado para desenvolvimento e build de produção.

Eliminar:

- React via CDN;
- Babel no navegador;
- JSX carregado diretamente pelo HTML.

## 6. Migração do protótipo

Preservar:

- identidade visual;
- design system;
- navegação;
- responsividade;
- Dashboard;
- clientes;
- gráficos;
- modais;
- estados vazios;
- feedbacks.

Mudança principal: dados estáticos e useState deixam de ser fonte permanente.

## 7. Backend

Supabase como infraestrutura inicial para banco, autenticação, API e segurança.

## 8. Banco de dados

PostgreSQL.

Tabelas principais:

- usuarios
- clientes
- fornecedores
- contas
- categorias
- contratacoes
- movimentacoes
- recorrencias
- transferencias

## 9. Identificadores

Recomendação: UUID.

## 10. Camada de acesso aos dados

Organizar serviços por domínio:

- clientes
- fornecedores
- movimentacoes
- contas
- categorias
- contratacoes
- recorrencias

Componentes visuais não devem concentrar consultas complexas.

## 11. Separação entre interface e regras

Regras financeiras devem ficar em funções/serviços de domínio.

Exemplos:

- calcularSaldoConta()
- calcularSaldoConsolidado()
- calcularResultadoPeriodo()
- calcularContasReceber()
- calcularContasPagar()
- calcularLTVCliente()
- calcularReceitaRecorrente()

## 12. Fonte única das regras

A mesma função deve alimentar Dashboard, Relatórios, Perfis e exportações.

## 13. Autenticação

Sem sessão → Login.  
Com sessão válida → Aplicação.

Inicialmente um administrador.

## 14. Segurança

A proteção deve existir também no banco, não apenas na interface.

## 15. Múltiplos usuários

Arquitetura deve permitir futura expansão de perfis.

## 16. Consultas

Começar simples e evoluir para views, funções ou consultas agregadas quando necessário.

## 17. Estado da aplicação

useState para estado temporário de interface.

Dados permanentes devem vir do banco.

## 18. Fluxo de persistência

Formulário → validação frontend → serviço → banco → resposta → atualização da interface → feedback.

## 19. Validação

Frontend: experiência e campos básicos.  
Banco: integridade e restrições.

## 20. Valores financeiros

Usar tipo numérico de precisão fixa, como NUMERIC ou DECIMAL.

## 21. Datas

Separar DATE, TIMESTAMP e competência.

## 22. Exclusão lógica

Preferir status para registros com histórico.

## 23. Auditoria básica

created_at e updated_at.

## 24. Recorrências

Recorrência = regra.  
Movimentação = registro financeiro.

Garantir ausência de duplicidade.

## 25. Prevenção de duplicidade

Combinação única entre recorrencia_id e ocorrência/competência.

## 26. Transferências

Entidade própria, não uma despesa + receita.

## 27. Dashboard

Camada de leitura e interpretação, sem valores manuais independentes.

## 28. Gráficos

SVG próprio pode continuar enquanto atender.

## 29. Design system

system.css continua como base inicial e pode evoluir para tokens, base, componentes, utilities e responsive.

## 30. Componentização

Criar componentes reutilizáveis como Button, Modal, Input, Select, Badge, Card, EmptyState, MoneyValue, DateField e ConfirmDialog.

## 31. Organização por funcionalidades

features/
- dashboard/
- transactions/
- clients/
- suppliers/
- accounts/
- categories/
- contracts/
- recurrences/
- reports/

## 32. Roteamento

Rotas reais:

- /dashboard
- /entradas
- /saidas
- /clientes
- /clientes/:id
- /fornecedores
- /contas
- /recorrencias
- /relatorios
- /configuracoes

## 33. Estados de carregamento

- Carregando
- Sucesso
- Sem dados
- Erro

## 34. Erros

Mensagens técnicas não devem ser expostas ao usuário final.

## 35. Variáveis de ambiente

Exemplos:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Nunca expor chaves administrativas no frontend.

## 36. Ambientes

- Desenvolvimento
- Produção
- Homologação futura

## 37. Controle de versão

Git + GitHub.

## 38. Codex

Usado para analisar codebase, migrar protótipo, implementar funcionalidades, corrigir bugs, refatorar, testar e revisar.

## 39. Documentação no repositório

docs/
- 01-visao-e-escopo.md
- 02-especificacao-funcional.md
- 03-modelagem-de-dados.md
- 04-regras-de-negocio.md
- 05-fluxos-de-uso.md
- 06-arquitetura-tecnica.md

## 40. Arquivo de instruções para agentes

Criar guia operacional próprio para agentes de IA.

## 41. Testes

Priorizar:

- saldo;
- resultado;
- contas a receber;
- contas a pagar;
- transferências;
- recorrências;
- LTV;
- parcelamento.

## 42. Backup

Deve existir estratégia de backup antes do uso operacional definitivo.

## 43. Exportação

Priorizar CSV e Excel futuramente.

## 44. Independência tecnológica

Buscar:

- controle do código;
- controle da estrutura dos dados;
- exportação;
- tecnologias amplamente adotadas;
- redução de lock-in desnecessário.

## 45. Arquitetura oficial

React + Vite + CSS próprio → Vercel → Supabase/PostgreSQL/Auth/RLS.

## 46. Fluxo técnico de uma operação

Usuário → ação → frontend valida → serviço envia → banco valida → atualiza → recalcula → interface confirma.

## 47. Não fazer na V1

- microserviços;
- múltiplos backends;
- servidores próprios;
- app nativo;
- múltiplos bancos;
- filas complexas;
- IA no núcleo;
- integração bancária automática;
- contabilidade automatizada.

## 48. Ordem técnica de implementação

1. React + Vite
2. Migrar protótipo
3. Componentes e rotas
4. Supabase
5. Autenticação
6. Tabelas e relacionamentos
7. Contas
8. Categorias
9. Clientes
10. Fornecedores
11. Entradas e Saídas
12. Cálculos
13. Contratações
14. Recorrências
15. Transferências
16. Dashboard real
17. Relatórios
18. Testes
19. Segurança
20. Publicação

## 49. Critérios de conclusão

A V1 técnica deve ter frontend estruturado, dados fora do código, autenticação, persistência, cadastros, movimentações, cálculos corretos, transferências, recorrências, Dashboard real, testes críticos, publicação e backup.

## 50. Definição final

Interface simples sobre uma estrutura de dados confiável, com regras financeiras centralizadas.
