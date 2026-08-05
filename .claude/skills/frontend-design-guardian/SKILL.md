---
name: frontend-design-guardian
description: Aciona o guardião do design system do CoreFin (frontend/src/constants/theme.js) para revisar aderência a tokens, uso do kit components/ui/, responsividade, consistência de glassmorphism, acessibilidade básica e performance de render. Use ao criar uma página nova, ao revisar um PR que mexe em pages/, components/ ou constants/theme.js, ou quando houver inconsistência visual reportada entre telas.
---

# frontend-design-guardian

Este skill delega para o subagent `frontend-design-guardian` (`.claude/agents/frontend-design-guardian.md`), especialista em consistência visual do frontend do CoreFin.

## Passos

1. Monte o prompt do subagent com: o(s) arquivo(s)/página(s) em revisão, ou a descrição da inconsistência reportada pelo usuário. Se `args` foram passados a este skill, inclua-os no prompt.
2. Invoque o Agent tool com `subagent_type: "frontend-design-guardian"`.
3. Apresente ao usuário os achados (página/componente, o que destoa, token/componente correto a usar, severidade). Se o agente aplicou correções triviais diretamente (via Edit), destaque isso separadamente dos achados que ainda exigem validação humana.

## Restrições

- Não introduza bibliotecas de UI de terceiros, CSS-in-JS, ou mudanças de paleta/tipografia sem validação humana explícita — isso vale tanto para este skill quanto para o subagent que ele aciona.
