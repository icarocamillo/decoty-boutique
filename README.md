# 🛍️ Decoty Boutique - ERP & PDV Especializado em Moda

![Project Status](https://img.shields.io/badge/status-v1.3.2%20%7C%20Production%20Ready-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript%20%7C%20Supabase-blueviolet)

> **Um sistema de gestão de varejo ponta-a-ponta, focado na integridade financeira e na experiência do usuário.**

## 📖 Sobre o Projeto

O **Decoty Boutique** não é apenas um gerenciador de estoque. É um ERP (Enterprise Resource Planning) e PDV (Ponto de Venda) desenhado especificamente para as nuances do varejo de moda.

Diferente de sistemas genéricos, ele foi construído para resolver dores reais de boutiques, como o controle de peças em condicional (provador), gestão granular de crediário e cálculo real de lucro líquido (descontando taxas e custos automaticamente).

O projeto opera com uma arquitetura moderna, **Offline-First** (via LocalStorage como fallback) e sincronização robusta com **Supabase/PostgreSQL**.

---

## ✨ "Joias da Coroa" (Funcionalidades Principais)

### 👗 Controle de "Provador" (Fitting Room)
Uma das features mais estratégicas. O sistema permite que o cliente retire peças para provar em casa sem efetivar a venda, retirando-as do estoque físico temporariamente.
- **Histórico Cirúrgico:** Rastreabilidade completa de quem levou o quê.
- **Retorno Flexível:** Baixa parcial (compra) ou retorno total, mantendo a integridade do inventário.

### 💸 Motor Financeiro com Snapshots de Taxas
Para garantir uma contabilidade auditável, o sistema grava um "snapshot" (foto) das taxas bancárias e custos no **momento exato da transação**.
- *Exemplo:* Se a taxa do cartão mudar amanhã, o lucro das vendas de ontem permanece inalterado, preservando o histórico financeiro real.

### 📝 Gestão de Crediário e Amortização
Sistema completo de gestão de dívidas.
- Permite **pagamentos parciais (amortização)** de vendas específicas.
- Atualiza saldo devedor e fluxo de caixa simultaneamente.

### 📊 Relatório de Fluxo de Caixa (Regime de Caixa)
Dashboard gerencial que cruza CMV (Custo da Mercadoria Vendida), descontos reais, taxas bancárias e devoluções. Entregamos o **Lucro Líquido Real**, separando faturamento bruto de dinheiro disponível.

### ⚡ Vinculação Tardia de Cliente
Agilidade no balcão: Realize a venda rapidamente e vincule ao cadastro do cliente posteriormente, sem perder o rastro do histórico.

---

## 🛠️ Tech Stack

O projeto foi construído focando em performance, tipagem estática e segurança.

**Frontend:**
- **Core:** React 18 + TypeScript
- **Build Tool:** Vite
- **Estilização:** Tailwind CSS (com suporte nativo a Dark Mode e Layout Híbrido Desktop/Mobile)
- **Componentes Visuais:** Lucide React (Ícones), Recharts (Gráficos Financeiros)
- **Roteamento:** React Router DOM v6

**Backend & Infraestrutura:**
- **BaaS:** Supabase
- **Banco de Dados:** PostgreSQL (Garante integridade referencial e constraints rigorosas)
- **Autenticação:** Supabase Auth + Proteção interna via SHA-256 (Web Crypto API)

**Infraestrutura de Build:**
Módulo: ESModules (importação direta via ESM.sh)
Segurança: Criptografia SHA-256 via Web Crypto API para validação de acesso.

---

## 📸 Screenshots

*(Espaço reservado para adicionar imagens da interface - Dashboard, Tela de Vendas, Modo Escuro, etc)*
