# BRIEFING — CoreFin

Documento vivo com duas partes:

1. **Oportunidades de melhoria** — pontos identificados no estado atual do código que valem investimento futuro.
2. **Estrutura de subagents** — squad de agentes especializados sugerido para apoiar o desenvolvimento contínuo do projeto.

Use este arquivo como backlog de contexto, não como spec fechada — revise e reprioridade conforme o projeto evolui.

---

## 1. Oportunidades de melhoria

### Segurança
- **Não há autenticação/autorização em nenhuma rota.** Toda a API (`/api/transactions`, `/api/cards`, `/api/dashboard`, etc.) está aberta — qualquer cliente que alcance o endpoint lê e escreve dados financeiros. Antes de qualquer deploy público sério, isso precisa de uma camada de auth (mesmo que simples, tipo API key ou JWT single-user).
- **CORS liberado para todas as origens** (`app.use(cors())` em `api/server.js` sem `origin` restrito). Em produção, restringir ao domínio do frontend.
- **Sem rate limiting** nas rotas — exposto a abuso/scraping se ficar público.
- Não há `.env.example` documentando as variáveis exigidas por `api/config/database.js` — só existe a lista no `CLAUDE.md`. Adicionar o arquivo reduz fricção de onboarding e risco de configurar errado em produção.

### API
- **Sem suíte de testes.** Nenhum teste automatizado cobre as rotas — regressões em queries SQL (principalmente `dashboard.js`, que dispara ~8 queries em paralelo) só aparecem em produção. Vale introduzir Jest + Supertest com um banco de teste.
- **Sem validação de payload.** As rotas confiam diretamente em `req.body` para montar queries parametrizadas — não há checagem de tipo/obrigatoriedade antes do INSERT/UPDATE (ex.: `recurringIncome.js`, `credits.js`). Um payload malformado normalmente só falha no nível do MySQL, com mensagens de erro genéricas.
- **Mismatch entre nome de rota e nome de tabela** (`fixed-expenses` → `fixed_expense`, `credits` → `credit`, `investments` → `investment`, no singular) é uma pegadinha documentada no `CLAUDE.md`, mas continua sendo fonte de bugs para quem entra no projeto. Não precisa ser corrigido (mudar nome de tabela em produção é arriscado), mas vale um comentário inline nos routers apontando a tabela real.
- **Sem camada de logging estruturado** — só `console.log`/`console.error`. Em produção (Vercel serverless), isso dificulta rastrear erros; um logger simples (pino) com níveis ajudaria observabilidade.
- **Sem documentação de API** (Swagger/OpenAPI ou Postman collection). Como não há testes automatizados, isso também serve de contrato vivo entre frontend e backend.

### Frontend
- **Sem tratamento de erro de UI centralizado** — os componentes de página fazem `try/catch` individualmente ao chamar `ApiService`; não há um Error Boundary React nem um padrão consistente de toast/feedback de erro para o usuário.
- **Tabelas sem virtualização** — `components/ui/Table.js` e `Pagination.js` funcionam bem para os volumes atuais, mas conforme o histórico de transações cresce, listagens grandes (ex.: `TransactionsPage`) vão degradar sem paginação server-side ou virtualização.
- **10 imagens de fundo carregadas via cross-fade a cada 10 minutos** (`App.js`) — vale revisar se todas as 10 são pré-carregadas de uma vez (custo de banda inicial) ou carregadas sob demanda.
- **Zero testes de componente além do boilerplate do CRA** (`setupTests.js`). Páginas com lógica de formulário (`SettingsPage`, `TransactionsPage`) são boas candidatas a testes de fluxo com React Testing Library.

### Dados / Schema
- Dump de schema (`structure/structure-08.2026.sql`) é versionado manualmente — não há ferramenta de migração (ex.: `db-migrate`, Flyway, ou até scripts SQL numerados). Isso funciona a curto prazo mas cria risco de drift entre ambientes conforme o projeto cresce.
- Colunas financeiras em `SCREAMING_SNAKE_CASE` (`DATA`, `VALOR`) convivem com metadados em `snake_case` (`nome`, `limite_total`) — inconsistência histórica documentada, não vale a pena normalizar agora (custo de migração > benefício), mas deve ser mantida como está para não fragmentar ainda mais.

### DevOps
- **Sem CI configurado** — nenhum workflow do GitHub Actions rodando lint/test em PRs. Mesmo sem lint script formal, um pipeline mínimo (`npm test -- --watchAll=false` no frontend) pegaria regressões antes do merge.
- Pool de conexão MySQL (`connectionLimit: 10`) criado a nível de módulo em `api/config/database.js` — em ambiente serverless (Vercel), cada invocação fria pode recriar o pool; vale avaliar se o limite de conexões simultâneas do banco aguenta o padrão de cold starts em picos de tráfego.

---

## 2. Estrutura de Subagents sugerida

Três agentes especializados, pensados para os pontos de atrito recorrentes deste projeto: geração de ideias/visão de produto, saúde/limpeza do código, e consistência visual do frontend. Cada um tem um escopo de atuação e um conjunto de habilidades que não se sobrepõe aos outros — evita que dois agentes "discutam" sobre a mesma mudança.

### 🧭 Gerador de Ideias (`idea-mentor`)

**Papel:** mentor de produto e visão técnica. Não escreve código de produção — expande a visão do que o CoreFin pode se tornar e aponta lacunas que o dono do projeto não percebeu ainda.

**Habilidades:**
- **Brainstorm orientado a domínio** — propõe funcionalidades novas coerentes com o domínio de finanças pessoais (ex.: metas de economia, alertas de fatura próxima do vencimento, projeção de saldo futuro com base em despesas fixas + recorrentes já cadastradas, categorização automática de transações por padrão de texto).
- **Leitura de lacunas estruturais** — cruza `routes/`, `pages/` e o schema em `structure/` para identificar funcionalidades "pela metade" (ex.: uma tabela existe mas não tem UI, ou uma tela existe mas falta um endpoint de suporte).
- **Benchmarking conceitual** — compara o CoreFin com padrões conhecidos de apps de finanças pessoais (orçamento por categoria, envelopes, relatórios anuais) e sugere adaptações realistas ao stack atual, sem sugerir reescrever a arquitetura.
- **Priorização com trade-offs** — para cada ideia levantada, articula esforço estimado vs. valor percebido, e se a ideia exige mudança de schema, nova dependência, ou é só composição do que já existe.

**Quando acionar:** sessões de planejamento, "o que posso adicionar a seguir", revisão trimestral de roadmap, ou quando uma nova tabela/rota é criada e vale pensar no que mais ela desbloqueia.

**Não faz:** não implementa, não decide arquitetura definitiva, não mexe em código — entrega ideias e trade-offs para o humano (ou outro agente) decidir e executar.

---

### 🧹 Otimizador (`cleanup-optimizer`)

**Papel:** varredura de saúde do código. Mantém o projeto organizado removendo o que não é mais usado e sinalizando desvios do padrão estabelecido no `CLAUDE.md`.

**Habilidades:**
- **Detecção de código morto** — busca por exports, funções, rotas (`api/routes/*.js`), métodos de `ApiService.js` e componentes React que não têm nenhum call-site restante, incluindo o caso comum de duplicar uma rota (`fixedExpenses` vs `recurringIncome`) sem remover a antiga.
- **Detecção de dependências não usadas** — cruza `package.json` (raiz, `api/`, `frontend/`) com imports reais no código para sinalizar pacotes instalados mas nunca importados.
- **Consistência de padrão de código** — verifica se rotas novas seguem o padrão flat de `routes/*.js` (SQL inline, sem camada de service/model) e se páginas novas seguem o padrão de `App.js`/`Sidebar` (sem introduzir React Router "por engano").
- **Auditoria de nomenclatura Portuguese-first** — sinaliza identificadores, colunas ou strings de UI que quebrem a convenção de domínio em português já estabelecida.
- **Limpeza de artefatos** — identifica arquivos temporários, dumps de schema desatualizados em `structure/`, ou configs duplicadas (ex.: `.gitignore` divergente entre raiz/`api/`/`frontend/`) que deveriam ser consolidados.

**Quando acionar:** antes de releases, periodicamente (ex.: mensal) ou depois de um sprint com muita experimentação, para evitar acúmulo de dívida técnica silenciosa.

**Não faz:** não decide remover algo sozinho sem confirmação — reporta achados com evidência (grep de call-sites) e deixa a decisão de deletar para o humano, já que "não usado agora" pode ser código propositalmente reservado para uma feature em andamento.

---

### 🎨 Frontend-expert (`frontend-design-guardian`)

**Papel:** especialista em consistência visual e experiência de uso do frontend React. Guardião do design system definido em `constants/theme.js`.

**Habilidades:**
- **Aderência ao design system** — garante que toda nova UI reutiliza os tokens de `theme.js` (`COLORS`, `GLASS`/`GLASS_LIGHT`, `SHADOWS`, `TRANSITIONS`, `FONT`, `SIDEBAR`, `BREAKPOINTS`) em vez de hardcodar cores/espaçamentos inline, e que reaproveita o kit `components/ui/` (`Button`, `Card`, `Input`, `Select`, `Table`) em vez de recriar elementos.
- **Responsividade e breakpoints** — revisa se novas telas respeitam os `BREAKPOINTS` já definidos e funcionam nos tamanhos de tela suportados, já que não há biblioteca de componentes responsivos pronta (tudo é estilo inline manual).
- **Consistência de glassmorphism** — mantém o efeito visual (`GLASS`/`GLASS_LIGHT`, backdrop-filter) coerente entre `DashboardPage`, `TransactionsPage`, `CardsPage` e `SettingsPage`, evitando que uma página nova destoe visualmente das demais.
- **Acessibilidade básica** — contraste de cor mínimo sobre o fundo com cross-fade de imagens (`App.js`), estados de foco/hover visíveis nos componentes de `ui/`, labels e affordances corretos em formulários (`SettingsPage` tem vários CRUDs inline).
- **Performance de render** — sinaliza re-renders desnecessários em páginas com estado pesado (listas grandes em `TransactionsPage`, múltiplos `useState` em `SettingsPage`) e oportunidades de `useMemo`/`useCallback` sem introduzir complexidade desnecessária.

**Quando acionar:** ao criar uma página nova, ao revisar um PR que mexe em `pages/`, `components/` ou `constants/theme.js`, ou quando o usuário reportar inconsistência visual entre telas.

**Não faz:** não introduz bibliotecas de UI de terceiros nem CSS-in-JS — trabalha dentro do padrão de estilos inline + tokens já estabelecido, e não decide mudanças de identidade visual (paleta, tipografia) sem validação humana.

---

### Como esses três se complementam

```
Gerador de Ideias  →  propõe "o quê" (feature/direção)
        │
        ▼
   (humano decide o que entra no escopo)
        │
        ▼
Frontend-expert    →  garante que a implementação de UI fica consistente
Otimizador         →  garante que nada fica órfão/duplicado depois da mudança
```

Nenhum dos três deveria ter permissão de decidir sozinho o que é removido ou o que entra em produção — todos reportam achados/propostas para revisão humana, mantendo o humano no controle das decisões de escopo e arquitetura.
