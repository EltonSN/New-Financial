# memories.md — contexto acumulado do CoreFin

> **Para que serve este arquivo:** dar contexto rápido a uma sessão nova do Claude Code (ou a qualquer pessoa) que abra este repositório sem histórico de conversa. Registra **o que já foi construído, por quê e o que ficou pendente** — não substitui o [`README.md`](./README.md) (como rodar) nem o [`CLAUDE.md`](./CLAUDE.md) (padrões de arquitetura que devem ser seguidos).
>
> **Convenção:** ao concluir uma funcionalidade ou tomar uma decisão que não fica óbvia lendo o código, adicione uma entrada na seção "Linha do tempo" com a data absoluta. Mantenha o arquivo enxuto — detalhe de implementação vive no código, não aqui.
>
> Última atualização: **15/08/2026**.

---

## 1. O projeto em cinco linhas

- CoreFin é um sistema **pessoal** de controle financeiro (uso individual, sem autenticação/multiusuário).
- Monorepo: `api/` (Express + MySQL com SQL puro, sem ORM) + `frontend/` (Create React App, React 19, **sem React Router** — troca de página por state em `App.js`).
- Domínio todo em **português** (variáveis, colunas, textos de UI). Não traduza identificadores existentes.
- Banco MySQL remoto já existente; **não há runner de migração** — scripts em `structure/migrations/` são aplicados à mão.
- Deploy na Vercel: API como função serverless, frontend como build estático (`vercel.json`).

## 2. Linha do tempo

### Antes desta conversa (commits)

| Data | Commit | O que entrou |
|------|--------|--------------|
| 07/03/2026 | `5b96bf8`, `f8b920b` | Primeira versão do projeto |
| 07–08/03/2026 | `17cd57b`, `9fc6220` | Reorganização como monorepo (scripts na raiz com `concurrently`) |
| 17/06/2026 | `ac889e1`, `6cbcada` | Beta V.1.0.0 e o crossfade de imagens de background |
| 28/07/2026 | `1d6b8e1` | Correções e melhorias no dashboard |
| 31/07/2026 | `83f495d` | Correção de bugs e warnings |
| 04/08/2026 | `e85400f` | Estrutura de subagents/skills (`.claude/`), serviços core e páginas de gestão; nasceram aqui o `BRIEFING.md`, o `CLAUDE.md` e os agentes `cleanup-optimizer`, `frontend-design-guardian` e `idea-mentor` |

### Trabalho não commitado herdado (feito antes desta conversa, ainda em working tree)

- **Empréstimos** (`api/routes/loans.js`, `frontend/src/pages/LoansPage.js`, tabela `loan`): controle de valores que **outras pessoas devem ao usuário**, agrupados por devedor, com dívidas fixas (`is_fixo`, perpétuas) ou parceladas, e um extrato "Simplificado" por devedor em modal.
- **Previsão de Saldo** no dashboard (`calcularPrevisaoSaldo()` em `api/routes/dashboard.js` + seção na `DashboardPage`): projeção do saldo do mês atual e do próximo.
- Novo dump de schema `structure/structure-15.08.2026.sql` (substituiu `structure-08.2026.sql`, deletado).

### 15/08/2026 — esta conversa

**a) Nova funcionalidade "Casa" (Gastos da Casa), ponta a ponta**

Objetivo: registrar compras/serviços feitos para a casa (tinta, pedreiro, sofá…), parcelados ou não.

- **Banco:** `structure/migrations/2026-08-15-create-house-expense.sql` cria a tabela `house_expense` (`descricao`, `categoria`, `valor_mensal`, `parcelas`, `parcela_atual`, `data_vencimento`, `status_pago`, `criado_em`).
  - Decisão: adicionamos `parcela_atual` além do que foi pedido, porque a UI precisa mostrar "parcela 3 de 10" e quantas faltam — só `parcelas` não permitiria.
  - Nome no singular (`house_expense`) para acompanhar `loan`/`credit`/`investment`; `categoria` é `varchar(50)` (não ENUM) e a lista canônica vive no frontend (`CATEGORIAS` em `HousePage.js`): Reforma, Melhorias, Decoração, Manutenção, Móveis, Utensílios, Eletrodomésticos, Limpeza, Outros.
- **API:** `api/routes/houseExpenses.js` montado em `/api/house-expenses` — CRUD + `POST /:id/pagar` (quita e projeta a próxima parcela) + `POST /:id/reabrir` (desfaz).
- **Frontend:** `frontend/src/pages/HousePage.js`, entrada `Casa` (ícone `Home`) no `Sidebar` **acima de Empréstimos**, `case 'house'` no `App.js`, e 6 métodos novos no `ApiService.js`.

**b) Ajustes pedidos em seguida (mesma sessão)**

1. Modal **"Simplificado"** na Casa (via `createPortal`), agrupando as parcelas em aberto por categoria com subtotais, total geral e a categoria visível em cada linha. O botão ficou **ao lado do valor** do custo total do mês.
2. Botão de "marcar como pago" passou de checkbox à esquerda para o **✓ ao lado do lápis de edição**, no padrão da tela de Empréstimos; quando pago, o item mostra badge "Pago" + ícone `RotateCcw` indicando que a próxima parcela já está projetada.
3. **Fim da duplicação visual:** como pagar cria a linha da parcela seguinte, o mesmo gasto aparecia duas vezes. `HousePage` passou a derivar `gastosProcessados` (`useMemo`) agrupando as linhas em *correntes* (`descricao` + `categoria` com `parcela_atual` sequencial) e mantendo **uma linha visível por corrente**. Os totalizadores continuam somando **todas** as linhas vindas da API.
4. Tela de **Empréstimos** ganhou o mesmo painel superior da Casa (`Total a Receber · mês atual` + `Pendente no mês` / `Já pago no mês` / `Falta receber (total)`), substituindo o "Total a Receber" que ficava no canto do formulário. Sem botão Simplificado ali — ele já existe por devedor.
5. **Destaque da reta final das parcelas:** helper `corRestantes(restantes, padrao)` nas duas páginas — **2 restantes → azul** (`COLORS.info`), **1 → verde** (`COLORS.success`). Aplicado nas listas e nos dois modais Simplificado.
6. Documentação: `README.md` (seção "Funcionalidades", rotas novas, `structure/migrations/`), `CLAUDE.md` (modelo de corrente de parcelas, contrato de layout Casa/Empréstimos, nomes de tabela) e este `memories.md`.

## 3. Decisões e convenções que não são óbvias no código

- **Modelo de corrente de parcelas** (Casa e Empréstimos): uma linha por parcela; `POST /:id/pagar` marca a linha como paga e insere a próxima com o vencimento +1 mês, usando um helper local que trava no último dia do mês de destino (31/01 → 28/02). Empréstimos só projeta quando `is_fixo = 1`; Casa projeta enquanto `parcela_atual < parcelas`. `parcela_atual` é informável no cadastro para registrar dívidas/compras que já vinham sendo pagas fora do sistema.
- **Casa e Empréstimos são páginas-espelho.** Mesmo painel superior, mesmo formulário em linha, mesmos cards agrupados e expansíveis, mesma ordem de ações (✓ → `RotateCcw` → editar → excluir). Mudança de layout em uma deve ser replicada na outra.
- `DESCRICAO = 'BALANCEAMENTO'` em `transactions` é **correção manual de saldo**: fica fora dos totais e das séries do mês, mas entra no saldo acumulado.
- O **saldo acumulado sempre subtrai o total investido** (última linha de `investment` por `CATEGORIA`), porque aporte em investimento não é lançado como `SAIDA`. Isso está duplicado em `dashboard.js` e `DashboardPage.js` — se mexer em um, mexa no outro.
- Nomes de rota **não** batem com os de tabela (`house-expenses` → `house_expense`, `loans` → `loan`, `credits` → `credit`, `fixed-expenses` → `fixed_expense`, `investments` → `investment`). Colunas antigas são `SCREAMING_SNAKE` (`DATA`, `VALOR`, `TIPO`, `DESCRICAO`); as tabelas mais novas usam `snake_case`.
- Estilo é **objeto inline a partir dos tokens de `constants/theme.js`** — sem Tailwind, sem CSS-in-JS, sem biblioteca de componentes. Páginas novas devem usar `COLORS`/`FONT`/`GLASS` e o kit `components/ui/`. (`LoansPage.js` ainda tem hex hardcoded de antes; o código novo usa tokens.)
- Ambiente de dev deste repositório roda no **WSL sem Node instalado no Linux** — só existe o Node do Windows (`/mnt/c/Program Files/nodejs/node.exe`). Para checar sintaxe/lint, chame o `node.exe` passando caminhos no formato Windows.

## 4. Pendências e lacunas conhecidas

- [ ] **Aplicar a migração** `structure/migrations/2026-08-15-create-house-expense.sql` no MySQL — a tabela `house_expense` ainda não existe no banco, então a tela Casa só funciona depois disso. Nada da funcionalidade foi testado em runtime contra o banco.
- [ ] O **dashboard ignora `loan` e `house_expense`**: `calcularPrevisaoSaldo()` não considera nem as parcelas da casa (saída futura real) nem os empréstimos a receber (entrada futura). É a maior inconsistência atual do sistema — a previsão de saldo está otimista para gastos da casa.
- [ ] `ApiService.reopenHouseExpense` / `POST /api/house-expenses/:id/reabrir` existem mas **não têm consumidor na UI** (o checkbox que os usava foi removido). Decidir entre expor um "desfazer" nos itens pagos ou remover os dois.
- [ ] Gastos da casa **não geram transação** em `transactions` ao serem pagos — o valor não aparece nas saídas do mês. Mesmo comportamento dos empréstimos; é intencional por enquanto, mas vale decidir se deve integrar.
- [ ] Sem suíte de testes na API e sem lint além do `eslintConfig` padrão do CRA.
- [ ] `COLORS.bgDeep` (`#00e746ff`) e `COLORS.bgPrimary` (`#d91010ff`) em `theme.js` são verde e vermelho puros e **não são referenciados em nenhum lugar** — provável resquício de debug visual; candidatos a remoção.
- [ ] Trabalho de Empréstimos + Casa + novo dump de schema ainda **não commitado**.
