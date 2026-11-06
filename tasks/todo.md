# Tarefas — AxiomERP

> Backlog executável. Marque `[x]` apenas após verificar. Nenhum commit sem autorização.

## Fase A — Padronização documental

### [x] A1. Reescrever `AGENTS.md` no padrão do kit
- Aceite: pt-BR; regras de idioma, permissão de git, skills e conteúdo em `data/`.
- Verify: leitura + `rg "NUNCA execute comandos" AGENTS.md`.
- Files: `AGENTS.md`

### [x] A2. Alinhar `README.md` às seções universais
- Aceite: Visão geral, Stack Tecnológica, Pré-requisitos, Como rodar localmente,
  Arquitetura de Pastas, Qualidade, Limitações e Documentação.
- Verify: leitura + `package.json`/README com a mesma versão e comandos.
- Files: `README.md`

### [x] A3. Criar `SPEC.md` a partir do template
- Aceite: objetivo, escopo, fluxos, quatro estados, bordas, contratos, testes, limites,
  critérios P0/P1/P2, DoD, decisões e questões abertas.
- Verify: leitura + links do README resolvem.
- Files: `SPEC.md`

### [x] A4. Criar `tasks/plan.md` e `tasks/todo.md`
- Aceite: fases com dependência, risco e verificação.
- Verify: leitura.
- Files: `tasks/plan.md`, `tasks/todo.md`

## Fase B — Conteúdo

### [ ] B1. Criar `src/data/` com navegação e labels de domínio
- Aceite: nav, filtros, status, colunas e estados vazios vêm de `src/data/`; nenhum copy
  novo hardcoded.
- Verify: `rg` nos componentes tocados; `npm test`.
- Files: `src/data/*`, `src/app/shared/ui/layout/*`, `src/app/features/*`

### [ ] B2. Migrar mensagens de estado vazio/erro por feature
- Aceite: mensagens centralizadas e tipadas; componentes só renderizam.
- Verify: `npm test` + inspeção visual dos quatro estados.
- Files: `src/data/*`, `src/app/features/*`

## Fase C — Qualidade

### [ ] C1. Resolver `npm run lint`
- Aceite: ESLint configurado e verde **ou** script removido com decisão registrada na SPEC.
- Verify: `npm run lint` (ou `npm run` sem o script).
- Files: `package.json`, config de lint, `SPEC.md`

### [ ] C2. Smoke E2E dos quatro fluxos
- Aceite: Playwright cobre dashboard → estoque (filtro + movimentação), parceiros (CRUD) e
  tesouraria (criação).
- Verify: `npm run test:e2e`.
- Files: `playwright.config.ts`, `e2e/*`, `package.json`

## Fase D — Medição

### [ ] D1. Lighthouse desktop/mobile
- Aceite: números reais de LCP, CLS e TBT no README, ou declaração de "não medido".
- Verify: relatório + leitura do README.
- Files: `README.md`, `SPEC.md`
