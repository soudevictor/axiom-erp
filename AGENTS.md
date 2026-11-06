# AGENTS.md

> Instância de `_project-templates/agent.md` para o AxiomERP. O nome `AGENTS.md` é mantido
> porque é o arquivo carregado automaticamente pelas ferramentas; o conteúdo segue o padrão
> do kit. Fonte do padrão: `_project-templates/agent.md` no workspace.

- **Projeto:** AxiomERP — demo client-only de ERP B2B (supply chain, estoque, tesouraria e parceiros)
- **Stack:** Angular 22 (standalone, signals, OnPush), `@ngrx/signals` 19, Dexie 4, Tailwind CSS 3.4, Vitest 4
- **Deploy:** https://axiomerp.vercel.app
- **Última revisão:** 2026-10-27

---

## 0. Regras inegociáveis

### 0.1 Idioma: Português (Brasil)

Toda prosa é em **pt-BR**: respostas, planos, mensagens de commit, comentários, descrições
de teste, `aria-label`, mensagens de erro e copy da interface.

- Código (componentes, variáveis, tipos, arquivos) segue o inglês técnico; termos de domínio
  já estabelecidos permanecem como estão.
- Não há camada de i18n: strings visíveis são pt-BR por decisão de produto.
- Se o desenvolvedor escrever em outro idioma, responda em pt-BR.

### 0.2 Versionamento: permissão explícita

> **NUNCA execute comandos de `git commit` ou `git push` sem a minha permissão explícita prévia.**

1. Leitura é livre: `git status`, `git diff`, `git log`.
2. Mostre o resumo do diff e a mensagem de commit proposta antes de pedir autorização.
3. Execute somente após um "sim" explícito na conversa atual; silêncio ou "ok" ambíguo não valem.
4. Autorização de commit **não** autoriza push. Peça de novo.
5. Sem autorização também para `--amend`, `push --force`, `reset --hard`, tags e deploy.
6. Nunca commite `.env*`, `node_modules/`, `dist/`, `.angular/` ou credenciais.

### 0.3 Skills: acionar antes de editar

Carregue de 1 a 3 skills relevantes antes de começar. Não peça permissão para usar uma skill
já instalada; peça apenas para instalar algo novo.

| Tarefa | Skill | Quando |
| --- | --- | --- |
| Planejar feature/ciclo e escrever spec | `spec-driven-development` | Mudança de ~30+ min, requisito ambíguo ou vários módulos |
| Desenhar módulo, store ou fronteira | `codebase-design` | Dúvida sobre onde a responsabilidade mora ou como testar sem UI |
| Fixar vocabulário do domínio (estoque, tesouraria) | `domain-modeling` | Termo ambíguo ou decisão que precisa de ADR/glossário |
| Auditar/polir UI de dashboard e tabela | `impeccable` | Hierarquia, densidade, estados, responsividade |
| Testar com dados extremos | `break-ui` | Nomes longos, CNPJ, listas vazias, números altos, overflow |
| Movimento e micro-interações | `animate` | Transição, drawer, toast, feedback de ação |
| Mobile e tabela responsiva | `mobile-native` | Card mobile, toque, 100vh, hover preso |
| Protótipo de modelo de estado | `prototype` | Validar fluxo antes de comprometer a store |
| Bug difícil ou regressão | `diagnosing-bugs` | Falha sem causa óbvia, latência, IndexedDB |
| Desenvolvimento guiado por teste | `tdd` | Feature ou correção que pede red-green-refactor |
| Revisão de código | `code-review` | Revisar branch, diff ou trabalho em andamento |
| Escrever PR | `pr` | Abrir pull request |
| Pesquisa técnica | `research` | Documentação de API, Dexie, Angular, comparação |
| Browser/E2E | `playwright-cli` | Navegar, clicar, validar fluxo real |
| Documentos para agentes | `writing-for-agents` | Editar este arquivo ou uma skill |
| Descobrir/instalar skills | `find-skills` | Não há skill instalada para a tarefa |

### 0.4 Conteúdo e dados

> **Todo e qualquer copy, textos, planos ou dados estáticos devem ficar isolados em arquivos
> JSON/TS separados na pasta `data/`, nunca hardcoded nos componentes.**

Situação atual e destino:

- **Seeds e fixtures:** `src/app/core/database/seed/` (`catalog.ts`, `prng.ts`,
  `seed-inventory.ts`, `seed-movements.ts`, `seed-partners.ts`, `seed-transactions.ts`).
- **Contratos de domínio:** `src/app/core/models/` (`InventoryItem`, `Partner`,
  `TreasuryTransaction`, transições de status).
- **Copy de UI:** hoje inline nos componentes. Todo copy **novo** nasce em `src/data/`; a
  migração do legado está registrada em `tasks/todo.md` como dívida P1.
- **Mensagens de erro da API:** vêm do interceptor com `{ code, message }`; a store exibe
  `error.error.message` via `messageFrom`. Não duplique a mensagem no componente.
- Labels de filtro, opções de status, textos de estado vazio e colunas de tabela também são
  conteúdo: ao tocar neles, mova para `src/data/` em vez de ampliar o inline.

---

## 1. Comandos e checkpoint

Use **npm** e o `package-lock.json`.

| Comando | O que faz |
| --- | --- |
| `npm start` | Dev server em http://localhost:4200 |
| `npm test` | Suíte Vitest completa (~11 s, 57 testes) |
| `npx vitest run src/app/caminho/arquivo.spec.ts` | Um spec; adicione `-t "nome"` para um teste |
| `npm run type-check` | `tsc --noEmit --project tsconfig.app.json` |
| `npm run build` | Build de produção; saída em `dist/axiom-erp/browser` |
| `npm run lint` | **Quebrado de propósito:** `ng lint` não tem target ESLint |

Checkpoint antes de considerar a tarefa concluída:

```bash
npm run type-check && npm test && npm run build
```

- `npm run lint` falhar não é regressão nova; não trate como blocker.
- Mantenha `.npmrc` com `legacy-peer-deps=true`; a instalação depende disso.
- Node compatível com `@angular/cli` 22: `^22.22.3`, `^24.15.0` ou `>=26.0.0`.

---

## 2. Arquitetura

```
src/main.ts
  → app.config.ts (providers + seed inicial)
    → app.ts (<app-main-layout />)
      → app.routes.ts (4 rotas lazy)
```

- `core/api/*.api.ts` é a **única** camada que injeta `HttpClient`. `signalStore`s chamam
  esses serviços; componentes não chamam `HttpClient`.
- Stores ficam em `features/<feature>/data-access/*.store.ts`, são `providedIn: 'root'` e
  carregam em `withHooks.onInit` (inventory, partners, treasury), preservando estado entre rotas.
- `core/interceptors/mock-api.interceptor.ts` **é o backend**. Novo endpoint exige mudança
  na API service **e** no bloco de rotas do interceptor. URLs fora de
  `/api/v1/{inventory,treasury,partners}` passam para a rede real.
- Validação e regra de negócio são aplicadas no interceptor e retornam
  `HttpErrorResponse` com `{ code, message }` em pt-BR.
- Regras de domínio, labels e enums ficam em `core/models/*` (ex.: `deriveInventoryStatus`,
  `PARTNER_STATUS_TRANSITIONS`). Reutilize; não rederive em componente ou spec.
- Schema Dexie em `core/database/app-database.ts`: para mudar tabela/índice, adicione
  `version(n).stores(...)`. Nunca edite uma versão existente.
- O seed de startup preenche apenas tabelas vazias. Depois de mudar seed, use
  "Ferramentas de demonstração → Repopular dados" no header (ou apague o IndexedDB).
- `APP_VERSION` em `core/config/app-version.ts` aparece na UI; mantenha alinhado a
  `package.json` e ao badge do README.

---

## 3. Estrutura de pastas

```
src/
├── app/
│   ├── core/                    # cross-cutting, sem UI
│   │   ├── api/                 # InventoryApi, PartnersApi, TreasuryApi
│   │   ├── config/              # APP_VERSION
│   │   ├── database/            # Dexie + seed/
│   │   ├── interceptors/        # mock API + resiliência
│   │   ├── models/              # contratos e regras de domínio
│   │   └── services/            # ThemeService
│   ├── shared/
│   │   ├── directives/          # máscara CNPJ
│   │   ├── ui/                  # layout, badge, modal, drawer, toast...
│   │   └── utils/               # CSV, moeda, CNPJ
│   └── features/
│       ├── dashboard/
│       ├── inventory/           # component + data-access + ui
│       ├── partners/
│       └── treasury/
├── styles.scss                  # tokens CSS + base global
├── test-setup.ts                # fake-indexeddb, zona, TestBed
└── main.ts
```

- Alias `@/*` → `src/app/*`, configurado em `tsconfig.json` e `vitest.config.ts`.
- `src/data/` é o destino do conteúdo estático (ainda não existe; ver §0.4).

---

## 4. UI/UX e acessibilidade

- Componentes standalone, `OnPush`, templates/styles inline, `inject()`, signals e
  `@if`/`@for`.
- `src/app/app.html` e `app.scss` são resquícios sem uso; editá-los não tem efeito.
- Reutilize `shared/ui/*` e as classes `.ui-*` de `src/styles.scss`.
- Use tokens semânticos (`bg-canvas-surface`, `text-content-muted`, `border-border-subtle`,
  `text-state-*`). Sem hex cru fora de `styles.scss`, sem `slate`/`gray`, gradientes ou
  `backdrop-blur` decorativo.
- Tema escuro por padrão (`axiom-theme` em `localStorage`, `.dark` no `<html>`);
  `index.html` aplica preferência clara salva antes do boot.
- Filtros são deep-linkable via query params (`?search=`, `?status=`, `?category=`,
  `?warehouseId=`). Preserve a sincronização ao tocar em inventory/partners/treasury.
- Toda listagem tem quatro estados: erro → loading (skeleton) → vazio → dados.
- Acessibilidade: foco visível, `aria-*`, semântica de tabela, skip link, command palette
  com focus trap e navegação por teclado.
- Movimento só com `transform`/`opacity`; respeite `prefers-reduced-motion`.

---

## 5. Testes

- Specs ao lado do código (`*.spec.ts`); Vitest + jsdom, com `fake-indexeddb` e TestBed em
  `src/test-setup.ts`.
- A latência do interceptor (200–500 ms) é real nos testes. Espere com `setTimeout`
  (500/650/800 ms) ou fake timers; não assuma resolução imediata.
- Specs de store semeiam e limpam o `db` Dexie diretamente entre testes; use o singleton de
  `core/database/app-database.ts`.
- O spec do main-layout emite um `NG0303` pré-existente para o binding `open` e warnings de
  `localStorage` do jsdom; a suíte passa mesmo assim.
- Todo P0/P1 corrigido ganha teste de regressão no mesmo ciclo.
- Descrições em pt-BR, observando comportamento visível.

---

## 6. Armadilhas específicas

- **Lint quebrado:** `ng lint` não tem target. Não gaste tempo "consertando" sem decisão
  explícita; registre em `tasks/todo.md`.
- **Seed não atualiza sozinho:** tabelas já preenchidas são ignoradas no boot.
- **Dexie:** nunca edite versão existente; adicione uma nova.
- **Endpoint novo:** API service + interceptor, sempre os dois.
- **HTTP em componente/store:** proibido; só `core/api`.
- **Build:** a saída Vercel é `dist/axiom-erp/browser`; `vercel.json` reescreve tudo para
  `index.html` (deep links).
- **`.npmrc`:** `legacy-peer-deps=true` é obrigatório.

---

## 7. Git, ambiente e deploy

- Não há backend, auth real, `.env` ou segredo. Não introduza credencial no client.
- Deploy Vercel serve `dist/axiom-erp/browser`; deep links validados em produção.
- Antes de finalizar, rode `git status` e confira se `dist/`, `.angular/` ou artefatos de
  teste não entraram no diff.
- Deploy só após autorização explícita e com o checkpoint verde.

---

## 8. Definition of Done

- [ ] Requisito atendido; nada fora do escopo foi inventado.
- [ ] Copy novo em `src/data/` (legado inline não foi ampliado).
- [ ] Estados erro/loading/vazio/dados implementados na listagem tocada.
- [ ] Query params preservados quando o filtro mudou.
- [ ] Teclado, foco, labels e contraste verificados.
- [ ] `npm run type-check && npm test && npm run build` verdes.
- [ ] Nenhum `console.log`, código morto ou artefato gerado no diff.
- [ ] README/SPEC/tasks atualizados se o comportamento mudou.
- [ ] `git status` revisado; **nenhum commit ou push sem autorização**.
