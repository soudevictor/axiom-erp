# Plano de evolução — AxiomERP

Base: `SPEC.md` e `AGENTS.md`. Este plano cobre a padronização documental e a dívida
técnica aberta; as funcionalidades P0 já estão implementadas na v2.0.0.

## Estado atual (2026-10-27)

- Quatro rotas lazy: `/dashboard`, `/inventory`, `/partners`, `/treasury`.
- Persistência IndexedDB (Dexie 4) e API simulada por interceptor.
- 57 testes Vitest verdes; build de produção dentro do budget.
- Documentação padronizada com `AGENTS.md`, `README.md`, `SPEC.md` e `tasks/`.
- Dívidas: copy de UI inline, `npm run lint` quebrado, sem E2E e sem medição Lighthouse.

## Fases

### Fase A — Padronização documental (concluída)

**Objetivo:** alinhar o projeto ao kit `_project-templates/`.

**Entregável:** `AGENTS.md` em pt-BR com as quatro regras obrigatórias; README com as seções
do template; `SPEC.md` com estados, contratos e decisões; `tasks/` criado.

**Verificação:** leitura dos quatro arquivos + `git status` sem artefato gerado.

### Fase B — Dívida de conteúdo (pendente)

**Objetivo:** tirar copy de UI dos componentes e centralizar em `src/data/`.

**Dependências:** Fase A (convenção documentada).
**Entregável:** `src/data/` com navegação, labels de filtro/status, colunas, estados vazios
e mensagens; componentes consumindo os dados.
**Riscos:** migração em massa quebrar template inline; mitigar migrando por feature e
mantendo os testes verdes a cada passo.

### Fase C — Qualidade (pendente)

**Objetivo:** resolver o lint e cobrir os fluxos principais com E2E.

**Entregável:** ESLint configurado (ou script removido com decisão registrada) e smoke
Playwright de dashboard, estoque, parceiros e tesouraria.
**Riscos:** configurar ESLint em Angular 22 pode exigir ajuste de builder; validar em branch
separada.

### Fase D — Medição (pendente)

**Objetivo:** medir performance e acessibilidade com evidência versionada.

**Entregável:** Lighthouse desktop/mobile com LCP, CLS e TBT registrados no README, ou
declaração explícita de que não foi medido.

## Verificação

```bash
npm run type-check && npm test && npm run build
```

E2E (quando existir): `npm run test:e2e`.

## Fora do plano

Backend, auth, RBAC, i18n, PWA e sincronização multi-dispositivo continuam fora do escopo
do demo.
