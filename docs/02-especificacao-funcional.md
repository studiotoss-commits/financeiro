# LAB: BASE Financeiro

## Documento 02: Especificação Funcional do Sistema

**Status:** Documento de especificação funcional  
**Projeto:** BASE Financeiro  
**Empresa:** TOSS  
**Versão:** 1.0  
**Data:** Julho de 2026

## 1. Objetivo deste documento

Define o funcionamento esperado do BASE Financeiro, detalhando os principais módulos, informações armazenadas e relações funcionais.

## 2. Estrutura geral do sistema

### Dashboard
Visão executiva e consolidada.

### Financeiro
- Entradas
- Saídas
- Contas
- Recorrências
- Relatórios

### Cadastros
- Clientes
- Fornecedores
- Categorias

### Sistema
- Configurações

## 3. Conceito central de movimentação financeira

Toda entrada ou saída será considerada uma movimentação financeira.

Campos mínimos:

- tipo;
- descrição;
- valor;
- categoria;
- data de competência;
- data de vencimento;
- data de pagamento ou recebimento;
- status;
- conta financeira;
- cliente ou fornecedor relacionado, quando aplicável;
- observações.

### Tipos
- Entrada
- Saída
- Transferência

Transferência não será considerada receita nem despesa.

## 4. Status das movimentações

- Previsto
- Pago
- Recebido
- Atrasado
- Cancelado

O atraso deverá ser identificado automaticamente quando possível.

## 5. Datas financeiras

- Data de competência
- Data de vencimento
- Data de pagamento ou recebimento

## 6. Dashboard

Deverá apresentar:

- saldo total disponível;
- receitas do período;
- despesas do período;
- resultado do período;
- valores a receber;
- valores a pagar;
- próximos vencimentos;
- atividades recentes;
- gastos por categoria.

O saldo total deverá resultar da soma dos saldos das contas.

## 7. Entradas

Campos:

- descrição;
- cliente;
- categoria;
- valor;
- competência;
- vencimento;
- data de recebimento;
- conta de destino;
- status;
- forma de recebimento;
- recorrência;
- observações.

Ações:

- cadastrar;
- visualizar;
- editar;
- marcar como recebida;
- cancelar;
- pesquisar;
- filtrar.

## 8. Saídas

Campos:

- descrição;
- fornecedor;
- categoria;
- valor;
- competência;
- vencimento;
- data de pagamento;
- conta de origem;
- status;
- forma de pagamento;
- recorrência;
- observações.

Ações:

- cadastrar;
- visualizar;
- editar;
- marcar como paga;
- cancelar;
- pesquisar;
- filtrar.

## 9. Contas

Campos:

- nome;
- instituição;
- tipo;
- saldo inicial;
- data do saldo inicial;
- status;
- observações.

Tipos iniciais:

- conta corrente;
- conta de pagamento;
- caixa;
- outra.

Saldo:

Saldo inicial + Entradas recebidas − Saídas pagas + Transferências recebidas − Transferências enviadas.

## 10. Recorrências

Tipos:

- receita recorrente;
- despesa recorrente.

Periodicidades:

- mensal;
- trimestral;
- semestral;
- anual.

Campos:

- descrição;
- tipo;
- cliente ou fornecedor;
- categoria;
- valor;
- periodicidade;
- data de início;
- data de término;
- dia de vencimento;
- conta padrão;
- status.

Status:

- ativa;
- pausada;
- encerrada.

A recorrência serve como modelo e gera movimentações independentes.

## 11. Clientes

Campos:

- nome da empresa;
- nome fantasia;
- CPF ou CNPJ;
- segmento;
- endereço;
- responsável principal;
- e-mail do responsável;
- responsável financeiro;
- e-mail financeiro;
- telefone;
- data de início do relacionamento;
- status;
- observações.

Status:

- prospect;
- ativo;
- recorrente;
- inativo.

Indicadores:

- receita total gerada;
- LTV;
- receita recorrente mensal equivalente;
- ticket médio;
- tempo de relacionamento;
- quantidade de contratações.

Contratação representa a relação comercial. Movimentação representa o evento financeiro.

## 12. Fornecedores

Campos:

- nome;
- CPF ou CNPJ;
- categoria ou segmento;
- responsável;
- e-mail;
- telefone;
- endereço;
- status;
- observações.

## 13. Categorias

Tipos:

- entrada;
- saída.

Campos:

- nome;
- tipo;
- descrição;
- status;
- identificação visual.

Categorias com histórico devem ser desativadas, não excluídas.

## 14. Relatórios

Filtros:

- período;
- conta;
- cliente;
- fornecedor;
- categoria;
- status.

Relatórios iniciais:

- receitas por período;
- despesas por período;
- resultado financeiro;
- fluxo de caixa;
- gastos por categoria;
- receitas por cliente;
- despesas por fornecedor;
- contas a receber;
- contas a pagar;
- receitas recorrentes.

## 15. Busca e filtros

Busca por movimentações, clientes e fornecedores, com filtros específicos em cada módulo.

## 16. Persistência

Todos os dados operacionais deverão ser persistidos.

## 17. Autenticação e acesso

Acesso protegido, inicialmente com um usuário administrador.

## 18. Regras gerais de integridade

- valores maiores que zero;
- cancelados não afetam resultados;
- transferências não são receita nem despesa;
- movimentações realizadas exigem conta;
- histórico deve ser preservado.

## 19. Relação entre módulos

Cliente → Contratação → Recorrência, quando aplicável → Entrada → Conta

Fornecedor → Recorrência, quando aplicável → Saída → Conta

Categorias organizam movimentações.

Dashboard e Relatórios interpretam os dados.

## 20. Separação entre comercial e financeiro

Contratação = relação comercial.

Movimentação = evento financeiro.

Exemplo: um projeto de R$ 12.000 pode gerar três entradas de R$ 4.000.

## 21. Referência do protótipo

O protótipo já representa Dashboard, Entradas, Saídas, Relatórios, Clientes, Fornecedores, navegação mensal, busca, modais, histórico de contratações, LTV, receita recorrente, ticket médio, ranking e responsividade.

## 22. Critério para a primeira versão operacional

A V1 será operacional quando permitir:

1. acesso seguro;
2. persistência real;
3. cadastro de contas;
4. cadastro de clientes;
5. cadastro de fornecedores;
6. cadastro de categorias;
7. registro de entradas;
8. registro de saídas;
9. controle de pagamentos e recebimentos;
10. recorrências;
11. cálculo de saldos;
12. Dashboard real;
13. relatórios básicos.
