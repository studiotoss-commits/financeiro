# LAB: BASE Financeiro

## Documento 04: Regras de Negócio e Cálculos Financeiros

**Status:** Documento de regras de negócio  
**Projeto:** BASE Financeiro  
**Empresa:** TOSS  
**Versão:** 1.0  
**Data:** Julho de 2026

## 1. Objetivo

Definir as regras de negócio e os critérios de cálculo usados pelo BASE Financeiro.

## 2. Princípio central

Separar:

- Comercial: o que foi contratado;
- Financeiro previsto: o que deverá ser pago ou recebido;
- Financeiro realizado: o que efetivamente entrou ou saiu.

## 3. Regime principal

O BASE utilizará prioritariamente o regime de caixa para representar a situação financeira realizada.

## 4. Entradas

### Prevista
- compõe contas a receber;
- compõe projeções;
- não aumenta saldo;
- não compõe receita realizada.

### Recebida
- aumenta saldo da conta;
- compõe receita realizada;
- deixa contas a receber.

### Atrasada
- permanece em contas a receber;
- não aumenta saldo;
- não compõe receita realizada.

### Cancelada
- permanece no histórico;
- não afeta saldo;
- não compõe contas a receber nem receita realizada.

## 5. Saídas

### Prevista
- compõe contas a pagar;
- compõe projeções;
- não reduz saldo;
- não compõe despesa realizada.

### Paga
- reduz saldo;
- compõe despesa realizada;
- deixa contas a pagar.

### Atrasada
- permanece em contas a pagar;
- não reduz saldo enquanto não paga.

### Cancelada
- permanece no histórico;
- não afeta saldo nem despesas.

## 6. Status atrasado

Se status = previsto e vencimento < data atual, então atraso.

## 7. Saldo das contas

Saldo atual = Saldo inicial + Entradas recebidas − Saídas pagas + Transferências recebidas − Transferências enviadas.

## 8. Saldo consolidado

Soma dos saldos das contas ativas.

## 9. Transferências

Alteram saldos entre contas, mas não geram receita, despesa ou resultado.

## 10. Receita realizada

Soma das entradas com status recebido, pelo período da data_realizacao.

## 11. Despesa realizada

Soma das saídas com status pago, pelo período da data_realizacao.

## 12. Resultado financeiro

Receitas realizadas − Despesas realizadas.

## 13. Contas a receber

Entradas previstas + entradas atrasadas.

## 14. Contas a pagar

Saídas previstas + saídas atrasadas.

## 15. Fluxo de caixa previsto

Saldo atual + Entradas previstas − Saídas previstas = Saldo projetado.

## 16. Competência e realização

Visão de caixa usa data_realizacao.  
Visão de competência usa competencia.

Dashboard principal: caixa realizado.

## 17. Valor contratado

Soma do valor_contratado das contratações válidas.

## 18. Valor previsto da contratação

Soma das movimentações de entrada não canceladas vinculadas à contratação.

## 19. Saldo restante da contratação

Valor contratado − Valor recebido.

Também poderá existir: Valor contratado − Valor lançado = Valor ainda não programado.

## 20. Receita total por cliente

Separar:

- Receita Financeira Realizada;
- Valor Comercial Contratado.

## 21. LTV

LTV Financeiro Realizado = soma de toda receita efetivamente recebida do cliente.

## 22. Ticket médio

Ticket médio por contratação = valor total das contratações ÷ quantidade de contratações.

## 23. Receita recorrente mensal equivalente

Mensal = valor  
Trimestral = valor ÷ 3  
Semestral = valor ÷ 6  
Anual = valor ÷ 12

Usar apenas recorrências ativas.

## 24. Receita recorrente da TOSS

Soma da equivalência mensal de todas as recorrências de entrada ativas.

## 25. Despesa recorrente mensal equivalente

Soma da equivalência mensal de todas as recorrências de saída ativas.

## 26. Resultado recorrente estimado

Receita recorrente mensal equivalente − Despesa recorrente mensal equivalente.

## 27. Ranking de clientes

Ranking principal por LTV Financeiro Realizado.

## 28. Gastos por categoria

Saídas pagas da categoria ÷ total geral de despesas pagas × 100.

## 29. Receitas por categoria

Entradas recebidas da categoria ÷ total geral de receitas recebidas × 100.

## 30. Período do Dashboard

Mês + ano.

Ao alterar o período, recalcular receitas, despesas, resultado, gráficos e atividades.

## 31. Próximos vencimentos

Considerar previstas e atrasadas, priorizando:

1. atrasadas;
2. vencimentos de hoje;
3. próximos vencimentos.

## 32. Atividades recentes

Ordenadas pela ocorrência mais recente.

## 33. Recorrências

Recorrência não altera saldo diretamente. Gera movimentação prevista.

## 34. Alteração de recorrência

Distinguir:

- Esta ocorrência;
- Esta e as próximas.

Movimentações realizadas não devem ser alteradas automaticamente.

## 35. Cancelamento

Cancelar não significa excluir. O registro permanece, mas sai dos cálculos ativos.

## 36. Exclusão

Usar apenas para registros criados incorretamente e sem necessidade histórica.

## 37. Valores monetários

- maiores que zero;
- precisão de centavos;
- armazenados com tipo adequado;
- exibidos em BRL.

## 38. Datas

Exibição brasileira. Competência no formato mês/ano.

## 39. Indicadores prioritários

- Saldo consolidado atual
- Receitas realizadas
- Despesas realizadas
- Resultado
- Total a receber
- Total a pagar
- Receita recorrente mensal equivalente
- Despesa recorrente mensal equivalente

## 40. Hierarquia de confiança

Movimentações → Cálculos → Indicadores → Dashboard → Relatórios.

## 41. Consistência

O mesmo dado deve produzir o mesmo resultado em qualquer módulo.

## 42. Histórico

Inativação de clientes, fornecedores, categorias e contas não deve comprometer dados históricos.

## 43. Fórmulas principais

### Saldo da conta
Saldo inicial + Entradas recebidas − Saídas pagas + Transferências recebidas − Transferências enviadas

### Saldo consolidado
Soma dos saldos das contas

### Resultado realizado
Receitas recebidas − Despesas pagas

### Contas a receber
Entradas previstas + Entradas atrasadas

### Contas a pagar
Saídas previstas + Saídas atrasadas

### Saldo projetado
Saldo atual + Entradas futuras − Saídas futuras

### LTV
Soma das entradas recebidas do cliente

### Ticket médio
Valor total contratado ÷ quantidade de contratações

### Receita recorrente mensal equivalente
Soma das recorrências de entrada normalizadas para mês

### Despesa recorrente mensal equivalente
Soma das recorrências de saída normalizadas para mês

## 44. Critério de validação

As regras devem representar corretamente:

1. receita prevista e recebida;
2. despesa prevista e paga;
3. atraso automático;
4. cancelamento;
5. transferência;
6. projeto parcelado;
7. receita recorrente;
8. despesa recorrente;
9. saldo por conta;
10. saldo consolidado;
11. resultado mensal;
12. contas a receber e pagar;
13. LTV;
14. receita recorrente equivalente;
15. preservação histórica.

## 45. Definição final

O BASE deve distinguir:

- O que foi contratado
- O que está previsto
- O que foi realizado
- Onde o dinheiro está
