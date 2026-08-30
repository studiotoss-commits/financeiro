# LAB: BASE Financeiro

## Documento 09: Guia de Execução para o Codex

**Status:** Documento operacional de desenvolvimento  
**Projeto:** BASE Financeiro  
**Empresa:** TOSS  
**Versão:** 1.0  
**Data:** Julho de 2026

## 1. Objetivo

Definir como o Codex deverá atuar no desenvolvimento do BASE Financeiro.

O Codex deve implementar sobre uma especificação existente e não redefinir autonomamente o produto.

## 2. Fonte oficial

Consultar em conjunto:

- Documento 01: Visão e Escopo
- Documento 02: Especificação Funcional
- Documento 03: Modelagem de Dados
- Documento 04: Regras de Negócio
- Documento 05: Fluxos de Uso
- Documento 06: Arquitetura Técnica
- Documento 07: Plano de Implementação
- Documento 08: Critérios de Teste
- Documento 09: Guia de Execução

## 3. Hierarquia de referência

Visão e Escopo → Especificação Funcional → Modelagem → Regras → Fluxos → Arquitetura → Plano → Testes.

Conflitos reais devem ser sinalizados antes de alterações estruturais.

## 4. Stack oficial

### Frontend
- React
- Vite
- JavaScript
- CSS próprio

### Hospedagem
- Vercel

### Backend e dados
- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security

### Desenvolvimento
- Git
- GitHub
- Codex

## 5. Ponto de partida

O protótipo é referência para identidade visual, design system, componentes, navegação, responsividade, telas e experiência.

## 6. Limitações do protótipo

- React via navegador;
- Babel no navegador;
- dados simulados;
- useState como armazenamento temporário;
- sem banco;
- sem autenticação;
- sem persistência real.

## 7. Princípio de execução

Trabalhar de forma incremental e em tarefas delimitadas.

Não executar “todo o sistema” de uma vez.

## 8. Antes de cada tarefa

1. identificar a fase atual;
2. identificar documentos relevantes;
3. analisar arquivos envolvidos;
4. identificar dependências;
5. verificar alterações estruturais;
6. apresentar plano curto.

## 9. Durante a implementação

- preservar funcionalidades existentes;
- reutilizar componentes;
- evitar duplicação;
- centralizar regras financeiras;
- respeitar relacionamentos;
- tratar erros;
- preservar responsividade;
- manter código compreensível;
- limitar alterações ao escopo.

## 10. Após a implementação

Informar:

- o que foi implementado;
- arquivos alterados;
- regras aplicadas;
- validações executadas;
- limitações ou pendências.

Executar build, testes e verificações aplicáveis.

## 11. Preservação do design

Não trocar cores, tipografia, componentes ou biblioteca visual sem solicitação.

## 12. Preservação da experiência

Migração técnica deve preservar estados vazios, feedbacks, responsividade, navegação e modais.

## 13. Fonte única de verdade

Regras financeiras centralizadas e reutilizadas.

## 14. Regras financeiras obrigatórias

- entrada prevista não altera saldo;
- entrada recebida aumenta saldo;
- saída prevista não altera saldo;
- saída paga reduz saldo;
- transferência não é receita nem despesa;
- cancelado permanece no histórico e sai dos cálculos;
- atrasado permanece em contas a receber/pagar.

## 15. Separação comercial e financeiro

Contratação = relação comercial.  
Movimentação = evento financeiro.

## 16. Regra de saldo

Saldo inicial + Entradas recebidas − Saídas pagas + Transferências recebidas − Transferências enviadas.

## 17. LTV

Soma das entradas efetivamente recebidas do cliente.

## 18. Recorrências

Recorrência não movimenta dinheiro diretamente. Gera movimentação prevista.

Impedir duplicidade.

## 19. Histórico

Preferir inativar, cancelar e encerrar em vez de excluir registros com histórico.

## 20. Integridade

Impedir:

- valores <= 0;
- movimentação realizada sem conta;
- categoria incompatível;
- transferência para mesma conta;
- referência inexistente;
- duplicidade de recorrência;
- exclusão destrutiva com histórico.

## 21. Organização da aplicação

src/
- components/
- features/
- pages/
- services/
- hooks/
- utils/
- lib/
- styles/
- App.jsx
- main.jsx

Evitar fragmentação excessiva.

## 22. Organização por domínio

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

## 23. Camada de serviços

services/
- clients.js
- suppliers.js
- accounts.js
- categories.js
- transactions.js
- contracts.js
- recurrences.js
- transfers.js

## 24. Camada de domínio

Centralizar cálculos críticos.

## 25. Banco de dados

Seguir o Documento 03.

## 26. Migrações

Mudanças estruturais devem ser rastreáveis e preferencialmente versionadas.

## 27. Segurança

- autenticação;
- rotas protegidas;
- RLS;
- variáveis de ambiente;
- sem chaves privilegiadas no frontend;
- validação também na camada de dados.

## 28. Ambientes

Separar desenvolvimento e produção.

## 29. Vercel

Fluxo: Código → GitHub → Vercel → Deploy.

## 30. Supabase

Usar para PostgreSQL, autenticação, API e segurança.

## 31. Git e GitHub

Versionar código e manter mudanças compreensíveis.

## 32. Ordem oficial

Seguir o Documento 07.

## 33. Novas ideias

Classificar como:

- necessária para a versão atual;
- evolução futura.

## 34. Dúvidas

Ambiguidades relevantes devem ser sinalizadas.

Decisões técnicas pequenas podem seguir a solução mais simples e consistente.

## 35. Dependências

Não adicionar bibliotecas sem necessidade real.

## 36. Testes

Seguir o Documento 08.

Prioridade máxima para saldo, receitas, despesas, resultado, contas a receber/pagar, transferências, recorrências, LTV e parcelamento.

## 37. Build e validação

Antes de concluir:

- executar build;
- verificar erros;
- executar testes relevantes;
- validar fluxo;
- revisar alterações.

## 38. Tratamento de erros

Mensagens compreensíveis ao usuário. Detalhes técnicos ficam no diagnóstico.

## 39. Responsividade

Toda alteração visual relevante deve considerar desktop, tablet e mobile.

## 40. Performance

Evitar consultas repetidas, carregamento excessivo, cálculos duplicados, renderizações desnecessárias e dependências pesadas sem justificativa.

## 41. Comentários no código

Comentar decisões relevantes, não o óbvio.

## 42. Documentação de decisões

Registrar o que mudou, por que mudou, documento afetado e impacto.

## 43. Formato recomendado de tarefa

TAREFA  
Implementar módulo específico.

CONTEXTO  
Consultar os documentos aplicáveis.

OBJETIVO  
Definir claramente o resultado esperado.

REQUISITOS  
Listar funcionalidades.

REGRAS  
Listar regras aplicáveis.

VALIDAÇÃO  
Executar build, testes e informar alterações.

## 44. Prompt inicial recomendado

Você está trabalhando no projeto BASE Financeiro da TOSS.

Antes de modificar qualquer arquivo, leia a documentação disponível na pasta `/docs`, composta pelos Documentos 01 a 09.

Analise também a codebase e o protótipo existente.

Não implemente todo o sistema de uma vez.

Siga a ordem definida no Documento 07.

Sua primeira tarefa é executar somente a Fase 1: Preparação da Base Técnica.

Preserve o design e o comportamento atual do protótipo sempre que possível.

Antes de implementar, apresente um plano curto da tarefa.

Após implementar:

1. execute as validações aplicáveis;
2. informe os arquivos alterados;
3. informe o que foi concluído;
4. informe qualquer pendência ou decisão que precise de validação.

Não altere regras de negócio, escopo ou stack sem sinalizar previamente.

## 45. Primeira tarefa oficial

Migrar o protótipo atual para uma aplicação React + Vite estruturada, preservando design, componentes, responsividade e comportamento existente.

Nesta etapa:

- NÃO implementar Supabase;
- NÃO implementar banco;
- NÃO implementar autenticação;
- NÃO alterar regras financeiras;
- NÃO redesenhar;
- NÃO implementar fases posteriores.

## 46. Critério de sucesso

O Codex deve respeitar documentação, trabalhar incrementalmente, preservar escopo, produzir código compreensível, não duplicar regras, validar alterações e sinalizar conflitos.

## 47. Definição final

A documentação define o produto.  
A codebase representa o estado atual.  
A tarefa define o escopo imediato.  
O Codex implementa e valida.
