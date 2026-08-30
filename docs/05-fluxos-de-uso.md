# LAB: BASE Financeiro

## Documento 05: Fluxos de Uso e Jornadas do Sistema

**Status:** Documento de experiência funcional  
**Projeto:** BASE Financeiro  
**Empresa:** TOSS  
**Versão:** 1.0  
**Data:** Julho de 2026

## 1. Objetivo

Definir os principais fluxos de uso do BASE Financeiro.

## 2. Princípio geral

Cadastrar → Relacionar → Movimentar → Acompanhar → Analisar.

O sistema deve evitar cadastros desnecessários e permitir criação contextual de registros relacionados.

## 3. Jornada inicial

Acessar → Cadastrar contas → Definir saldos iniciais → Revisar categorias → Cadastrar clientes e fornecedores → Registrar movimentações → Cadastrar recorrências → Usar Dashboard.

## 4. Acesso

Acessar → autenticar → validar → entrar no Dashboard.

Tratar credenciais inválidas, usuário inativo, erro de conexão e sessão expirada.

## 5. Dashboard

Visualizar saldo, receitas, despesas, contas a receber e pagar, próximos vencimentos, atividades e categorias.

Indicadores devem permitir navegação para o contexto correspondente.

## 6. Cadastro de cliente

Clientes → Novo cliente → Preencher → Salvar.

Nome é o único campo inicialmente obrigatório.

## 7. Cliente durante outra operação

Nova entrada → Cliente não encontrado → Criar cliente → Salvar → Retornar à entrada com cliente selecionado.

## 8. Cadastro de fornecedor

Fornecedores → Novo fornecedor → Preencher → Salvar.

Também deve poder acontecer durante uma saída.

## 9. Cadastro de conta

Contas → Nova conta → Nome → Instituição → Tipo → Saldo inicial → Data → Salvar.

## 10. Cadastro de categoria

Categorias → Nova categoria → Nome → Tipo → Identificação visual → Salvar.

Categorias de entrada não aparecem em saídas e vice-versa.

## 11. Entrada simples

Entradas → Nova entrada → Descrição → Cliente → Categoria → Valor → Competência → Vencimento → Status Previsto → Salvar.

Resultado: entra em Contas a Receber e não altera saldo.

## 12. Recebimento

Abrir entrada → Marcar como recebida → Data → Conta de destino → Forma de recebimento → Confirmar.

Resultado: sai de Contas a Receber, aumenta saldo e atualiza indicadores.

## 13. Entrada já recebida

Cadastrar diretamente com status Recebido, data e conta.

## 14. Saída simples

Saídas → Nova saída → Descrição → Fornecedor → Categoria → Valor → Competência → Vencimento → Previsto → Salvar.

Resultado: entra em Contas a Pagar e não altera saldo.

## 15. Pagamento

Abrir saída → Marcar como paga → Data → Conta de origem → Forma de pagamento → Confirmar.

## 16. Vencimento automático

Movimentação prevista + vencimento ultrapassado = atrasada.

## 17. Cancelamento

Abrir movimentação → Cancelar → Confirmar → Status Cancelado.

Preserva histórico e sai dos cálculos ativos.

## 18. Exclusão

Ação secundária, com verificação de relacionamentos e confirmação.

## 19. Contratação

Clientes → Abrir cliente → Nova contratação → Serviço/produto → Valor → Modalidade → Datas → Salvar.

Não cria movimentação automaticamente.

## 20. Contratação parcelada

Contratação → Criar programação financeira → definir parcelas → gerar entradas vinculadas.

## 21. Acompanhamento da contratação

Mostrar:

- Valor contratado
- Valor lançado
- Valor recebido
- Valor a receber
- Valor ainda não programado

## 22. Receita recorrente

Recorrências → Nova recorrência → Entrada → Cliente → Descrição → Valor → Periodicidade → Vencimento → Início → Conta padrão → Salvar.

## 23. Despesa recorrente

Recorrências → Nova recorrência → Saída → Fornecedor → Descrição → Valor → Periodicidade → Próximo vencimento → Salvar.

## 24. Geração de recorrências

Recorrência ativa → identificar próxima ocorrência → criar movimentação prevista independente.

## 25. Edição de recorrência

Distinguir:

- Esta ocorrência
- Esta e as próximas

## 26. Pausa

Abrir recorrência → Pausar. Novas ocorrências deixam de ser geradas.

## 27. Encerramento

Abrir recorrência → Encerrar → Definir data → Confirmar.

## 28. Transferência

Contas → Nova transferência → Origem → Destino → Valor → Data → Confirmar.

## 29. Consulta de cliente

Clientes → selecionar → abrir perfil.

Mostrar dados, tempo de relacionamento, valor comercial, LTV, receita recorrente, ticket médio, valores em aberto, contratações e movimentações.

## 30. Consulta de fornecedor

Fornecedores → selecionar → abrir perfil.

Mostrar dados, total pago, valores em aberto, despesas recorrentes e histórico.

## 31. Pesquisa

Busca por termos relevantes, inicialmente no contexto do módulo.

## 32. Filtros

Período, status, cliente/fornecedor, categoria e conta.

## 33. Relatórios

Relatórios → Período → Tipo → Filtros → Resultado.

Permitir aprofundar nos registros que formam os valores.

## 34. Contas a receber

Dashboard → Contas a Receber → lista de pendentes → ações rápidas.

## 35. Contas a pagar

Dashboard → Contas a Pagar → lista de pendentes → ações rápidas.

## 36. Fechamento mensal

Selecionar mês → revisar entradas → revisar saídas → verificar pendências → analisar resultado → consultar relatório.

## 37. Correção de erro

Abrir movimentação → editar → salvar → recalcular indicadores.

## 38. Estados vazios

Mostrar orientação e CTA contextual, nunca tela vazia sem explicação.

## 39. Feedback

Toda ação relevante deve gerar feedback visual.

## 40. Confirmações obrigatórias

Cancelar, excluir, encerrar recorrência e ações irreversíveis.

## 41. Navegação entre registros

Relacionamentos devem ser clicáveis.

## 42. Jornada principal financeira

Cliente solicita projeto → cadastrar/localizar cliente → registrar contratação → criar programação → gerar entradas previstas → receber → marcar como recebida → atualizar saldo, LTV, Dashboard e relatórios.

## 43. Jornada principal de despesa

Surge obrigação → selecionar/cadastrar fornecedor → criar saída prevista → aparecer em Contas a Pagar → pagar → marcar como paga → atualizar saldo e relatórios.

## 44. Jornada recorrente

Cliente contrata serviço recorrente → contratação → recorrência → movimentações previstas → acompanhamento → recebimentos → atualizar receita recorrente e LTV.

## 45. Redução de duplicidade

Dados já cadastrados devem ser selecionados, não digitados novamente.

## 46. Contexto

Ações dentro do perfil devem preencher automaticamente cliente ou fornecedor.

## 47. Atalhos

Priorizar:

- Novo lançamento
- Nova entrada
- Nova saída
- Marcar como recebido
- Marcar como pago

## 48. Responsividade

Fluxos principais devem funcionar em desktop, tablet e mobile.

## 49. Critérios de validação

O usuário deve conseguir:

1. cadastrar conta;
2. cadastrar cliente;
3. cadastrar fornecedor;
4. registrar entrada prevista;
5. registrar recebimento;
6. registrar saída prevista;
7. registrar pagamento;
8. criar contratação;
9. parcelar contratação;
10. criar receita recorrente;
11. criar despesa recorrente;
12. transferir valores;
13. consultar cliente;
14. consultar contas a receber;
15. consultar contas a pagar;
16. entender o Dashboard;
17. acessar registros de origem dos indicadores.

## 50. Definição final

O usuário registra a realidade → o sistema conecta os dados → calcula indicadores → o usuário entende a situação da TOSS → toma decisões.
