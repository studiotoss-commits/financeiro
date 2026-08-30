# LAB: BASE Financeiro

## Documento 01: Visão e Escopo do Sistema

**Status:** Documento inicial de referência  
**Projeto:** BASE Financeiro  
**Empresa:** TOSS  
**Versão:** 1.0  
**Data:** Julho de 2026

## 1. Contexto do projeto

O BASE Financeiro é uma aplicação web desenvolvida para centralizar e sistematizar a gestão financeira da TOSS.

O projeto nasce da necessidade de reduzir a dependência de softwares financeiros de terceiros e construir uma ferramenta alinhada à operação real da empresa, permitindo registrar, organizar e analisar informações financeiras em um ambiente próprio.

A primeira versão do BASE Financeiro parte de um protótipo funcional já desenvolvido em React, HTML, CSS e JavaScript. Esse protótipo estabelece a referência inicial de interface, experiência de uso, navegação e organização dos principais módulos do sistema.

O objetivo do projeto não é desenvolver inicialmente um sistema contábil, bancário ou ERP completo, mas uma ferramenta interna de gestão capaz de oferecer uma visão clara e confiável da realidade financeira da TOSS.

## 2. Objetivo do sistema

O BASE Financeiro tem como objetivo principal sistematizar as entradas e saídas financeiras da TOSS em uma aplicação própria, permitindo registrar, acompanhar e analisar a movimentação financeira da empresa sem depender integralmente de plataformas de terceiros.

O sistema deverá centralizar informações relacionadas a movimentações, clientes, fornecedores, contas, categorias e recorrências.

Além do controle financeiro básico, o BASE deverá transformar os dados registrados em informações úteis para a tomada de decisão.

## 3. Problemas que o sistema busca resolver

- dependência de softwares financeiros de terceiros;
- informações financeiras distribuídas entre diferentes plataformas;
- dificuldade de adaptar ferramentas prontas à realidade operacional da TOSS;
- falta de conexão entre movimentações financeiras e clientes;
- dificuldade para visualizar receitas recorrentes;
- dificuldade para analisar o valor financeiro gerado por cada cliente;
- necessidade de acompanhar contas a receber e contas a pagar;
- dificuldade para consolidar informações financeiras em uma visão executiva;
- dependência de controles manuais ou paralelos para análises específicas.

## 4. Usuários do sistema

Na primeira versão, o BASE Financeiro será uma ferramenta de uso interno da TOSS.

O usuário principal será o responsável pela administração e gestão financeira da empresa.

A arquitetura deverá permitir que, futuramente, sejam adicionados novos usuários e diferentes níveis de acesso.

## 5. Escopo inicial

A primeira versão operacional deverá permitir:

- cadastrar e gerenciar clientes;
- cadastrar e gerenciar fornecedores;
- registrar entradas financeiras;
- registrar saídas financeiras;
- organizar movimentações por categorias;
- vincular movimentações a clientes ou fornecedores;
- cadastrar contas financeiras;
- acompanhar valores previstos, recebidos e pagos;
- controlar movimentações recorrentes;
- navegar pelas informações por período;
- visualizar indicadores financeiros;
- gerar relatórios gerenciais;
- manter os dados armazenados de forma persistente;
- acessar o sistema de forma segura.

## 6. Módulos principais

### 6.1 Dashboard
Visão executiva com saldo total, saldo por conta, receitas, despesas, resultado financeiro, valores a receber, valores a pagar, próximos vencimentos, movimentações recentes e distribuição de despesas por categoria.

### 6.2 Entradas
Registro e acompanhamento das receitas da TOSS, relacionadas a clientes, projetos, contratos, serviços recorrentes e outras fontes de receita.

### 6.3 Saídas
Registro e acompanhamento das despesas da TOSS, relacionadas a fornecedores, infraestrutura, ferramentas, serviços terceirizados, impostos e operação.

### 6.4 Contas
Cadastro das contas financeiras utilizadas pela TOSS, como Banco do Brasil PJ, EFI e Caixa. Cada movimentação deverá estar vinculada a uma conta quando realizada.

### 6.5 Recorrências
Gestão de receitas e despesas recorrentes, com periodicidades mensal, trimestral, semestral e anual.

### 6.6 Relatórios
Análises de receitas, despesas, resultado, fluxo de caixa, categorias, clientes, fornecedores, contas a receber, contas a pagar e receitas recorrentes.

### 6.7 Clientes
Centralização de informações cadastrais, financeiras e comerciais, incluindo histórico de contratações, receitas recorrentes, LTV, ticket médio, valores em aberto, tempo de relacionamento e ranking.

### 6.8 Fornecedores
Centralização de empresas e profissionais relacionados às despesas da TOSS.

### 6.9 Categorias
Cadastro administrável de categorias de entrada e saída.

### 6.10 Configurações
Dados da TOSS, preferências, usuários, segurança e parâmetros gerais.

## 7. Fora do escopo inicial

A primeira versão não terá como objetivo substituir:

- sistemas contábeis;
- escritórios de contabilidade;
- sistemas bancários;
- plataformas oficiais de emissão fiscal;
- conciliação bancária automática;
- sistemas completos de ERP;
- gestão de estoque;
- folha de pagamento;
- gestão fiscal avançada.

## 8. Princípios do produto

- Simplicidade
- Clareza
- Adequação à operação da TOSS
- Dados conectados
- Inteligência sobre os dados
- Evolução progressiva
- Independência

## 9. Visão de evolução futura

O BASE poderá evoluir para múltiplos usuários, níveis de permissão, importação de dados, integração bancária, conciliação financeira, automações, notificações, previsões de fluxo de caixa, análises comparativas, inteligência artificial e integrações externas.

## 10. Protótipo atual como referência oficial

O protótipo atual será referência para identidade visual, design system, navegação, experiência de uso, organização dos módulos, componentes e comportamento responsivo.

A implementação técnica poderá alterar a estrutura interna, preservando sempre que possível a experiência e a linguagem visual.

## 11. Definição do produto

O BASE Financeiro é uma aplicação web interna de gestão financeira desenvolvida para organizar, conectar e interpretar os dados financeiros da TOSS.

Sua primeira missão é oferecer controle confiável sobre entradas, saídas, contas, clientes, fornecedores e recorrências.

Sua evolução deverá transformar esses dados em uma base de inteligência para apoiar decisões financeiras, comerciais e operacionais.
