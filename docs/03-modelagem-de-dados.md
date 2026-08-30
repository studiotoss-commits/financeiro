# LAB: BASE Financeiro

## Documento 03: Modelagem de Dados e Relacionamentos

**Status:** Documento de arquitetura de dados  
**Projeto:** BASE Financeiro  
**Empresa:** TOSS  
**Versão:** 1.0  
**Data:** Julho de 2026

## 1. Objetivo

Definir a estrutura lógica dos dados e os relacionamentos entre as principais entidades.

## 2. Princípios

- evitar duplicação desnecessária;
- preservar histórico;
- separar comercial de financeiro;
- permitir relacionamentos opcionais;
- permitir evolução;
- manter datas de criação e atualização;
- usar identificadores únicos.

## 3. Entidades principais

- Usuários
- Clientes
- Fornecedores
- Contas Financeiras
- Categorias
- Contratações
- Movimentações Financeiras
- Recorrências
- Transferências

## 4. Usuários

Campos:

- id
- nome
- email
- auth_id
- perfil
- status
- created_at
- updated_at

Perfil inicial: administrador.

## 5. Clientes

Campos:

- id
- nome_empresa
- nome_fantasia
- tipo_documento
- documento
- segmento
- endereco
- telefone
- responsavel_nome
- responsavel_email
- financeiro_nome
- financeiro_email
- data_inicio_relacionamento
- status
- observacoes
- created_at
- updated_at

Relacionamentos:

1 cliente → N contratações  
1 cliente → N movimentações  
1 cliente → N recorrências

## 6. Fornecedores

Campos:

- id
- nome
- tipo_documento
- documento
- segmento
- responsavel_nome
- email
- telefone
- endereco
- status
- observacoes
- created_at
- updated_at

Relacionamentos:

1 fornecedor → N saídas  
1 fornecedor → N recorrências

## 7. Contas Financeiras

Campos:

- id
- nome
- instituicao
- tipo
- saldo_inicial
- data_saldo_inicial
- status
- observacoes
- created_at
- updated_at

Saldo atual = Saldo inicial + Entradas recebidas − Saídas pagas + Transferências recebidas − Transferências enviadas.

## 8. Categorias

Campos:

- id
- nome
- tipo
- descricao
- cor
- status
- created_at
- updated_at

Tipos: entrada, saída.

Categorias históricas devem ser desativadas.

## 9. Contratações

Campos:

- id
- cliente_id
- nome
- tipo
- modalidade
- valor_contratado
- periodicidade
- data_inicio
- data_fim
- status
- observacoes
- created_at
- updated_at

Tipo: serviço, produto, outro.  
Modalidade: pontual, recorrente.  
Periodicidade: mensal, trimestral, semestral, anual.  
Status: ativo, pausado, concluído, cancelado.

## 10. Movimentações Financeiras

Campos:

- id
- tipo
- descricao
- valor
- categoria_id
- cliente_id
- fornecedor_id
- contratacao_id
- recorrencia_id
- conta_id
- competencia
- data_vencimento
- data_realizacao
- status
- forma_pagamento
- observacoes
- created_at
- updated_at

Tipos: entrada, saída.

Status de entrada: previsto, recebido, atrasado, cancelado.  
Status de saída: previsto, pago, atrasado, cancelado.

## 11. Datas

- competencia
- data_vencimento
- data_realizacao

## 12. Conta e movimentação

Movimentação prevista pode não ter conta.

Movimentação recebida ou paga deve ter conta associada.

## 13. Recorrências

Campos:

- id
- tipo
- descricao
- cliente_id
- fornecedor_id
- contratacao_id
- categoria_id
- conta_padrao_id
- valor
- periodicidade
- data_inicio
- data_fim
- dia_vencimento
- status
- observacoes
- created_at
- updated_at

Status: ativa, pausada, encerrada.

Recorrência funciona como modelo e gera movimentações independentes.

## 14. Transferências

Campos:

- id
- conta_origem_id
- conta_destino_id
- valor
- data_transferencia
- descricao
- observacoes
- created_at
- updated_at

Transferências alteram saldos, mas não geram receita ou despesa.

## 15. Formas de pagamento

- pix
- boleto
- transferencia
- cartao
- debito_automatico
- dinheiro
- outro

## 16. Relação contratação e movimentação

1 contratação → N movimentações.

Isso permite comparar valor contratado, valor previsto, valor recebido e saldo restante.

## 17. LTV

Separar:

- Valor Comercial Acumulado, baseado nas contratações.
- LTV Financeiro Realizado, baseado nas entradas recebidas.

## 18. Receita recorrente mensal equivalente

Mensal = valor  
Trimestral = valor ÷ 3  
Semestral = valor ÷ 6  
Anual = valor ÷ 12

## 19. Exclusão e desativação

Registros com histórico devem ser desativados, não excluídos de forma destrutiva.

## 20. Auditoria básica

Todas as principais entidades devem possuir created_at e updated_at.

## 21. Integridade

- referências devem apontar para registros válidos;
- movimentação realizada exige conta;
- categoria e conta históricas não devem ser destruídas;
- transferência exige contas diferentes;
- valores devem ser maiores que zero.

## 22. Estrutura resumida das tabelas

### usuarios
id, nome, email, auth_id, perfil, status, created_at, updated_at

### clientes
id, nome_empresa, nome_fantasia, tipo_documento, documento, segmento, endereco, telefone, responsavel_nome, responsavel_email, financeiro_nome, financeiro_email, data_inicio_relacionamento, status, observacoes, created_at, updated_at

### fornecedores
id, nome, tipo_documento, documento, segmento, responsavel_nome, email, telefone, endereco, status, observacoes, created_at, updated_at

### contas
id, nome, instituicao, tipo, saldo_inicial, data_saldo_inicial, status, observacoes, created_at, updated_at

### categorias
id, nome, tipo, descricao, cor, status, created_at, updated_at

### contratacoes
id, cliente_id, nome, tipo, modalidade, valor_contratado, periodicidade, data_inicio, data_fim, status, observacoes, created_at, updated_at

### movimentacoes
id, tipo, descricao, valor, categoria_id, cliente_id, fornecedor_id, contratacao_id, recorrencia_id, conta_id, competencia, data_vencimento, data_realizacao, status, forma_pagamento, observacoes, created_at, updated_at

### recorrencias
id, tipo, descricao, cliente_id, fornecedor_id, contratacao_id, categoria_id, conta_padrao_id, valor, periodicidade, data_inicio, data_fim, dia_vencimento, status, observacoes, created_at, updated_at

### transferencias
id, conta_origem_id, conta_destino_id, valor, data_transferencia, descricao, observacoes, created_at, updated_at

## 23. Decisões técnicas ainda abertas

- tecnologia final do banco;
- autenticação;
- backend;
- hospedagem;
- backup;
- formato de identificadores;
- políticas de segurança.

## 24. Critério de validação

A modelagem deve representar corretamente:

1. entrada simples;
2. saída simples;
3. conta;
4. cliente;
5. fornecedor;
6. contratação parcelada;
7. receita recorrente;
8. despesa recorrente;
9. transferência;
10. saldo por conta;
11. resultado financeiro;
12. histórico de clientes e fornecedores.
