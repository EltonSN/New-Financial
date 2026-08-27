# CoreFin

Sistema de Controle Financeiro Pessoal — monorepo com API em Express/MySQL e uma SPA em React para acompanhar receitas, despesas, cartões de crédito, investimentos, despesas fixas/recorrentes, gastos da casa e empréstimos a receber.

## Funcionalidades

| Página | O que faz |
|--------|-----------|
| **Dashboard** | Saldo acumulado, totais do mês, séries diária/mensal de receita × despesa, gastos por categoria, últimas transações, fatura por cartão e a **Previsão de Saldo** (mês atual e próximo, com detalhamento de receitas recorrentes, despesas fixas e faturas pendentes) |
| **Transações** | CRUD de entradas e saídas com paginação condensada |
| **Cartões** | Faturas por cartão, limites e vencimentos |
| **Casa** | Compras e serviços feitos para a casa (reforma, melhorias, decoração, manutenção…), parcelados ou à vista — cadastro rápido em linha, cards agrupados por categoria, totalizador do mês e resumo "Simplificado" em pop-up |
| **Empréstimos** | Valores que outras pessoas devem a você, agrupados por devedor, com dívidas fixas (recorrentes) ou parceladas e extrato "Simplificado" por devedor |
| **Configurações** | CRUD em abas de cartões, categorias, despesas fixas, receitas recorrentes e investimentos |

Casa e Empréstimos usam o mesmo **modelo de corrente de parcelas**: cada parcela é uma linha própria e, ao marcar a parcela do mês como paga, a API já cria automaticamente a parcela seguinte com o vencimento avançado um mês (ajustando para o último dia do mês quando necessário — 31/01 → 28/02). A contagem de parcelas restantes fica **azul quando faltam 2** e **verde quando falta 1**, sinalizando a reta final.

## Stack

| Camada     | Tecnologia                                                        |
|------------|--------------------------------------------------------------------|
| API        | Node.js + Express, `mysql2/promise` (SQL puro, sem ORM)             |
| Frontend   | React 19 (Create React App), sem router — troca de página via state |
| Banco      | MySQL 8                                                            |
| Deploy     | Vercel (função serverless para a API, build estático para o front) |

## Estrutura do repositório

```
CoreFin/
├── api/                    # API Express
│   ├── config/database.js  # pool de conexão mysql2 (lido de api/.env)
│   ├── routes/              # um router por recurso, SQL inline
│   └── server.js            # bootstrap do Express, exportado para a Vercel
├── frontend/                # SPA Create React App
│   └── src/
│       ├── components/      # Sidebar, Pagination, e kit ui/ (Button, Card, Input, Select, Table)
│       ├── constants/theme.js  # design tokens (cores, glass, sombras, breakpoints)
│       ├── pages/            # DashboardPage, TransactionsPage, CardsPage, HousePage, LoansPage, SettingsPage
│       └── services/ApiService.js  # único ponto de comunicação com a API
├── structure/                # dumps de estrutura do banco (SQL)
│   └── migrations/           # scripts de criação/alteração aplicados após o último dump
├── vercel.json               # roteamento de deploy
└── package.json               # scripts de orquestração do monorepo (root)
```

## Pré-requisitos

- Node.js 18+
- Uma instância MySQL acessível com o schema descrito em `structure/` já aplicado

## Configuração

1. Instale as dependências de ambos os pacotes a partir da raiz:
   ```bash
   npm run install:all
   ```
2. Crie `api/.env` (gitignored) com as variáveis exigidas por `api/config/database.js`:
   ```
   DB_HOST=
   DB_USER=
   DB_PASSWORD=
   DB_NAME=
   DB_PORT=
   NODE_ENV=development
   PORT=3001
   ```
   Não há runner de migração — o schema é assumido como já existente no banco de destino. O arquivo `structure/structure-<data>.sql` é um dump só de estrutura (`mysqldump --no-data`) e é a **fonte única** do schema atual: toda alteração é aplicada à mão no MySQL e depois refletida num dump novo, que substitui o anterior.

   ```bash
   # aplicar uma alteração de schema
   mysql -h <host> -u <user> -p <database> < alteracao.sql

   # regerar o dump depois de aplicar
   mysqldump -h <host> -u <user> -p --no-data <database> > structure/structure-$(date +%d.%m.%Y).sql
   ```

## Rodando localmente

```bash
npm run dev              # API (porta 3001) + frontend (porta 3002) em paralelo
npm run dev:api           # apenas a API, com nodemon
npm run dev:frontend      # apenas o frontend, react-scripts start
```

A API fica disponível em `http://localhost:3001/api`; o frontend consome esse endereço em desenvolvimento (`ApiService.js`) e faz proxy configurado em `frontend/package.json`.

## Build de produção

```bash
npm run build:frontend
```

Gera o build estático do CRA em `frontend/build`. Em produção (Vercel), a API é servida como função serverless (`api/server.js` não chama `.listen()` quando `NODE_ENV === 'production'`) e o build do frontend é servido como estático.

## Testes

O frontend usa Jest + React Testing Library (padrão do CRA):

```bash
cd frontend && npm test                          # modo watch
cd frontend && npm test -- --watchAll=false       # execução única (CI)
cd frontend && npm test -- App.test.js            # arquivo específico
```

Não há suíte de testes para a API nem lint configurado além do `eslintConfig` padrão do CRA (`react-app`, `react-app/jest`).

## API — recursos disponíveis

Todas as rotas são montadas sob `/api/<recurso>` em `api/server.js`, cada uma em `api/routes/<recurso>.js` com SQL inline (sem camada de service/model):

| Rota                    | Arquivo                        | Tabela no banco   |
|-------------------------|----------------------------------|--------------------|
| `/api/transactions`     | `routes/transactions.js`        | `transactions`     |
| `/api/cards`            | `routes/cards.js`               | `cards`            |
| `/api/loans`            | `routes/loans.js`               | `loan`             |
| `/api/house-expenses`   | `routes/houseExpenses.js`       | `house_expense`    |
| `/api/credits`          | `routes/credits.js`             | `credit`           |
| `/api/categories`       | `routes/categories.js`          | `categories`       |
| `/api/fixed-expenses`   | `routes/fixedExpenses.js`       | `fixed_expense`    |
| `/api/recurring-income` | `routes/recurringIncome.js`     | `recurring_income` |
| `/api/investments`      | `routes/investments.js`         | `investment`       |
| `/api/dashboard`        | `routes/dashboard.js`           | agregações (`Promise.all` sobre várias tabelas) |
| `/api/health`           | inline em `server.js`           | —                  |

Além do CRUD padrão, `/api/loans` e `/api/house-expenses` expõem `POST /:id/pagar` (quita a parcela do mês e projeta a seguinte); `/api/house-expenses` também tem `POST /:id/reabrir` para desfazer o pagamento.

> Atenção: nomes de rota nem sempre coincidem com o nome da tabela (ex.: `fixed-expenses` → `fixed_expense`, `credits` → `credit`, `investments` → `investment`, `loans` → `loan`, `house-expenses` → `house_expense`, no singular). Colunas financeiras usam SCREAMING_SNAKE_CASE (`DATA`, `TIPO`, `VALOR`, `DESCRICAO`), enquanto metadados de cartão/categoria usam `snake_case` (`nome`, `limite_total`, `vencimento_dia`, `categoria_id`).

## Convenções do projeto

- Termos de domínio em português (nomes de variáveis, colunas de banco, textos de UI) — mantenha esse padrão ao adicionar código novo.
- Sem camadas de service/model na API — rotas conversam direto com `db.query()`.
- Sem React Router no frontend — novas páginas são adicionadas como um novo `case` em `App.js` (`renderPage()`) e uma entrada em `Sidebar`.
- Toda chamada à API do frontend passa por `ApiService.js` — não use `fetch` direto em componentes.
- Estilos são objetos inline construídos a partir dos tokens em `constants/theme.js` — não há Tailwind nem CSS-in-JS.

Para os padrões de código a seguir ao mexer neste repositório, veja [`CLAUDE.md`](./CLAUDE.md).

### O histórico e o backlog ficam fora do repositório

O **histórico do que já foi construído**, as **decisões e seus porquês**, os **aprendizados** e o **roadmap de melhorias** vivem num vault Obsidian, em `Projetos/CoreFin - Pessoal/` — não neste repositório:

```bash
~/.claude/skills/cerebro/scripts/cerebro.sh ctx "CoreFin - Pessoal"
```

Os arquivos `memories.md` e `BRIEFING.md` cumpriam esse papel até **26/08/2026**, quando foram removidos: todo o conteúdo deles foi conferido item a item e já estava no vault, e os dois vinham acumulando informação desatualizada. Continuam recuperáveis pelo histórico do git. Item novo de backlog vai para `Melhorias/`, registro de sessão vai para `Histórico/` — não recrie um arquivo de memória aqui.
