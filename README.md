# 🛍️ Decoty Boutique - ERP & PDV Especializado em Moda

![Project Status](https://img.shields.io/badge/status-v1.3.2%20%7C%20Production%20Ready-success)
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

### 👤 Vinculação Tardia de Cliente
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
- **Módulo:** ESModules (importação direta via ESM.sh)
- **Segurança:** Criptografia SHA-256 via Web Crypto API para validação de acesso.

---

## 📸 Screenshots

**Tela de login:**
- **Descrição:** Usuário do sistema efetua login ou faz um novo cadastro (sistema verifica se está conectado em produção).
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/1f91cafc-0366-4009-9346-72aa7ae709cc" />
<br> </br>

**Tela de cadastro:**
- **Descrição:** Processo de cadastro do usuário no sistema (usuário será informado diretamente pelo gerente sobre qual é a palavra-chave para concluir o cadastro).
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/df6bef84-3cda-4316-baec-c6d16e073b21" />
<br> </br>

**Tela Home:**
- **Descrição:** Tela mostra indicadores de venda do dia e da semana e as vendas mais recentes.
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/a225fa97-af29-4a4b-bdd9-2e16492c13cb" />
<br> </br>

**Tela de Detalhes da Venda:**
- **Descrição:** Exibe todos os dados da venda, itens, tipo de pagamento, status de pagamento Taxas de maquininha, entre outros dados (tambem é possivel vincular o cliente posteriormente a venda).
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/62fef0ea-6b44-4afe-a7da-5f4ede720420" />
<br> </br>

**Tela de Movimentação de Estoque:**
- **Descrição:** Tela mostra todas as movimentações de ENTRADA e SAÍDA das quantidades de estoque de cada item.
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/b2c6bd49-5eff-4b63-bbf0-e0eef10764d6" />
<br> </br>

**Tela de Listagem de clientes:**
- **Descrição:** Lista todos os clientes cadastrados no sistema, e mostra alguns dados pertinentes para controle (vale presente e se há pendendencias de crediário/carnê).
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/f0cd4636-fe9a-43c5-9426-70f61ed9cc3e" />
<br> </br>

**Tela de Detalhes do cliente:**
- **Descrição:** Nessa tela o usuário pode detalhes do cliente, alterar dados do cliente caso necessário e consultar as peças que estão com o cliente por motivos de provador, realizar o pagamento das vendas de crediário desse cliente, entre outros.
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/10cc1ec8-c083-495a-9b76-210a3dd236f1" />
<br> </br>

**Fluxo de crediário:**
- **Descrição:** Usuário do sistema consulta quais são as vendas tipo crediário do cliente para que possa efetuar o pagamento.
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/2adcc430-b2b0-4edf-a9b3-22a035c77737" />
<br> </br>

- **Descrição:** Sistema mostra o "histórico de pagamento" da venda de creiário para que o usuário não perca o controle sobre o saldo vigente.
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/abe913ea-5cb1-437a-aa64-f25572a14ad8" />
<br> </br>

**Tela de relatório gerencial:**
- **Descrição:** Dados detalhados de toda a operação, vendas bruto, CMV, lucro líquido, futuras entradas de crédito, devoluções, taxas, entre outros.
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/ee081499-af08-454a-b053-4be30971d777" />

---

### 🔆/🌛 Modo Claro ou Escuro

- **Descrição:** O sistema tem suporte a modo claro e escuro para facilitar a visualização em ambientes iluminados ou melhorar a experiencia de uso em ambientes mais escuros.
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/7e78119c-64ee-41d1-841a-e764164ce536" />
<br> </br>
<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/da7a396e-4d2f-4cf7-8d84-6739b83919eb" />

### 📱/💻 Responsividade

- **Descrição:** O sistema é responsivo e se adpta a diferentes tamanho de tabela: PC / Tablet / Celular.

<p align="center">
  <img width="369" height="800" alt="image" src="https://github.com/user-attachments/assets/20e89d78-1dea-4401-af17-50e563e77413" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://github.com/user-attachments/assets/01f00c45-b79b-4497-972c-33d6c12db243" alt="Demo do projeto" width="369">
</p>


