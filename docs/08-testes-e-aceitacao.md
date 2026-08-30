# LAB: BASE Financeiro

## Documento 08: Critérios de Teste e Aceitação

**Status:** Documento de validação e qualidade  
**Projeto:** BASE Financeiro  
**Empresa:** TOSS  
**Versão:** 1.0  
**Data:** Julho de 2026

## 1. Objetivo

Definir critérios mínimos de teste e aceitação.

Uma funcionalidade só é pronta quando interface, funcionamento, dados e regras de negócio estão corretos.

## 2. Princípio de aceitação

Interface → Funcionamento → Dados → Regra de negócio.

## 3. Definição de concluído

- código implementado;
- fluxo principal funciona;
- dados persistem;
- validações funcionam;
- regras aplicáveis são respeitadas;
- carregamento e erros são tratados;
- sem regressão relevante;
- critérios específicos atendidos.

## 4. Tipos de teste

- regras de negócio;
- integração;
- fluxo;
- manuais.

Priorizar regras financeiras críticas.

## 5. Estados de interface

- Carregando
- Com dados
- Sem dados
- Erro

## 6. Autenticação

Validar:

- acesso sem sessão redireciona ao login;
- login válido;
- login inválido;
- logout encerra sessão.

## 7. Contas

Validar cadastro, edição, inativação, saldo inicial e persistência.

Exemplo:

Saldo inicial R$ 10.000 + entrada R$ 5.000 − saída R$ 2.000 = R$ 13.000.

## 8. Categorias

Validar criação, tipo, edição, inativação e compatibilidade com entrada/saída.

Histórico deve permanecer.

## 9. Clientes

Validar cadastro, edição, busca, inativação, perfil e persistência.

## 10. Fornecedores

Validar cadastro, edição, busca, inativação e histórico.

## 11. Entradas

Prevista:

- persiste;
- entra em contas a receber;
- não altera saldo;
- não vira receita realizada.

Recebida:

- exige data e conta;
- sai de contas a receber;
- aumenta saldo;
- entra em receita realizada.

## 12. Saídas

Prevista:

- persiste;
- entra em contas a pagar;
- não altera saldo;
- não vira despesa realizada.

Paga:

- exige data e conta;
- sai de contas a pagar;
- reduz saldo;
- entra em despesa realizada.

## 13. Atraso

Previsto + vencimento anterior à data atual = atrasado.

Não altera saldo e continua pendente.

## 14. Cancelamento

Preserva registro, não afeta saldo, projeções ou pendências.

## 15. Transferência

Conta A R$ 10.000, Conta B R$ 5.000, transferência R$ 2.000:

- Conta A: R$ 8.000
- Conta B: R$ 7.000
- Consolidado: R$ 15.000
- Resultado inalterado

## 16. Contratações

Validar criação, cliente, valor, modalidade, edição, status e relação com movimentações.

## 17. Contratação parcelada

R$ 12.000 em 3 parcelas de R$ 4.000 deve gerar 3 movimentações relacionadas.

## 18. Recorrências

Validar criação, periodicidade, geração, ausência de duplicidade, pausa, encerramento e preservação das ocorrências.

## 19. Recorrência mensal

Uma única movimentação por ocorrência.

## 20. Alteração de recorrência

Distinguir:

- esta ocorrência;
- esta e as próximas.

## 21. Saldo consolidado

Soma exata dos saldos das contas.

## 22. Receitas

Soma das entradas recebidas pela data de realização.

## 23. Despesas

Soma das saídas pagas pela data de realização.

## 24. Resultado

Receitas realizadas − Despesas realizadas.

## 25. Contas a receber

Previstas + atrasadas.

## 26. Contas a pagar

Previstas + atrasadas.

## 27. LTV

Soma das entradas efetivamente recebidas do cliente.

## 28. Ticket médio

Valor total das contratações ÷ quantidade de contratações.

## 29. Receita recorrente mensal equivalente

Normalização das recorrências ativas para valor mensal.

## 30. Dashboard

Aceito quando:

- usa dados reais;
- não depende de valores fixos;
- respeita período;
- é consistente com relatórios;
- atualiza após mudanças.

## 31. Navegação por período

Ao alterar mês, recalcular receitas, despesas, resultado, gráficos e atividades.

## 32. Relatórios

Devem usar dados reais, respeitar filtros, apresentar totais consistentes e permitir identificar registros de origem.

## 33. Busca e filtros

Filtros combinados devem respeitar todas as condições.

## 34. Persistência

Dados permanentes devem sobreviver a atualização, fechamento do navegador e novo acesso.

## 35. Integridade

Impedir:

- valor zero ou negativo;
- transferência para mesma conta;
- referências inexistentes;
- categoria incompatível;
- movimentação realizada sem conta;
- duplicidade de recorrência.

## 36. Mensagens de erro

Devem explicar o que aconteceu e o que fazer.

## 37. Responsividade

Testar desktop, tablet e mobile.

No mobile deve ser possível consultar Dashboard, cadastrar entrada/saída, registrar pagamento/recebimento, consultar clientes e vencimentos.

## 38. Segurança

Antes da operação:

- autenticação;
- rotas protegidas;
- credenciais privilegiadas fora do frontend;
- RLS;
- variáveis sensíveis fora do repositório;
- logout efetivo;
- dados bloqueados para não autenticados.

## 39. Regressão

Nova funcionalidade não deve quebrar fluxos existentes.

## 40. Dados de teste

Manter dados específicos de teste separados de produção.

## 41. Roteiro mínimo antes da produção

1. Login
2. Conta
3. Cliente
4. Fornecedor
5. Entrada prevista
6. Recebimento
7. Saída prevista
8. Pagamento
9. Transferência
10. Contratação
11. Recorrência
12. Conferência de saldos
13. Dashboard
14. Relatórios

## 42. Validação operacional

Comparar o BASE com controles anteriores nas primeiras semanas.

## 43. Classificação de problemas

- Crítico
- Alto
- Médio
- Baixo

Problemas críticos impedem liberação.

## 44. Aceite de fase

Critérios específicos atendidos, fluxos funcionando, sem problemas críticos e dependências estáveis.

## 45. Aceite da V1.0

A V1.0 será aprovada quando autenticação, persistência, cadastros, entradas, saídas, saldos, transferências, contas a receber/pagar, contratações, recorrências, Dashboard, relatórios, regras críticas, segurança e backup estiverem adequados.

## 46. Definição final

Funcionar visualmente não significa estar pronto.

Uma funcionalidade só está concluída quando a interface funciona, os dados persistem, as regras são respeitadas e os resultados são confiáveis.
