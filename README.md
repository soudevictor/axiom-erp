# AxiomERP — B2B Supply Chain & Financial Suite (Demo)

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0_Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![NgRx Signals](https://img.shields.io/badge/@ngrx/signals-19-BA2BD2?style=flat-square&logo=ngrx&logoColor=white)](https://ngrx.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
![Vitest](https://img.shields.io/badge/Vitest-57_passing-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![AxiomERP](https://img.shields.io/badge/AxiomERP-2.0.0-2563EB?style=flat-square)

**Demo ao vivo:** https://axiomerp.vercel.app

Aplicação Angular 22 client-side de gestão de supply chain, estoque multi-armazém, tesouraria e parceiros. Sem backend — persistência em IndexedDB (Dexie.js), API simulada via HttpInterceptor. Projetada como peça de portfólio para demonstrar arquitetura Angular moderna, estado reativo com Signals, testes e design system próprio.

---

## Funcionalidades Implementadas

### Dashboard
- 4 KPIs reais: valor em estoque, resultado realizado, a receber (30d), a pagar (30d)
- Gráfico SVG puro de fluxo realizado (6 meses, receitas/despesas/saldo) com tabela acessível alternativa
- 3 alertas acionáveis: estoque crítico (link para filtro), contas vencidas (drawer), crédito de parceiros (link)
- Tabela de estoque por armazém reconciliada com o total
- Sem números hardcoded, trends inventados ou "AGO (ATUAL)"

### Estoque (`/inventory`)
- 500 SKUs determinísticos, 5 armazéns, status derivado (IN_STOCK / LOW_STOCK / OUT_OF_STOCK)
- Tabela desktop com CDK Virtual Scroll + cards mobile (< 768px)
- Busca com debounce + query params (`search`, `status`, `category`, `warehouseId`)
- Ordenação por colunas, seleção múltipla, bulk delete
- Movimentações (entrada/saída/ajuste) com ledger imutável em `stockMovements`
- Undo real: restaura o mesmo ID, quantidade e ledger
- Exportação CSV (UTF-8 BOM, separador `;`, labels pt-BR)
- Estados completos: erro → loading (skeleton) → vazio → dados

### Parceiros (`/partners`)
- 62 parceiros seedados com CNPJs válidos (dígitos verificadores), volume para testar o scroll infinito em blocos de 20
- Store com KPIs globais: total, homologados, bloqueados, crédito usado (%)
- Filtros combinados: busca (nome/CNPJ/e-mail), categoria, status, UF
- CRUD completo: criar, editar, homologar, bloquear (com motivo), excluir
- Validações: CNPJ único/válido, transições de status permitidas, exclusão bloqueada se houver crédito ou transações
- Query param `?status=BLOQUEADO` funcional
- Tabela desktop / cards mobile, ordenação, scroll infinito, 4 estados

### Tesouraria (`/treasury`)
- 120 transações seedadas (−5 a +2 meses), status PENDING/COMPLETED/CANCELLED
- Aging list: vencidas, hoje, 7 dias, 30 dias
- Filtros, ordenação, paginação
- Modal de criação/edição com validação

### Infraestrutura
- `signalStore` (@ngrx/signals) com `withState/withComputed/withMethods/withHooks`
- API tipada: `InventoryApi`, `PartnersApi`, `TreasuryApi` (stores não usam HttpClient direto)
- Mock API interceptor com latência 200–500ms, erro 500 opcional via header
- Seed determinístico (`mulberry32`) — sem Faker no runtime
- Dexie v4 com tabelas: `inventory`, `stockMovements`, `transactions`, `partners`
- `OverlayScrollLockService` centralizado (evita vazamento de `body.style.overflow`)
- Tema claro/escuro persistido em `localStorage`, default escuro
- Command Palette (`Ctrl+K`) com focus trap, navegação por teclado
- Acessibilidade: foco visível, `aria-*`, semântica de tabela, skip link

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Angular 22 (standalone, signals, `@if/@for/@defer`, OnPush) |
| Estado | `@ngrx/signals` 19 (`signalStore`) |
| Persistência | Dexie.js 4 (IndexedDB) |
| "API" | `HttpInterceptorFn` (`mock-api.interceptor.ts`) |
| UI | Tailwind CSS 3.4 + SCSS, `@angular/cdk` (virtual scroll, overlay), `lucide-angular` |
| Testes | Vitest 4 + `@analogjs/vitest-angular` (jsdom) |
| Seed | PRNG próprio (`mulberry32`), 500 SKUs, 120 transações, 62 parceiros |

---

## Comandos

```bash
npm install
npm start            # dev server em http://localhost:4200
npm test             # vitest run (57 testes, ~11s)
npm run type-check   # tsc --noEmit --project tsconfig.app.json
npm run build        # ng build --configuration production
```

> `npm run lint` está quebrado: o script existe, mas `ng lint` não tem target ESLint configurado. Não é objetivo deste portfólio.

### Checkpoint mínimo antes de considerar uma tarefa concluída
```bash
npm run type-check && npm test && npm run build
```

Build de produção atual: **541.18 kB raw / 147.72 kB transfer** (initial), dentro do budget.

---

## Estrutura

```
src/
├── app/
│   ├── app.config.ts              # providers globais, ícones Lucide, seed inicial
│   ├── app.routes.ts              # 4 rotas lazy: dashboard, inventory, treasury, partners
│   ├── app.ts                     # shell: <app-main-layout />
│   ├── core/                      # cross-cutting, sem UI
│   │   ├── api/                   # InventoryApi, PartnersApi, TreasuryApi
│   │   ├── config/                # APP_VERSION
│   │   ├── database/              # AppDatabase (schema Dexie) + DatabaseSeedService
│   │   ├── interceptors/          # mock API + DevResilienceService
│   │   ├── models/                # InventoryItem, TreasuryTransaction, Partner, paginação
│   │   └── services/              # ThemeService (dark/light)
│   ├── shared/
│   │   ├── directives/            # máscara CNPJ
│   │   ├── ui/                    # layout, badge, stat-card, skeleton, toast, command-palette, modal, drawer, confirm-dialog, overlay-scroll-lock
│   │   └── utils/                 # csv-exporter, currency-formatter, cnpj-validator
│   └── features/
│       ├── dashboard/             # componente + ui (chart, alert-panel, warehouse-table)
│       ├── inventory/             # component + data-access/inventory.store + ui (modals, drawer)
│       ├── treasury/              # component + data-access/treasury.store + ui
│       └── partners/              # component + data-access/partners.store + ui (modals)
├── styles.scss                    # tokens CSS + base global
├── test-setup.ts                  # fake-indexeddb, zone, TestBed
└── main.ts
```

Alias de import: **`@/*` → `src/app/*`** (definido em `tsconfig.json` e `vitest.config.ts`).

---

## Design System

Tokens semânticos em `src/styles.scss` + `tailwind.config.js`:

| Grupo | Classes |
|-------|---------|
| Superfícies | `bg-canvas-base`, `bg-canvas-surface`, `bg-canvas-elevated` |
| Texto | `text-content-primary`, `text-content-muted`, `text-content-disabled` |
| Bordas | `border-border-subtle`, `border-border-strong` |
| Marca | `bg-brand`, `text-brand`, `bg-brand-subtle` |
| Estados | `text-state-success/warning/danger/info` + `-subtle` |

- Tipografia: IBM Plex Sans (UI) + IBM Plex Mono (números, SKUs, CNPJs, datas)
- Nenhum hex cru, `bg-slate-*`, `text-gray-*`, `backdrop-blur`, gradientes, `animate-ping` em código novo
- Grade 4/8px, linha de tabela 44px, header 56px, raio 8px
- 4 estados para toda listagem: erro → loading (skeleton) → vazio → dados

---

## Testes

- 57 testes passando: stores (inventory, partners, treasury), interceptors, layout, stat-card, CSV, seed, pure functions do chart
- Specs ao lado do arquivo (`*.spec.ts`), `describe`/`it` em pt-BR
- Setup global em `src/test-setup.ts`: `fake-indexeddb/auto`, zona, `TestBed`
- Latência simulada (200–500ms) é real nos testes; padrão `flush(650)` ou `vi.useFakeTimers`
- Cobertura: regra de negócio, API, store, componentes, utils; sem testes de integração E2E

---

## Deploy Vercel

`vercel.json` na raiz garante fallback SPA:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/axiom-erp/browser",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Deep links validados em produção: `/dashboard`, `/inventory`, `/partners`, `/treasury` retornam 200 no refresh.

---

## Limites Conhecidos (Honestos)

- **Sem backend, sem auth, sem RBAC** — "Ambiente de demonstração / Dados locais" no rodapé da sidebar
- **Dados só neste navegador** — IndexedDB local, sem sincronização entre abas/dispositivos
- **Sem upload, e-mail, PWA, offline sync, relatórios avançados, compras**
- **UI apenas em pt-BR** — sem i18n
- **Seed de demonstração** — números plausíveis e determinísticos; "Ferramentas de demonstração → Repopular dados" limpa e repopula tudo
- `npm run lint` quebrado — script existe, mas sem target ESLint configurado

---

## Autor

João Victor Carvalho de Souza (`soudevictor`)
- Portfolio: https://soudevictor.vercel.app
- LinkedIn: https://linkedin.com/in/soudevictor
- GitHub: https://github.com/soudevictor

---

## Licença

MIT — veja `LICENSE`.