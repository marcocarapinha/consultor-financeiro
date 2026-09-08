# InvestAssist — Assistente de Carteira de Investimentos

Aplicação web de gestão de carteira de investimentos com assistente de IA.

## Funcionalidades

- 📊 Dashboard com visão geral da carteira
- 📈 Cotações em tempo real (Yahoo Finance)
- 🤖 Chatbot de IA para análise de investimentos
- 💡 Sugestões de investimento baseadas no perfil de risco
- 📁 Importação de carteira via CSV/XLSX
- 👤 Multi-utilizador com contas separadas
- 🎯 Questionário de perfil de risco (Conservador/Moderado/Agressivo)

## Tech Stack

- Next.js (App Router)
- PostgreSQL (Prisma ORM)
- Yahoo Finance API
- Abacus.AI LLM API
- Tailwind CSS + shadcn/ui
- Recharts

## Configuração

1. Clone o repositório
2. Copie `.env.example` para `.env` e preencha as variáveis
3. Instale as dependências: `yarn install`
4. Configure a base de dados: `yarn prisma db push`
5. Inicie o servidor: `yarn dev`

## Aviso Legal

> Isto não constitui aconselhamento financeiro. Consulte um consultor financeiro certificado antes de investir.
