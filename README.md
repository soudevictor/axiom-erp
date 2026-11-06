# AxiomERP — B2B Supply Chain & Financial Suite (Demo)

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0_Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![NgRx Signals](https://img.shields.io/badge/@ngrx/signals-19-BA2BD2?style=flat-square&logo=ngrx&logoColor=white)](https://ngrx.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
![Vitest](https://img.shields.io/badge/Vitest-57_passing-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![AxiomERP](https://img.shields.io/badge/AxiomERP-2.0.0-2563EB?style=flat-square)

**Demo ao vivo:** https://axiomerp.vercel.app

## Visão geral

Aplicação Angular 22 client-side de gestão de supply chain, estoque multi-armazém,
tesouraria e parceiros. Não há backend, autenticação ou API real: a persistência fica em
IndexedDB (Dexie.js) e `/api/v1/*` é servido por um `HttpInterceptor`.

O projeto é uma peça de portfólio para demonstrar arquitetura Angular moderna, estado
reativo com Signals, testes e um design system próprio — com dados de demonstração
determinísticos e limitações declaradas.

**Principais funcionalidades**

- Dashboard com KPIs reais, gráfico SVG de fluxo e alertas acionáveis.
- Estoque com 500 SKUs, 5 armazéns, busca/filtros, virtual scroll, movimentações e export CSV.
- Parceiros com CRUD, validação de CNPJ, transições de status e scroll infinito.
- Tesouraria com aging list, filtros, paginação e CRUD de transações.
- Tema claro/escuro, command palette (`Ctrl+K`) e acessibilidade por teclado.

---

## Stack Tecnológica

| Camada | Tecnologia | Uso no projeto |
| --- | --- | --- |
| Framework | Angular 22 (standalone, signals, `@if/@for/@defer`, OnPush) | Rotas lazy e componentes standalone |
| Estado | `@ngrx/signals` 19 (`signalStore`) | Stores de inventory, partners e treasury |
| Persistência | Dexie.js 4 (IndexedDB) | Tabelas `inventory`, `stockMovements`, `transactions`, `partners` |
| "API" | `HttpInterceptorFn` (`mock-api.interceptor.ts`) | Endpoints `/api/v1/*`, latência e erros simulados |
| UI | Tailwind CSS 3.4 + SCSS, `@angular/cdk`, `lucide-angular` | Design system, virtual scroll, overlays |
| Testes | Vitest 4 + `@analogjs/vitest-angular` (jsdom) | 57 testes de store, API, componente e utils |
| Seed | PRNG próprio (`mulberry32`) | 500 SKUs, 120 transações, 62 parceiros |

---

## Pré-requisitos

- **Node.js** `^22.22.3`, `^24.15.0` ou `>=26.0.0` — requisito do `@angular/cli` 22.
- **npm** com `package-lock.json`; não misture gerenciadores.
- O `.npmrc` do projeto define `legacy-peer-deps=true`; a instalação depende disso.

---

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Subir o dev server
npm start
```

Acesse **http://localhost:4200**.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | Dev server em `http://localhost:4200` |
| `npm test` | `vitest run` (57 testes, ~11 s) |
| `npm run type-check` | `tsc --noEmit --project tsconfig.app.json` |
| `npm run build` | `ng build --configuration production` |
| `npm run watch` | Build em modo watch |
| `npm run lint` | **Quebrado:** `ng lint` não tem target ESLint configurado |

Para rodar um spec isolado:

```bash
npx vitest run src/app/features/inventory/data-access/inventory.store.spec.ts
npx vitest run -t "nome do teste"
```

Checkpoint mínimo antes de considerar uma tarefa concluída:

```bash
npm run type-check && npm test && npm run build
```

> `npm run lint` falhar não é regressão nova: o script existe, mas não há ESLint configurado.
> A correção está registrada em `tasks/todo.md`.

---

## Arquitetura de Pastas

```text
src/
├── app/
│   ├── app.config.ts              # providers globais, ícones Lucide, seed inicial
│   ├── app.routes.ts              # 4 rotas lazy: dashboard, inventory, treasury, partners
│   ├── app.ts                     # shell: <app-main-layout />
│   ├── core/                      # cross-cutting, sem UI
│   │   ├── api/                   # InventoryApi, PartnersApi, TreasuryApi
│   │   ├── config/                # APP_VERSION
│   │   ├── database/              # AppDatabase (Dexie) + seed/
│   │   ├── interceptors/          # mock API + DevResilienceService
│   │   ├── models/                # contratos e regras de domínio
│   │   └── services/              # ThemeService (dark/light)
│   ├── shared/
│   │   ├── directives/            # máscara CNPJ
│   │   ├── ui/                    # layout, badge, modal, drawer, toast, command palette
│   │   └── utils/                 # CSV, moeda, CNPJ
│   └── features/
│       ├── dashboard/             # componente + ui (chart, alert-panel, warehouse-table)
│       ├── inventory/             # component + data-access/inventory.store + ui
│       ├── partners/              # component + data-access/partners.store + ui
│       └── treasury/              # component + data-access/treasury.store + ui
├── styles.scss                    # tokens CSS + base global
├── test-setup.ts                  # fake-indexeddb, zona, TestBed
└── main.ts
```

**Direção de dependência:** `componente → store → core/api → interceptor → IndexedDB`.
`core/api` é a única camada que injeta `HttpClient`; componentes e stores não falam com a
rede diretamente.

**Alias de import:** `@/*` → `src/app/*`, definido em `tsconfig.json` e `vitest.config.ts`.

### Onde editar o conteúdo

| Conteúdo | Arquivo |
| --- | --- |
| Seeds de estoque, parceiros e transações | `src/app/core/database/seed/` |
| Regras e labels de domínio | `src/app/core/models/` |
| Endpoints e validações simuladas | `src/app/core/interceptors/mock-api.interceptor.ts` |
| Rotas | `src/app/app.routes.ts` |
| Tokens de cor, espaço e tipografia | `src/styles.scss` + `tailwind.config.js` |
| Versão exibida na UI | `src/app/core/config/app-version.ts` |

> **Regra do projeto:** todo copy novo deve nascer em `src/data/` (a criar), nunca hardcoded
> no componente. O copy legado ainda está inline e a migração é dívida registrada em
> `tasks/todo.md`. Mensagens de erro da API vêm do interceptor.

---

## Design System

Tokens semânticos em `src/styles.scss` + `tailwind.config.js`:

| Grupo | Classes |
| --- | --- |
| Superfícies | `bg-canvas-base`, `bg-canvas-surface`, `bg-canvas-elevated` |
| Texto | `text-content-primary`, `text-content-muted`, `text-content-disabled` |
| Bordas | `border-border-subtle`, `border-border-strong` |
| Marca | `bg-brand`, `text-brand`, `bg-brand-subtle` |
| Estados | `text-state-success/warning/danger/info` + `-subtle` |

- Tipografia: IBM Plex Sans (UI) + IBM Plex Mono (números, SKUs, CNPJs, datas).
- Sem hex cru, `bg-slate-*`, `text-gray-*`, `backdrop-blur`, gradientes ou `animate-ping`
  em código novo.
- Grade 4/8 px, linha de tabela 44 px, header 56 px, raio 8 px.
- Toda listagem cobre quatro estados: erro → loading (skeleton) → vazio → dados.

---

## Testes

- 57 testes passando: stores (inventory, partners, treasury), interceptors, layout,
  stat-card, CSV, seed e funções puras do gráfico.
- Specs ao lado do arquivo (`*.spec.ts`); `describe`/`it` em pt-BR.
- Setup global em `src/test-setup.ts`: `fake-indexeddb/auto`, zona e `TestBed`.
- A latência simulada (200–500 ms) é real nos testes; use `flush(650)` ou
  `vi.useFakeTimers`.
- Cobertura: regra de negócio, API, store, componentes e utils; **sem E2E**.

---

## Acessibilidade e performance

- Foco visível, `aria-*`, semântica de tabela e skip link.
- Command palette com focus trap e navegação por teclado.
- Drawers/modais com scroll lock centralizado (`OverlayScrollLockService`).
- Tema escuro por padrão; preferência clara aplicada antes do boot.
- Build de produção: **541,18 kB raw / 147,72 kB transfer** (initial), dentro do budget.

---

## Deploy

`vercel.json` na raiz garante o fallback SPA:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/axiom-erp/browser",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Deep links validados em produção: `/dashboard`, `/inventory`, `/partners`, `/treasury`
retornam 200 no refresh.

---

## Limitações conhecidas

- **Sem backend, sem auth, sem RBAC** — o rodapé da sidebar declara "Ambiente de demonstração / Dados locais".
- **Dados só neste navegador** — IndexedDB local, sem sincronização entre abas ou dispositivos.
- **Sem upload, e-mail, PWA, offline sync, relatórios avançados ou compras.**
- **UI apenas em pt-BR** — sem i18n.
- **Seed de demonstração** — números plausíveis e determinísticos; "Ferramentas de demonstração → Repopular dados" limpa e repopula tudo.
- **`npm run lint` quebrado** — script existe, mas não há target ESLint configurado.
- **Copy legado inline** — a migração para `src/data/` ainda não foi feita.

---

## Documentação

- [`AGENTS.md`](./AGENTS.md) — regras para agentes, arquitetura, comandos e armadilhas.
- [`SPEC.md`](./SPEC.md) — spec viva, escopo, estados, contratos e decisões.
- [`tasks/plan.md`](./tasks/plan.md) — fases e dívida técnica.
- [`tasks/todo.md`](./tasks/todo.md) — checklist executável.

---

## Autor

João Victor Carvalho de Souza (`soudevictor`)

- Portfólio: https://soudevictor.vercel.app
- LinkedIn: https://linkedin.com/in/soudevictor
- GitHub: https://github.com/soudevictor

---

## Licença

MIT — veja [`LICENSE`](./LICENSE).
