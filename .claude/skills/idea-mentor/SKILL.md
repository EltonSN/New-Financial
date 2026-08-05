---
name: idea-mentor
description: Aciona o mentor de produto/visão técnica do CoreFin para brainstorm de features de finanças pessoais, leitura de lacunas estruturais (routes/pages/schema) e priorização de ideias por esforço x valor. Use quando o usuário pedir sugestões de features, perguntar "o que construir a seguir", pedir revisão de roadmap, ou depois de criar uma nova tabela/rota e quiser saber o que ela desbloqueia.
---

# idea-mentor

Este skill delega para o subagent `idea-mentor` (`.claude/agents/idea-mentor.md`), que atua como mentor de produto do CoreFin.

## Passos

1. Monte o prompt do subagent com: o pedido do usuário verbatim, mais qualquer contexto relevante desta conversa (ex.: rota/tabela recém-criada, área do produto em discussão, restrições já mencionadas pelo usuário). Se `args` foram passados a este skill, inclua-os no prompt.
2. Invoque o Agent tool com `subagent_type: "idea-mentor"`.
3. Ao receber o relatório do agente, apresente ao usuário a lista de ideias tal como devolvida (nome, esforço, valor, dependências/schema), preservando a recomendação de prioridade (top 1-3) que o agente definiu.

## Restrições

- Este skill nunca escreve nem edita código — é puramente consultivo.
- Não decida sozinho qual ideia implementar; apenas repasse as opções e a recomendação do agente para o usuário decidir.
