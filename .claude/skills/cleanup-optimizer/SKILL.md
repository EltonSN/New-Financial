---
name: cleanup-optimizer
description: Aciona a varredura de saúde do código do CoreFin — código morto, dependências não usadas, desvios de padrão (rotas/páginas), quebras de nomenclatura Portuguese-first e artefatos obsoletos. Use antes de releases, periodicamente, ou depois de um sprint com muita experimentação, quando o usuário pedir uma limpeza, auditoria de código morto, ou revisão de consistência de padrão no repo.
---

# cleanup-optimizer

Este skill delega para o subagent `cleanup-optimizer` (`.claude/agents/cleanup-optimizer.md`), que faz varredura de saúde do código sem remover nada por conta própria.

## Passos

1. Monte o prompt do subagent com: o escopo pedido pelo usuário (repo inteiro, uma pasta específica como `api/routes/`, ou uma mudança recente) e, se aplicável, o que motivou a varredura (ex.: pré-release, pós-sprint). Se `args` foram passados a este skill, inclua-os no prompt.
2. Invoque o Agent tool com `subagent_type: "cleanup-optimizer"`.
3. Apresente ao usuário os achados exatamente como reportados pelo agente, agrupados por categoria (código morto / dependência não usada / desvio de padrão / nomenclatura / artefato obsoleto), com a evidência (arquivo:linha, grep) que sustenta cada um.

## Restrições

- Este skill nunca remove, edita ou deleta arquivos — apenas reporta achados com evidência.
- A decisão de remover algo é sempre do usuário; nunca assuma que "não usado agora" significa "seguro remover".
